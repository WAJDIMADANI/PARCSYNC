import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  X,
  Car,
  Edit,
  Save,
  Upload,
  Trash2,
  Plus,
  Calendar,
  User,
  FileText,
  Clock,
  Download,
  Gauge,
  Package,
  CreditCard,
  Shield
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { AttributionModal } from './AttributionModal';
import { UpdateKilometrageModal } from './UpdateKilometrageModal';
import { VehicleDocuments } from './VehicleDocuments';

interface Chauffeur {
  id: string;
  nom: string;
  prenom: string;
  matricule_tca: string;
  type_attribution: 'principal' | 'secondaire';
  date_debut: string;
  loueur_id: string | null;
  loueur_nom: string | null;
}

interface Vehicle {
  id: string;
  immatriculation: string;
  immat_norm: string;
  reference_tca: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  type: string | null;
  statut: string;
  date_mise_en_service: string | null;
  date_fin_service: string | null;
  date_premiere_mise_en_circulation: string | null;
  fournisseur: string | null;
  mode_acquisition: string | null;
  prix_ht: number | null;
  prix_ttc: number | null;
  mensualite: number | null;
  duree_contrat_mois: number | null;
  date_debut_contrat: string | null;
  date_fin_prevue_contrat: string | null;
  photo_path: string | null;
  site_id: string | null;
  assurance_type: 'tca' | 'externe' | null;
  assurance_compagnie: string | null;
  assurance_numero_contrat: string | null;
  licence_transport_numero: string | null;
  carte_essence_fournisseur: string | null;
  carte_essence_numero: string | null;
  carte_essence_attribuee: boolean;
  kilometrage_actuel: number | null;
  derniere_maj_kilometrage: string | null;
  materiel_embarque: any[] | null;
  created_at: string;
  chauffeurs_actifs: Chauffeur[];
  nb_chauffeurs_actifs: number;
  locataire_type: string | null;
  locataire_nom_libre: string | null;
  locataire_affiche: string; // Calculé par la vue v_vehicles_list
  proprietaire_carte_grise: string | null;
  loueur_type: string | null;
  loueur_chauffeur_id: string | null;
  loueur_nom_externe: string | null;
  loueur_affiche: string; // Calculé par la vue v_vehicles_list
}

interface Attribution {
  id: string;
  vehicule_id: string;
  profil_id: string;
  loueur_id: string | null;
  date_debut: string;
  date_fin: string | null;
  type_attribution: 'principal' | 'secondaire';
  notes: string | null;
  created_at: string;
  profil: {
    id: string;
    nom: string;
    prenom: string;
    matricule_tca: string;
  };
  loueur: {
    id: string;
    nom: string;
  } | null;
}

interface Props {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdate: () => void;
  photoUrl?: string;
}

type Tab = 'info' | 'current' | 'proprietaire' | 'history' | 'insurance' | 'equipment' | 'kilometrage' | 'documents';

export function VehicleDetailModal({ vehicle: initialVehicle, onClose, onUpdate, photoUrl: initialPhotoUrl }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl);
  const [showAttributionModal, setShowAttributionModal] = useState(false);
  const [showKilometrageModal, setShowKilometrageModal] = useState(false);

  const [vehicle, setVehicle] = useState(initialVehicle);
  const [editedVehicle, setEditedVehicle] = useState(initialVehicle);

  const [attributions, setAttributions] = useState<Attribution[]>([]);
  const [loadingAttributions, setLoadingAttributions] = useState(false);

  // Fonction pour refetch les données du véhicule
  const fetchVehicleDetails = async () => {
    console.log('[fetchVehicleDetails] Début refetch pour vehicule ID:', vehicle.id);
    try {
      // Fetch depuis la vue v_vehicles_list pour avoir les chauffeurs_actifs et locataire_affiche calculés
      const { data, error } = await supabase
        .from('v_vehicles_list')
        .select('*')
        .eq('id', vehicle.id)
        .single();

      if (error) {
        console.error('[fetchVehicleDetails] Erreur:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (data) {
        console.log('[fetchVehicleDetails] Données reçues:', data);
        const updatedVehicle = {
          ...data,
          chauffeurs_actifs: Array.isArray(data.chauffeurs_actifs) ? data.chauffeurs_actifs : [],
          nb_chauffeurs_actifs: data.nb_chauffeurs_actifs || 0
        } as Vehicle;
        setVehicle(updatedVehicle);
        setEditedVehicle(updatedVehicle);
        console.log('[fetchVehicleDetails] État mis à jour avec succès');
      }
    } catch (error) {
      console.error('[fetchVehicleDetails] Erreur chargement détails véhicule:', JSON.stringify(error, null, 2));
      alert('Erreur lors du rechargement des données. Voir la console.');
    }
  };

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'current') {
      fetchAttributions();
    }
    // Désactiver le mode édition lors du changement d'onglet
    if (isEditing) {
      setIsEditing(false);
      setEditedVehicle(vehicle);
    }
  }, [activeTab]);

  const fetchAttributions = async () => {
    setLoadingAttributions(true);
    try {
      const { data, error } = await supabase
        .from('attribution_vehicule')
        .select(`
          *,
          profil:profil_id(id, nom, prenom, matricule_tca),
          loueur:loueur_id(id, nom)
        `)
        .eq('vehicule_id', vehicle.id)
        .order('date_debut', { ascending: false });

      if (error) throw error;
      setAttributions(data || []);
    } catch (error) {
      console.error('Erreur chargement attributions:', error);
    } finally {
      setLoadingAttributions(false);
    }
  };

  const cleanPayloadForUpdate = (data: any) => {
    const cleaned = { ...data };

    const dateFields = ['date_premiere_mise_en_circulation', 'date_mise_en_service', 'date_fin_service'];
    dateFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null;
      }
    });

    const integerFields = ['annee', 'kilometrage_actuel'];
    integerFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const num = Number(cleaned[field]);
        cleaned[field] = isNaN(num) ? null : num;
      }
    });

    const stringFields = ['reference_tca', 'marque', 'modele', 'type', 'assurance_compagnie', 'assurance_numero_contrat', 'licence_transport_numero', 'carte_essence_fournisseur', 'carte_essence_numero', 'locataire_nom_libre', 'proprietaire_carte_grise', 'loueur_nom_externe'];
    stringFields.forEach(field => {
      if (cleaned[field] === undefined) {
        cleaned[field] = null;
      }
    });

    return cleaned;
  };

  const handleSave = async () => {
    console.log('[handleSave] Début sauvegarde pour vehicule ID:', vehicle.id);
    setSaving(true);
    try {
      const updateData = cleanPayloadForUpdate({
        reference_tca: editedVehicle.reference_tca,
        marque: editedVehicle.marque,
        modele: editedVehicle.modele,
        annee: editedVehicle.annee,
        type: editedVehicle.type,
        statut: editedVehicle.statut,
        date_mise_en_service: editedVehicle.date_mise_en_service,
        date_fin_service: editedVehicle.date_fin_service,
        date_premiere_mise_en_circulation: editedVehicle.date_premiere_mise_en_circulation,
        assurance_type: editedVehicle.assurance_type,
        assurance_compagnie: editedVehicle.assurance_compagnie,
        assurance_numero_contrat: editedVehicle.assurance_numero_contrat,
        licence_transport_numero: editedVehicle.licence_transport_numero,
        carte_essence_fournisseur: editedVehicle.carte_essence_fournisseur,
        carte_essence_numero: editedVehicle.carte_essence_numero,
        carte_essence_attribuee: editedVehicle.carte_essence_attribuee,
        kilometrage_actuel: editedVehicle.kilometrage_actuel,
        locataire_type: editedVehicle.locataire_type,
        locataire_nom_libre: editedVehicle.locataire_nom_libre,
        proprietaire_carte_grise: editedVehicle.proprietaire_carte_grise,
        loueur_type: editedVehicle.loueur_type,
        loueur_chauffeur_id: editedVehicle.loueur_chauffeur_id,
        loueur_nom_externe: editedVehicle.loueur_nom_externe,
      });

      console.log('[handleSave] Données à envoyer:', updateData);

      const { data, error } = await supabase
        .from('vehicule')
        .update(updateData)
        .eq('id', vehicle.id)
        .select()
        .single();

      if (error) {
        console.error('[handleSave] Erreur UPDATE:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[handleSave] UPDATE réussi, données retournées:', data);

      // Refetch les données pour avoir les valeurs à jour
      await fetchVehicleDetails();

      setIsEditing(false);
      console.log('[handleSave] Mode édition désactivé');

      onUpdate(); // Refetch la liste des véhicules aussi

      alert('✓ Modifications enregistrées avec succès');
    } catch (error) {
      console.error('[handleSave] Erreur sauvegarde:', JSON.stringify(error, null, 2));
      console.error('[handleSave] Erreur détaillée:', error);
      alert('Erreur lors de la sauvegarde. Voir la console (F12) pour plus de détails.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La taille de l\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploading(true);
    try {
      if (vehicle.photo_path) {
        await supabase.storage
          .from('vehicle-photos')
          .remove([vehicle.photo_path]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicle.id}/photo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('vehicule')
        .update({ photo_path: fileName })
        .eq('id', vehicle.id);

      if (updateError) throw updateError;

      const { data: signedUrl } = await supabase.storage
        .from('vehicle-photos')
        .createSignedUrl(fileName, 3600);

      if (signedUrl) {
        setPhotoUrl(signedUrl.signedUrl);
      }

      // Refetch les données du véhicule pour avoir le photo_path à jour
      await fetchVehicleDetails();
      onUpdate();
    } catch (error) {
      console.error('Erreur upload photo:', error);
      alert('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!vehicle.photo_path) return;
    if (!confirm('Voulez-vous vraiment supprimer cette photo?')) return;

    try {
      await supabase.storage
        .from('vehicle-photos')
        .remove([vehicle.photo_path]);

      const { error } = await supabase
        .from('vehicule')
        .update({ photo_path: null })
        .eq('id', vehicle.id);

      if (error) throw error;

      setPhotoUrl(undefined);

      // Refetch les données du véhicule
      await fetchVehicleDetails();
      onUpdate();
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      alert('Erreur lors de la suppression de la photo');
    }
  };

  const handleEndAttribution = async (attribution: Attribution) => {
    if (!confirm('Voulez-vous terminer cette attribution?')) return;

    try {
      const { error } = await supabase
        .from('attribution_vehicule')
        .update({ date_fin: new Date().toISOString().split('T')[0] })
        .eq('id', attribution.id);

      if (error) throw error;

      fetchAttributions();
      onUpdate();
    } catch (error) {
      console.error('Erreur fin attribution:', error);
      alert('Erreur lors de la fin de l\'attribution');
    }
  };

  const currentAttributions = attributions.filter(a => !a.date_fin);
  const historicalAttributions = attributions.filter(a => a.date_fin);

  const getStatusBadge = (statut: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      actif: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
      maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Maintenance' },
      'hors service': { bg: 'bg-red-100', text: 'text-red-700', label: 'Hors service' },
      'en location': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En location' },
    };

    const config = statusConfig[statut.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', label: statut };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const calculateDuration = (dateDebut: string, dateFin: string | null) => {
    const start = new Date(dateDebut);
    const end = dateFin ? new Date(dateFin) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} mois`;
  };

  const exportHistory = () => {
    const csv = [
      ['Chauffeur', 'Matricule TCA', 'Type', 'Loueur', 'Date début', 'Date fin', 'Durée', 'Statut'].join(','),
      ...attributions.map(a => [
        `${a.profil.prenom} ${a.profil.nom}`,
        a.profil.matricule_tca || '',
        a.type_attribution,
        a.loueur?.nom || 'Propriété TCA',
        new Date(a.date_debut).toLocaleDateString('fr-FR'),
        a.date_fin ? new Date(a.date_fin).toLocaleDateString('fr-FR') : 'En cours',
        calculateDuration(a.date_debut, a.date_fin),
        a.date_fin ? 'Terminée' : 'Active'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_${vehicle.immatriculation}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-16 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt={vehicle.immatriculation} className="w-full h-full object-cover" />
                ) : (
                  <Car className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{vehicle.immatriculation}</h2>
                {vehicle.reference_tca && (
                  <p className="text-sm text-gray-600">Réf. TCA: {vehicle.reference_tca}</p>
                )}
              </div>
              {getStatusBadge(vehicle.statut)}
            </div>
            <div className="flex items-center gap-2">
              {(activeTab === 'info' || activeTab === 'current' || activeTab === 'proprietaire' || activeTab === 'insurance' || activeTab === 'equipment') && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditedVehicle(vehicle);
                          setIsEditing(false);
                        }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4 mr-2" />}
                        Enregistrer
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200 px-6">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informations
                </div>
              </button>
              <button
                onClick={() => setActiveTab('current')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'current'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Attributions actuelles
                  {currentAttributions.length > 0 && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                      {currentAttributions.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('proprietaire')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'proprietaire'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Propriétaire
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Historique complet
                </div>
              </button>
              <button
                onClick={() => setActiveTab('insurance')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'insurance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Assurance
                </div>
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'equipment'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Équipements
                </div>
              </button>
              <button
                onClick={() => setActiveTab('kilometrage')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'kilometrage'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Kilométrage
                </div>
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'documents'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents
                </div>
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Immatriculation</label>
                      <input
                        type="text"
                        value={vehicle.immatriculation}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Référence TCA</label>
                      <input
                        type="text"
                        value={editedVehicle.reference_tca || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, reference_tca: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marque</label>
                      <input
                        type="text"
                        value={editedVehicle.marque || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, marque: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Modèle</label>
                      <input
                        type="text"
                        value={editedVehicle.modele || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, modele: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                      <input
                        type="number"
                        value={editedVehicle.annee || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, annee: e.target.value ? Number(e.target.value) : null })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <input
                        type="text"
                        value={editedVehicle.type || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, type: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo du véhicule</h3>
                  <div className="flex items-start gap-4">
                    <div className="w-48 h-36 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                      {uploading ? (
                        <LoadingSpinner size="lg" />
                      ) : photoUrl ? (
                        <img src={photoUrl} alt={vehicle.immatriculation} className="w-full h-full object-cover" />
                      ) : (
                        <Car className="w-20 h-20 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 mr-2" />
                        {photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {photoUrl && (
                        <button
                          onClick={handleDeletePhoto}
                          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer la photo
                        </button>
                      )}
                      <p className="text-sm text-gray-500">Format accepté: JPG, PNG, WebP (max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut et dates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                      <select
                        value={editedVehicle.statut}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, statut: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      >
                        <option value="actif">Actif</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="hors service">Hors service</option>
                        <option value="en location">En location</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date de mise en service</label>
                      <input
                        type="date"
                        value={editedVehicle.date_mise_en_service || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, date_mise_en_service: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin de service</label>
                      <input
                        type="date"
                        value={editedVehicle.date_fin_service || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, date_fin_service: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Kilométrage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kilométrage actuel (km)</label>
                      <input
                        type="number"
                        value={editedVehicle.kilometrage_actuel || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, kilometrage_actuel: e.target.value ? Number(e.target.value) : null })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        placeholder="Ex: 150000"
                      />
                    </div>
                    {editedVehicle.derniere_maj_kilometrage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dernière mise à jour</label>
                        <input
                          type="text"
                          value={new Date(editedVehicle.derniere_maj_kilometrage).toLocaleDateString('fr-FR')}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'current' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestion du locataire actuel</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Le locataire est défini automatiquement si un chauffeur est attribué en tant que conducteur principal.
                      Si aucun chauffeur n'est attribué, vous pouvez définir manuellement le type de locataire.
                    </p>
                  </div>

                  {vehicle.chauffeurs_actifs?.some(c => c.type_attribution === 'principal') ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Locataire actuel</label>
                      <div className="text-sm text-gray-900 font-medium">
                        {vehicle.chauffeurs_actifs.find(c => c.type_attribution === 'principal')?.prenom}{' '}
                        {vehicle.chauffeurs_actifs.find(c => c.type_attribution === 'principal')?.nom}{' '}
                        ({vehicle.chauffeurs_actifs.find(c => c.type_attribution === 'principal')?.matricule_tca})
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Défini automatiquement via l'attribution principale</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type de locataire</label>
                        <select
                          value={editedVehicle.locataire_type || 'sur_parc'}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, locataire_type: e.target.value || null, locataire_nom_libre: e.target.value === 'libre' ? editedVehicle.locataire_nom_libre : null })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="sur_parc">Sur parc</option>
                          <option value="epave">EPAVE</option>
                          <option value="vendu">Vendu</option>
                          <option value="libre">Saisie libre</option>
                        </select>
                      </div>

                      {editedVehicle.locataire_type === 'libre' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nom du locataire</label>
                          <input
                            type="text"
                            value={editedVehicle.locataire_nom_libre || ''}
                            onChange={(e) => setEditedVehicle({ ...editedVehicle, locataire_nom_libre: e.target.value })}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                            placeholder="Ex: Entreprise ABC, Jean Dupont..."
                            maxLength={100}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestion du loueur</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">De qui louons-nous ce véhicule ?</label>
                      <select
                        value={editedVehicle.loueur_type || ''}
                        onChange={(e) => {
                          const newType = e.target.value || null;
                          setEditedVehicle({
                            ...editedVehicle,
                            loueur_type: newType,
                            loueur_chauffeur_id: newType === 'chauffeur_tca' ? editedVehicle.loueur_chauffeur_id : null,
                            loueur_nom_externe: newType === 'chauffeur_tca' ? null : editedVehicle.loueur_nom_externe
                          });
                        }}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      >
                        <option value="">Aucun (propriété TCA)</option>
                        <option value="chauffeur_tca">Salarié TCA</option>
                        <option value="entreprise">Entreprise externe</option>
                        <option value="personne_externe">Personne externe</option>
                      </select>
                    </div>

                    {editedVehicle.loueur_type === 'chauffeur_tca' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner le chauffeur</label>
                        <input
                          type="text"
                          value={editedVehicle.loueur_chauffeur_id || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, loueur_chauffeur_id: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="ID du chauffeur (UUID)"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Recherchez un chauffeur dans la liste des employés et copiez son ID
                        </p>
                      </div>
                    )}

                    {editedVehicle.loueur_type === 'entreprise' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'entreprise</label>
                        <input
                          type="text"
                          value={editedVehicle.loueur_nom_externe || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, loueur_nom_externe: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="Ex: HERTZ, EUROPCAR, SIXT, AVIS, BUDGET..."
                          maxLength={150}
                        />
                      </div>
                    )}

                    {editedVehicle.loueur_type === 'personne_externe' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la personne</label>
                        <input
                          type="text"
                          value={editedVehicle.loueur_nom_externe || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, loueur_nom_externe: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="Ex: M. Jean Dupont"
                          maxLength={150}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Attributions en cours</h3>
                  <button
                    onClick={() => setShowAttributionModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle attribution
                  </button>
                </div>

                {currentAttributions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium mb-2">Ce véhicule n'est pas attribué actuellement</p>
                    <p className="text-gray-500 mb-4">Créez une attribution pour assigner ce véhicule à un chauffeur</p>
                    <button
                      onClick={() => setShowAttributionModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer une attribution
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentAttributions.map((attribution) => (
                      <div key={attribution.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {attribution.profil.prenom} {attribution.profil.nom}
                              </p>
                              {attribution.profil.matricule_tca && (
                                <p className="text-sm text-gray-500">TCA: {attribution.profil.matricule_tca}</p>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            attribution.type_attribution === 'principal'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {attribution.type_attribution === 'principal' ? 'Principal' : 'Secondaire'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            Depuis le {new Date(attribution.date_debut).toLocaleDateString('fr-FR')}
                            <span className="ml-2 text-gray-400">({calculateDuration(attribution.date_debut, null)})</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <FileText className="w-4 h-4 mr-2" />
                            {attribution.loueur?.nom || 'Propriété TCA'}
                          </div>
                          {attribution.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700">
                              {attribution.notes}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                          <button
                            onClick={() => handleEndAttribution(attribution)}
                            className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                          >
                            Terminer l'attribution
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'proprietaire' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Propriétaire (carte grise)</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du propriétaire légal inscrit sur la carte grise
                    </label>
                    <input
                      type="text"
                      value={editedVehicle.proprietaire_carte_grise || ''}
                      onChange={(e) => setEditedVehicle({ ...editedVehicle, proprietaire_carte_grise: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      placeholder="Ex: TCA TRANSPORT, Jean Dupont..."
                      maxLength={150}
                    />
                    <p className="text-sm text-gray-500 mt-1">Le nom exact tel qu'il apparaît sur la carte grise</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Historique complet des attributions</h3>
                  <button
                    onClick={exportHistory}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>

                {loadingAttributions ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" text="Chargement de l'historique..." />
                  </div>
                ) : attributions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Aucun historique d'attribution</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attributions.map((attribution, idx) => (
                      <div
                        key={attribution.id}
                        className={`bg-white border rounded-lg p-4 ${
                          attribution.date_fin ? 'border-gray-200' : 'border-blue-300 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              {idx < attributions.length - 1 && (
                                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gray-300"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900">
                                  {attribution.profil.prenom} {attribution.profil.nom}
                                </p>
                                {attribution.profil.matricule_tca && (
                                  <span className="text-sm text-gray-500">({attribution.profil.matricule_tca})</span>
                                )}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  attribution.type_attribution === 'principal'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {attribution.type_attribution === 'principal' ? 'P' : 'S'}
                                </span>
                                {!attribution.date_fin && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                {attribution.loueur?.nom || 'Propriété TCA'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Du {new Date(attribution.date_debut).toLocaleDateString('fr-FR')}
                                {attribution.date_fin ? ` au ${new Date(attribution.date_fin).toLocaleDateString('fr-FR')}` : ' - En cours'}
                                <span className="ml-2 text-gray-400">
                                  ({calculateDuration(attribution.date_debut, attribution.date_fin)})
                                </span>
                              </p>
                              {attribution.notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                  {attribution.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'insurance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assurance</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type d'assurance</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={(editedVehicle as any).assurance_type === 'tca'}
                            onChange={() => setEditedVehicle({ ...editedVehicle, assurance_type: 'tca' } as any)}
                            disabled={!isEditing}
                            className="mr-2"
                          />
                          Assuré TCA
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={(editedVehicle as any).assurance_type === 'externe'}
                            onChange={() => setEditedVehicle({ ...editedVehicle, assurance_type: 'externe' } as any)}
                            disabled={!isEditing}
                            className="mr-2"
                          />
                          Assuré ailleurs
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Compagnie d'assurance</label>
                        <input
                          type="text"
                          value={(editedVehicle as any).assurance_compagnie || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, assurance_compagnie: e.target.value } as any)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de contrat</label>
                        <input
                          type="text"
                          value={(editedVehicle as any).assurance_numero_contrat || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, assurance_numero_contrat: e.target.value } as any)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Licence de transport</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de licence</label>
                    <input
                      type="text"
                      value={(editedVehicle as any).licence_transport_numero || ''}
                      onChange={(e) => setEditedVehicle({ ...editedVehicle, licence_transport_numero: e.target.value } as any)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de 1ère mise en circulation</label>
                    <input
                      type="date"
                      value={editedVehicle.date_premiere_mise_en_circulation || ''}
                      onChange={(e) => setEditedVehicle({ ...editedVehicle, date_premiere_mise_en_circulation: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Acquisition du véhicule</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                      <input
                        type="text"
                        value={editedVehicle.fournisseur || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, fournisseur: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        placeholder="Ex: Renault Trucks, Mercedes..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mode d'acquisition</label>
                      <select
                        value={editedVehicle.mode_acquisition || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, mode_acquisition: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      >
                        <option value="">-- Non renseigné --</option>
                        <option value="LLD">LLD - Location Longue Durée</option>
                        <option value="LOA">LOA - Location avec Option d'Achat</option>
                        <option value="LCD">LCD - Location Courte Durée</option>
                        <option value="Achat pur">Achat pur</option>
                        <option value="Prêt">Prêt</option>
                        <option value="Location société">Location société</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {editedVehicle.mode_acquisition === 'Achat pur' ? 'Prix achat HT' : 'Prix HT'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.prix_ht || ''}
                          onChange={(e) => {
                            const prixHT = parseFloat(e.target.value);
                            setEditedVehicle({
                              ...editedVehicle,
                              prix_ht: e.target.value ? parseFloat(e.target.value) : null,
                              prix_ttc: !isNaN(prixHT) ? parseFloat((prixHT * 1.2).toFixed(2)) : null
                            });
                          }}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {editedVehicle.mode_acquisition === 'Achat pur' ? 'Prix achat TTC' : 'Prix TTC'} (auto)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.prix_ttc || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {editedVehicle.mode_acquisition !== 'Achat pur' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensualité</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.mensualite || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, mensualite: e.target.value ? parseFloat(e.target.value) : null })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Durée du contrat (mois)</label>
                      <input
                        type="number"
                        value={editedVehicle.duree_contrat_mois || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, duree_contrat_mois: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        placeholder="Ex: 24, 36, 48..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date début contrat</label>
                        <input
                          type="date"
                          value={editedVehicle.date_debut_contrat || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, date_debut_contrat: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date fin prévue</label>
                        <input
                          type="date"
                          value={editedVehicle.date_fin_prevue_contrat || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, date_fin_prevue_contrat: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Carte essence</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editedVehicle.carte_essence_attribuee || false}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, carte_essence_attribuee: e.target.checked })}
                          disabled={!isEditing}
                          className="mr-2 h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">Carte essence attribuée</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                        <input
                          type="text"
                          value={editedVehicle.carte_essence_fournisseur || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, carte_essence_fournisseur: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="Ex: Total, Shell, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de carte</label>
                        <input
                          type="text"
                          value={editedVehicle.carte_essence_numero || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, carte_essence_numero: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Car className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Matériel embarqué</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Cette section est en lecture seule. Le matériel embarqué sera géré dans une future version.
                  </p>
                  <div className="space-y-2">
                    {(vehicle as any).materiel_embarque && Array.isArray((vehicle as any).materiel_embarque) && (vehicle as any).materiel_embarque.length > 0 ? (
                      (vehicle as any).materiel_embarque.map((eq: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <input
                              type="text"
                              value={eq.type || ''}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                            <input
                              type="text"
                              value={eq.quantite || ''}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Aucun matériel embarqué enregistré
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Carte essence</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                      <input
                        type="text"
                        value={isEditing ? (editedVehicle.carte_essence_fournisseur || '') : (vehicle.carte_essence_fournisseur || '')}
                        onChange={(e) => isEditing && setEditedVehicle({ ...editedVehicle, carte_essence_fournisseur: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'}`}
                        placeholder={isEditing ? "Ex: Total, Shell, BP..." : "Non renseigné"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de carte</label>
                      <input
                        type="text"
                        value={isEditing ? (editedVehicle.carte_essence_numero || '') : (vehicle.carte_essence_numero || '')}
                        onChange={(e) => isEditing && setEditedVehicle({ ...editedVehicle, carte_essence_numero: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'}`}
                        placeholder={isEditing ? "Numéro de carte" : "Non renseigné"}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEditing ? (editedVehicle.carte_essence_attribuee || false) : (vehicle.carte_essence_attribuee || false)}
                          onChange={(e) => isEditing && setEditedVehicle({ ...editedVehicle, carte_essence_attribuee: e.target.checked })}
                          disabled={!isEditing}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Carte attribuée</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kilometrage' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Gestion du kilométrage</h3>
                  <button
                    onClick={() => setShowKilometrageModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Mettre à jour
                  </button>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                      <Gauge className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Kilométrage actuel</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {(vehicle as any).kilometrage_actuel ? (vehicle as any).kilometrage_actuel.toLocaleString() : '0'} km
                      </p>
                      {(vehicle as any).derniere_maj_kilometrage && (
                        <p className="text-xs text-blue-600 mt-1">
                          Mis à jour le {new Date((vehicle as any).derniere_maj_kilometrage).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Historique des relevés</h4>
                  <p className="text-sm text-gray-500">L'historique détaillé sera affiché ici</p>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <VehicleDocuments vehicleId={vehicle.id} />
            )}
          </div>
        </div>
      </div>

      {showAttributionModal && (
        <AttributionModal
          vehicleId={vehicle.id}
          onClose={() => setShowAttributionModal(false)}
          onSuccess={() => {
            setShowAttributionModal(false);
            fetchAttributions();
            fetchVehicleDetails(); // Recharger les données du véhicule pour mettre à jour le locataire
            onUpdate(); // Recharger la liste parente
          }}
        />
      )}

      {showKilometrageModal && (
        <UpdateKilometrageModal
          vehicleId={vehicle.id}
          currentKm={vehicle.kilometrage_actuel || null}
          onClose={() => setShowKilometrageModal(false)}
          onSuccess={async () => {
            // Refetch les données du véhicule pour voir le km à jour instantanément
            await fetchVehicleDetails();
            setShowKilometrageModal(false);
            onUpdate(); // Refetch la liste aussi
          }}
        />
      )}
    </>
  );
}
