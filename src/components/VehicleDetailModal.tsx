import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Car, CreditCard as Edit, Save, Upload, Trash2, Package, CreditCard, Shield, ShoppingCart, FileText, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleDocuments } from './VehicleDocuments';
import { SuccessModal } from './SuccessModal';
import { ProprietaireSelector } from './ProprietaireSelector';
import { parseProprietaireCarteGrise, formatProprietaireCarteGrise } from '../utils/proprietaireParser';
import { calculateResteAPayer } from '../utils/resteAPayerCalculator';

interface Vehicle {
  id: string;
  immatriculation: string;
  immat_norm: string;
  ref_tca: string | null;
  marque: string | null;
  modele: string | null;
  finition: string | null;
  energie: string | null;
  couleur: string | null;
  annee: number | null;
  type: string | null;
  statut: string;
  date_mise_en_service: string | null;
  date_premiere_mise_en_circulation: string | null;
  fournisseur: string | null;
  financeur_nom: string | null;
  financeur_adresse: string | null;
  financeur_code_postal: string | null;
  financeur_ville: string | null;
  financeur_telephone: string | null;
  proprietaire_carte_grise: string | null;
  mode_acquisition: string | null;
  prix_ht: number | null;
  prix_ttc: number | null;
  mensualite_ht: number | null;
  mensualite_ttc: number | null;
  duree_contrat_mois: number | null;
  date_debut_contrat: string | null;
  date_fin_prevue_contrat: string | null;
  reste_a_payer_ttc: number | null;
  photo_path: string | null;
  site_id: string | null;
  assurance_type: 'tca' | 'externe' | null;
  assurance_compagnie: string | null;
  assurance_numero_contrat: string | null;
  assurance_prime_mensuelle: number | null;
  licence_transport_numero: string | null;
  carte_essence_fournisseur: string | null;
  carte_essence_numero: string | null;
  carte_essence_attribuee: boolean;
  kilometrage_actuel: number | null;
  derniere_maj_kilometrage: string | null;
  materiel_embarque: any[] | null;
  created_at: string;
  chauffeurs_actifs: any[];
  nb_chauffeurs_actifs: number;
  locataire_type: string | null;
  locataire_nom_libre: string | null;
  locataire_affiche: string; // Calculé par la vue v_vehicles_list_ui
}

interface Props {
  vehicle: Vehicle;
  onClose: () => void;
  onVehicleUpdated: (updatedVehicle: Vehicle) => Promise<void>;
  photoUrl?: string;
}

type Tab = 'info' | 'proprietaire' | 'acquisition' | 'insurance' | 'equipment' | 'documents';

export function VehicleDetailModal({ vehicle: initialVehicle, onClose, onVehicleUpdated, photoUrl: initialPhotoUrl }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [vehicle, setVehicle] = useState(initialVehicle);
  const [editedVehicle, setEditedVehicle] = useState(initialVehicle);

  // État pour gérer les champs du propriétaire
  const [proprietaireMode, setProprietaireMode] = useState<'tca' | 'entreprise'>('tca');
  const [proprietaireTcaValue, setProprietaireTcaValue] = useState('TCA TRANSPORT');
  const [proprietaireEntrepriseName, setProprietaireEntrepriseName] = useState('');
  const [proprietaireEntreprisePhone, setProprietaireEntreprisePhone] = useState('');
  const [proprietaireEntrepriseAddress, setProprietaireEntrepriseAddress] = useState('');

  // État pour l'historique des assurances
  const [historiqueAssurance, setHistoriqueAssurance] = useState<any[]>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [showInsuranceChangeAlert, setShowInsuranceChangeAlert] = useState(false);

  // Fonction pour refetch les données du véhicule et notifier le parent
  const fetchVehicleDetails = async (shouldNotifyParent: boolean = false) => {
    console.log('[fetchVehicleDetails] Début refetch pour vehicule ID:', vehicle.id, 'notifyParent:', shouldNotifyParent);
    try {
      // NIVEAU 2 CORRECTIF: Charger depuis la table vehicule directement (données complètes)
      // au lieu de la vue v_vehicles_list_ui (qui peut manquer des colonnes)
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicule')
        .select('*')
        .eq('id', vehicle.id)
        .single();

      if (vehicleError) {
        console.error('[fetchVehicleDetails] Erreur vehicule:', JSON.stringify(vehicleError, null, 2));
        throw vehicleError;
      }

      // Charger les attributions actives pour calculer chauffeurs_actifs
      const { data: attributionsData, error: attributionsError } = await supabase
        .from('attribution_vehicule')
        .select(`
          type_attribution,
          date_debut,
          loueur_id,
          profil:profil_id(id, nom, prenom, matricule_tca),
          loueur:loueur_id(nom)
        `)
        .eq('vehicule_id', vehicle.id)
        .lte('date_debut', new Date().toISOString().split('T')[0])
        .or(`date_fin.is.null,date_fin.gte.${new Date().toISOString().split('T')[0]}`);

      if (attributionsError) {
        console.error('[fetchVehicleDetails] Erreur attributions:', attributionsError);
      }

      // Calculer chauffeurs_actifs (tri identique à la vue SQL)
      const chauffeurs = (attributionsData || [])
        .map(av => ({
          id: av.profil?.id || null,
          nom: av.profil?.nom || null,
          prenom: av.profil?.prenom || null,
          matricule_tca: av.profil?.matricule_tca || null,
          type_attribution: av.type_attribution,
          date_debut: av.date_debut,
          loueur_id: av.loueur_id,
          loueur_nom: av.loueur?.nom || null
        }))
        .sort((a, b) => {
          const order = { principal: 1, secondaire: 2 };
          return (order[a.type_attribution as keyof typeof order] || 3) - (order[b.type_attribution as keyof typeof order] || 3);
        });

      // Calculer locataire_affiche (logique IDENTIQUE à la vue SQL)
      // Pour salarie et externe : on prend l'attribution principale la plus récente (ORDER BY date_debut DESC)
      const attributionsPrincipales = (attributionsData || [])
        .filter(av => av.type_attribution === 'principal')
        .sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());

      const principalAttribution = attributionsPrincipales[0];
      let locataireAffiche = 'Non attribué';

      if (vehicleData.locataire_type === 'salarie') {
        locataireAffiche = principalAttribution?.profil
          ? `${principalAttribution.profil.nom} ${principalAttribution.profil.prenom}`
          : 'Non attribué';
      } else if (vehicleData.locataire_type === 'personne_externe' || vehicleData.locataire_type === 'entreprise_externe') {
        locataireAffiche = principalAttribution?.loueur?.nom || vehicleData.locataire_nom_libre || 'Non attribué';
      } else if (vehicleData.locataire_type === 'libre') {
        locataireAffiche = vehicleData.locataire_nom_libre || 'TCA';
      } else {
        locataireAffiche = 'TCA';
      }

      if (vehicleData) {
        console.log('[fetchVehicleDetails] Données reçues:', vehicleData);
        console.log('[AUDIT 4 CHAMPS] finition:', vehicleData.finition);
        console.log('[AUDIT 4 CHAMPS] energie:', vehicleData.energie);
        console.log('[AUDIT 4 CHAMPS] couleur:', vehicleData.couleur);
        console.log('[AUDIT 4 CHAMPS] mode_acquisition:', vehicleData.mode_acquisition);
        const updatedVehicle = {
          ...vehicleData,
          chauffeurs_actifs: chauffeurs,
          nb_chauffeurs_actifs: chauffeurs.length,
          locataire_affiche: locataireAffiche
        } as Vehicle;
        setVehicle(updatedVehicle);
        setEditedVehicle(updatedVehicle);
        console.log('[AUDIT ETAT] editedVehicle après setEditedVehicle:', {
          finition: updatedVehicle.finition,
          energie: updatedVehicle.energie,
          couleur: updatedVehicle.couleur,
          mode_acquisition: updatedVehicle.mode_acquisition
        });
        console.log('[fetchVehicleDetails] État mis à jour avec succès');

        // Notifier le parent uniquement si demandé (après upload/suppression photo)
        if (shouldNotifyParent) {
          await onVehicleUpdated(updatedVehicle);
        }
      }
    } catch (error) {
      console.error('[fetchVehicleDetails] Erreur chargement détails véhicule:', JSON.stringify(error, null, 2));
      alert('Erreur lors du rechargement des données. Voir la console.');
    }
  };

  // Fonction pour charger l'historique des assurances
  const fetchHistoriqueAssurance = async () => {
    setLoadingHistorique(true);
    try {
      const { data, error } = await supabase
        .from('historique_assurance_vehicule')
        .select('*')
        .eq('vehicule_id', vehicle.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistoriqueAssurance(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des assurances:', error);
    } finally {
      setLoadingHistorique(false);
    }
  };

  // Charger les données complètes du véhicule au montage (une seule fois)
  useEffect(() => {
    fetchVehicleDetails();
    fetchHistoriqueAssurance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Désactiver le mode édition lors du changement d'onglet
    if (isEditing) {
      setIsEditing(false);
      setEditedVehicle(vehicle);
    }
  }, [activeTab]);

  // Parser le proprietaire_carte_grise au chargement du véhicule
  useEffect(() => {
    const parsed = parseProprietaireCarteGrise(vehicle.proprietaire_carte_grise);
    setProprietaireMode(parsed.mode);
    setProprietaireTcaValue(parsed.tcaValue);
    setProprietaireEntrepriseName(parsed.entrepriseName);
    setProprietaireEntreprisePhone(parsed.entreprisePhone);
    setProprietaireEntrepriseAddress(parsed.entrepriseAddress);
  }, [vehicle.proprietaire_carte_grise]);

  // Recalcul automatique de la date de fin prévue du contrat
  useEffect(() => {
    if (editedVehicle.date_debut_contrat && editedVehicle.duree_contrat_mois) {
      const dateDebut = new Date(editedVehicle.date_debut_contrat);
      const dateFin = new Date(dateDebut);
      dateFin.setMonth(dateFin.getMonth() + Number(editedVehicle.duree_contrat_mois));
      const dateFinFormatted = dateFin.toISOString().split('T')[0];
      setEditedVehicle(prev => ({ ...prev, date_fin_prevue_contrat: dateFinFormatted }));
    } else {
      setEditedVehicle(prev => ({ ...prev, date_fin_prevue_contrat: null }));
    }
  }, [editedVehicle.date_debut_contrat, editedVehicle.duree_contrat_mois]);

  // Recalcul automatique du reste à payer TTC
  useEffect(() => {
    const resteAPayer = calculateResteAPayer(
      editedVehicle.date_debut_contrat || '',
      editedVehicle.duree_contrat_mois || '',
      editedVehicle.mensualite_ttc || ''
    );
    setEditedVehicle(prev => ({ ...prev, reste_a_payer_ttc: resteAPayer }));
  }, [editedVehicle.date_debut_contrat, editedVehicle.duree_contrat_mois, editedVehicle.mensualite_ttc]);


  const cleanPayloadForUpdate = (data: any) => {
    const cleaned = { ...data };

    const dateFields = ['date_premiere_mise_en_circulation', 'date_mise_en_service'];
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

    const stringFields = ['ref_tca', 'marque', 'modele', 'finition', 'energie', 'couleur', 'type', 'fournisseur', 'financeur_nom', 'financeur_adresse', 'financeur_code_postal', 'financeur_ville', 'financeur_telephone', 'proprietaire_carte_grise', 'mode_acquisition', 'assurance_compagnie', 'assurance_numero_contrat', 'licence_transport_numero', 'carte_essence_fournisseur', 'carte_essence_numero', 'locataire_nom_libre'];
    stringFields.forEach(field => {
      if (cleaned[field] === undefined) {
        cleaned[field] = null;
      }
    });

    const numericFields = ['prix_ht', 'prix_ttc', 'mensualite_ht', 'mensualite_ttc', 'duree_contrat_mois', 'reste_a_payer_ttc'];
    numericFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const num = Number(cleaned[field]);
        cleaned[field] = isNaN(num) ? null : num;
      }
    });

    return cleaned;
  };

  const handleSave = async () => {
    console.log('[handleSave] Début sauvegarde pour vehicule ID:', vehicle.id);
    setSaving(true);

    // Réinitialiser l'alerte de changement d'assurance
    setShowInsuranceChangeAlert(false);

    try {
      // Détecter si l'assurance a changé
      const assuranceChanged =
        vehicle.assurance_type !== editedVehicle.assurance_type ||
        vehicle.assurance_compagnie !== editedVehicle.assurance_compagnie ||
        vehicle.assurance_numero_contrat !== editedVehicle.assurance_numero_contrat ||
        vehicle.assurance_prime_mensuelle !== editedVehicle.assurance_prime_mensuelle;

      // Formatter le proprietaire_carte_grise selon le mode sélectionné
      const formattedProprietaire = formatProprietaireCarteGrise({
        mode: proprietaireMode,
        tcaValue: proprietaireTcaValue,
        entrepriseName: proprietaireEntrepriseName,
        entreprisePhone: proprietaireEntreprisePhone,
        entrepriseAddress: proprietaireEntrepriseAddress
      });

      const updateData = cleanPayloadForUpdate({
        ref_tca: editedVehicle.ref_tca,
        marque: editedVehicle.marque,
        modele: editedVehicle.modele,
        finition: editedVehicle.finition,
        energie: editedVehicle.energie,
        couleur: editedVehicle.couleur,
        annee: editedVehicle.annee,
        type: editedVehicle.type,
        statut: editedVehicle.statut,
        date_mise_en_service: editedVehicle.date_mise_en_service,
        date_premiere_mise_en_circulation: editedVehicle.date_premiere_mise_en_circulation,
        fournisseur: editedVehicle.fournisseur,
        financeur_nom: editedVehicle.financeur_nom,
        financeur_adresse: editedVehicle.financeur_adresse,
        financeur_code_postal: editedVehicle.financeur_code_postal,
        financeur_ville: editedVehicle.financeur_ville,
        financeur_telephone: editedVehicle.financeur_telephone,
        proprietaire_carte_grise: formattedProprietaire,
        mode_acquisition: editedVehicle.mode_acquisition,
        prix_ht: editedVehicle.prix_ht,
        prix_ttc: editedVehicle.prix_ttc,
        mensualite_ht: editedVehicle.mensualite_ht,
        mensualite_ttc: editedVehicle.mensualite_ttc,
        duree_contrat_mois: editedVehicle.duree_contrat_mois,
        date_debut_contrat: editedVehicle.date_debut_contrat,
        date_fin_prevue_contrat: editedVehicle.date_fin_prevue_contrat,
        reste_a_payer_ttc: editedVehicle.reste_a_payer_ttc,
        assurance_type: editedVehicle.assurance_type,
        assurance_compagnie: editedVehicle.assurance_compagnie,
        assurance_numero_contrat: editedVehicle.assurance_numero_contrat,
        assurance_prime_mensuelle: editedVehicle.assurance_prime_mensuelle,
        licence_transport_numero: editedVehicle.licence_transport_numero,
        carte_essence_fournisseur: editedVehicle.carte_essence_fournisseur,
        carte_essence_numero: editedVehicle.carte_essence_numero,
        carte_essence_attribuee: editedVehicle.carte_essence_attribuee,
        kilometrage_actuel: editedVehicle.kilometrage_actuel,
        locataire_type: editedVehicle.locataire_type,
        locataire_nom_libre: editedVehicle.locataire_nom_libre,
      });

      console.log('[handleSave] Données à envoyer:', updateData);

      const { data, error } = await supabase
        .from('vehicule')
        .update(updateData)
        .eq('id', vehicle.id)
        .select('*')
        .single();

      if (error) {
        console.error('[handleSave] Erreur UPDATE:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[handleSave] UPDATE réussi, données retournées:', data);

      // Mise à jour immédiate de l'état local avec les données retournées par l'update
      const updatedVehicleData = {
        ...vehicle,
        ...data,
        chauffeurs_actifs: vehicle.chauffeurs_actifs,
        nb_chauffeurs_actifs: vehicle.nb_chauffeurs_actifs,
        locataire_affiche: vehicle.locataire_affiche
      } as Vehicle;

      setVehicle(updatedVehicleData);
      setEditedVehicle(updatedVehicleData);
      setIsEditing(false);

      // Si l'assurance a changé, créer une entrée dans l'historique
      if (assuranceChanged) {
        console.log('[handleSave] Assurance modifiée, création de l\'historique');

        const { data: userData } = await supabase.auth.getUser();

        const { error: historiqueError } = await supabase
          .from('historique_assurance_vehicule')
          .insert({
            vehicule_id: vehicle.id,
            ancienne_assurance_type: vehicle.assurance_type,
            ancienne_assurance_compagnie: vehicle.assurance_compagnie,
            ancien_assurance_numero_contrat: vehicle.assurance_numero_contrat,
            ancienne_prime_mensuelle: vehicle.assurance_prime_mensuelle,
            nouvelle_assurance_type: editedVehicle.assurance_type,
            nouvelle_assurance_compagnie: editedVehicle.assurance_compagnie,
            nouveau_assurance_numero_contrat: editedVehicle.assurance_numero_contrat,
            nouvelle_prime_mensuelle: editedVehicle.assurance_prime_mensuelle,
            changed_by: userData?.user?.id || null
          });

        if (historiqueError) {
          console.error('[handleSave] Erreur création historique:', historiqueError);
        } else {
          console.log('[handleSave] Historique créé avec succès');
          // Recharger l'historique sans attendre
          fetchHistoriqueAssurance();
          // Afficher le message d'alerte
          setShowInsuranceChangeAlert(true);
        }
      }

      // Notifier le parent de la mise à jour SANS ATTENDRE (pour éviter le rechargement)
      onVehicleUpdated(updatedVehicleData).catch(err =>
        console.error('[handleSave] Erreur notification parent:', err)
      );

      setSuccessMessage('Modifications enregistrées avec succès');
      setShowSuccessModal(true);
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

      // Refetch les données du véhicule pour avoir le photo_path à jour (et notifie le parent)
      await fetchVehicleDetails(true);
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

      // Refetch les données du véhicule (et notifie le parent)
      await fetchVehicleDetails(true);
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      alert('Erreur lors de la suppression de la photo');
    }
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      actif: { bg: 'bg-emerald-500', text: 'text-white', label: 'Actif' },
      maintenance: { bg: 'bg-amber-500', text: 'text-white', label: 'Maintenance' },
      'hors service': { bg: 'bg-red-500', text: 'text-white', label: 'Hors service' },
      'en location': { bg: 'bg-sky-500', text: 'text-white', label: 'En location' },
    };

    const config = statusConfig[statut.toLowerCase()] || { bg: 'bg-gray-500', text: 'text-white', label: statut };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full h-[95vh] sm:h-[92vh] overflow-hidden flex flex-col">
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
                {vehicle.ref_tca && (
                  <p className="text-sm text-gray-600">Réf. TCA: {vehicle.ref_tca}</p>
                )}
              </div>
              {getStatusBadge(vehicle.statut)}
            </div>
            <div className="flex items-center gap-2">
              {activeTab !== 'documents' && (
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

          <div className="bg-gray-50 px-4 sm:px-6 py-3 overflow-x-auto">
            <nav className="flex gap-2 min-w-max">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 min-w-[80px] ${
                  activeTab === 'info'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                <FileText className={`w-5 h-5 mb-1 ${activeTab === 'info' ? 'animate-pulse' : ''}`} />
                <span>Infos</span>
              </button>
              <button
                onClick={() => setActiveTab('proprietaire')}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 min-w-[80px] ${
                  activeTab === 'proprietaire'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                <CreditCard className={`w-5 h-5 mb-1 ${activeTab === 'proprietaire' ? 'animate-pulse' : ''}`} />
                <span>Propriétaire</span>
              </button>
              <button
                onClick={() => setActiveTab('acquisition')}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 min-w-[80px] ${
                  activeTab === 'acquisition'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                <ShoppingCart className={`w-5 h-5 mb-1 ${activeTab === 'acquisition' ? 'animate-pulse' : ''}`} />
                <span>Acquisition</span>
              </button>
              <button
                onClick={() => setActiveTab('insurance')}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 min-w-[80px] ${
                  activeTab === 'insurance'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                <Shield className={`w-5 h-5 mb-1 ${activeTab === 'insurance' ? 'animate-pulse' : ''}`} />
                <span>Assurance</span>
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 min-w-[80px] ${
                  activeTab === 'equipment'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                <Package className={`w-5 h-5 mb-1 ${activeTab === 'equipment' ? 'animate-pulse' : ''}`} />
                <span>Équipements</span>
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 min-w-[80px] ${
                  activeTab === 'documents'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                <FileText className={`w-5 h-5 mb-1 ${activeTab === 'documents' ? 'animate-pulse' : ''}`} />
                <span>Documents</span>
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Identification</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Immatriculation</label>
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 rounded-lg border border-blue-200">
                        <p className="text-base font-bold text-blue-900">{vehicle.immatriculation}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Référence TCA</label>
                      <input
                        type="text"
                        value={editedVehicle.ref_tca || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, ref_tca: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Marque</label>
                      <input
                        type="text"
                        value={editedVehicle.marque || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, marque: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Modèle</label>
                      <input
                        type="text"
                        value={editedVehicle.modele || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, modele: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Finition</label>
                      <input
                        type="text"
                        value={editedVehicle.finition || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, finition: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Ex: Premium, Business"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Énergie</label>
                      {isEditing ? (
                        <select
                          value={editedVehicle.energie || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, energie: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Essence">Essence</option>
                          <option value="Électrique">Électrique</option>
                          <option value="Hybride">Hybride</option>
                          <option value="Hybride rechargeable">Hybride rechargeable</option>
                          <option value="GPL">GPL</option>
                          <option value="GNV">GNV</option>
                          <option value="Hydrogène">Hydrogène</option>
                          <option value="Autre">Autre</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editedVehicle.energie || ''}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Couleur</label>
                      <input
                        type="text"
                        value={editedVehicle.couleur || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, couleur: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Ex: Blanc, Noir, Gris"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Année</label>
                      <input
                        type="number"
                        value={editedVehicle.annee || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, annee: e.target.value ? Number(e.target.value) : null })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type de véhicule</label>
                      {isEditing ? (
                        <select
                          value={editedVehicle.type || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, type: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                        >
                          <option value="VL">VL - Véhicule Léger</option>
                          <option value="VUL">VUL - Véhicule Utilitaire Léger</option>
                          <option value="PL">PL - Poids Lourd</option>
                          <option value="TC">TC - Transport en Commun</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editedVehicle.type || ''}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Car className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Photo du véhicule</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-full sm:w-56 h-40 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-inner border-2 border-gray-200">
                      {uploading ? (
                        <LoadingSpinner size="lg" />
                      ) : photoUrl ? (
                        <img src={photoUrl} alt={vehicle.immatriculation} className="w-full h-full object-cover" />
                      ) : (
                        <Car className="w-24 h-24 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <label className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 cursor-pointer transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl font-medium">
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
                          className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-600/30 hover:shadow-xl font-medium ml-2"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </button>
                      )}
                      <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">Format: JPG, PNG, WebP (max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-orange-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Dates importantes</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">1ère mise en circulation</label>
                        <input
                          type="date"
                          value={editedVehicle.date_premiere_mise_en_circulation || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, date_premiere_mise_en_circulation: e.target.value || null })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mise en service</label>
                        <input
                          type="date"
                          value={editedVehicle.date_mise_en_service || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, date_mise_en_service: e.target.value || null })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-teal-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Kilométrage</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kilométrage actuel (km)</label>
                        <input
                          type="number"
                          value={editedVehicle.kilometrage_actuel || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, kilometrage_actuel: e.target.value ? Number(e.target.value) : null })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                          placeholder="Ex: 150000"
                        />
                      </div>
                      {editedVehicle.derniere_maj_kilometrage && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dernière mise à jour</label>
                          <div className="bg-gray-50 px-4 py-3 rounded-lg border-2 border-gray-200">
                            <p className="text-sm font-medium text-gray-700">
                              {new Date(editedVehicle.derniere_maj_kilometrage).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'proprietaire' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <ProprietaireSelector
                  proprietaireMode={proprietaireMode}
                  proprietaireTcaValue={proprietaireTcaValue}
                  proprietaireEntrepriseName={proprietaireEntrepriseName}
                  proprietaireEntreprisePhone={proprietaireEntreprisePhone}
                  proprietaireEntrepriseAddress={proprietaireEntrepriseAddress}
                  onModeChange={setProprietaireMode}
                  onTcaValueChange={setProprietaireTcaValue}
                  onEntrepriseNameChange={setProprietaireEntrepriseName}
                  onEntreprisePhoneChange={setProprietaireEntreprisePhone}
                  onEntrepriseAddressChange={setProprietaireEntrepriseAddress}
                  disabled={!isEditing}
                  showTitle={true}
                />
              </div>
            )}

            {activeTab === 'acquisition' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Acquisition du véhicule</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fournisseur</label>
                      <input
                        type="text"
                        value={editedVehicle.fournisseur || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, fournisseur: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                        placeholder="Ex: RENAULT, PEUGEOT"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Financeur</label>
                      <input
                        type="text"
                        value={editedVehicle.financeur_nom || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, financeur_nom: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                        placeholder="Ex: BNP Paribas Lease Group"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Adresse du financeur</label>
                      <input
                        type="text"
                        value={editedVehicle.financeur_adresse || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, financeur_adresse: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                        placeholder="Ex: 12 rue de la Banque"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Code postal</label>
                        <input
                          type="text"
                          value={editedVehicle.financeur_code_postal || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, financeur_code_postal: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                          placeholder="Ex: 75001"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ville</label>
                        <input
                          type="text"
                          value={editedVehicle.financeur_ville || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, financeur_ville: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                          placeholder="Ex: Paris"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={editedVehicle.financeur_telephone || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, financeur_telephone: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700 font-medium transition-all"
                        placeholder="Ex: 01 23 45 67 89"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mode d'acquisition</label>
                      <select
                        value={editedVehicle.mode_acquisition || ''}
                        onChange={(e) => setEditedVehicle({ ...editedVehicle, mode_acquisition: e.target.value || null })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      >
                        <option value="">-- Non renseigné --</option>
                        <option value="ACHAT">Achat comptant</option>
                        <option value="LOA">LOA (Location avec Option d'Achat)</option>
                        <option value="LLD">LLD (Location Longue Durée)</option>
                        <option value="CREDIT">Crédit</option>
                        <option value="LEASING">Leasing</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prix HT</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.prix_ht || ''}
                          onChange={(e) => {
                            const ht = e.target.value ? parseFloat(e.target.value) : null;
                            const ttc = ht ? ht * 1.20 : null;
                            setEditedVehicle({ ...editedVehicle, prix_ht: ht, prix_ttc: ttc });
                          }}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prix TTC (auto)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.prix_ttc || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensualité HT</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.mensualite_ht || ''}
                          onChange={(e) => {
                            const ht = e.target.value ? parseFloat(e.target.value) : null;
                            const ttc = ht ? ht * 1.20 : null;
                            setEditedVehicle({ ...editedVehicle, mensualite_ht: ht, mensualite_ttc: ttc });
                          }}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensualité TTC (auto)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedVehicle.mensualite_ttc || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

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
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, date_debut_contrat: e.target.value || null })}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date fin prévue (calculée)</label>
                        <input
                          type="date"
                          value={editedVehicle.date_fin_prevue_contrat || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reste à payer TTC (calculé)</label>
                      <input
                        type="text"
                        value={editedVehicle.reste_a_payer_ttc ? `${editedVehicle.reste_a_payer_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
                        placeholder="0.00 €"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insurance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assurance</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type d'assurance</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          editedVehicle.assurance_type === 'tca'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isEditing ? 'cursor-not-allowed opacity-60' : ''}`}>
                          <input
                            type="radio"
                            checked={editedVehicle.assurance_type === 'tca'}
                            onChange={() => isEditing && setEditedVehicle({ ...editedVehicle, assurance_type: 'tca' })}
                            disabled={!isEditing}
                            className="mr-3 w-4 h-4 text-blue-600"
                          />
                          <span className="font-medium text-gray-700">Assuré TCA</span>
                        </label>
                        <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          editedVehicle.assurance_type === 'externe'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isEditing ? 'cursor-not-allowed opacity-60' : ''}`}>
                          <input
                            type="radio"
                            checked={editedVehicle.assurance_type === 'externe'}
                            onChange={() => isEditing && setEditedVehicle({ ...editedVehicle, assurance_type: 'externe' })}
                            disabled={!isEditing}
                            className="mr-3 w-4 h-4 text-blue-600"
                          />
                          <span className="font-medium text-gray-700">Assurance externe</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Compagnie d'assurance</label>
                        <input
                          type="text"
                          value={editedVehicle.assurance_compagnie || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, assurance_compagnie: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Ex: AXA, Allianz, Groupama..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de contrat</label>
                        <input
                          type="text"
                          value={editedVehicle.assurance_numero_contrat || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, assurance_numero_contrat: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Ex: 123456789"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prime mensuelle</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedVehicle.assurance_prime_mensuelle || ''}
                            onChange={(e) => setEditedVehicle({
                              ...editedVehicle,
                              assurance_prime_mensuelle: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            disabled={!isEditing}
                            placeholder="Ex: 89.90"
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {showInsuranceChangeAlert && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-sm text-red-800 font-medium">
                        Nouvelle assurance enregistrée. Ne pas oublier d'insérer l'attestation d'assurance avec les dates dans l'onglet Documents.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des changements d'assurance</h3>
                  {loadingHistorique ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : historiqueAssurance.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-gray-600">Aucun changement d'assurance enregistré</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historiqueAssurance.map((historique, index) => (
                        <div key={historique.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-semibold text-gray-500">
                              Changement #{historiqueAssurance.length - index}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(historique.changed_at).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-red-600 mb-2">Ancienne assurance</p>
                              <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Type:</span> {historique.ancienne_assurance_type === 'tca' ? 'Assuré TCA' : historique.ancienne_assurance_type === 'externe' ? 'Assurance externe' : 'Non défini'}</p>
                                <p><span className="font-medium">Compagnie:</span> {historique.ancienne_assurance_compagnie || 'Non défini'}</p>
                                <p><span className="font-medium">N° contrat:</span> {historique.ancien_assurance_numero_contrat || 'Non défini'}</p>
                                <p><span className="font-medium">Prime mensuelle:</span> {historique.ancienne_prime_mensuelle ? `${historique.ancienne_prime_mensuelle.toFixed(2)} €` : 'Non défini'}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-green-600 mb-2">Nouvelle assurance</p>
                              <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Type:</span> {historique.nouvelle_assurance_type === 'tca' ? 'Assuré TCA' : historique.nouvelle_assurance_type === 'externe' ? 'Assurance externe' : 'Non défini'}</p>
                                <p><span className="font-medium">Compagnie:</span> {historique.nouvelle_assurance_compagnie || 'Non défini'}</p>
                                <p><span className="font-medium">N° contrat:</span> {historique.nouveau_assurance_numero_contrat || 'Non défini'}</p>
                                <p><span className="font-medium">Prime mensuelle:</span> {historique.nouvelle_prime_mensuelle ? `${historique.nouvelle_prime_mensuelle.toFixed(2)} €` : 'Non défini'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Licence de transport</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de licence</label>
                    <input
                      type="text"
                      value={editedVehicle.licence_transport_numero || ''}
                      onChange={(e) => setEditedVehicle({ ...editedVehicle, licence_transport_numero: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Numéro de licence"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Matériel embarqué</h3>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Liste des équipements et matériels embarqués dans le véhicule (ex: siège bébé, GPS, dashcam, etc.)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {vehicle.materiel_embarque && Array.isArray(vehicle.materiel_embarque) && vehicle.materiel_embarque.length > 0 ? (
                      vehicle.materiel_embarque.map((eq: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-2 gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'équipement</label>
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
                              type="number"
                              value={eq.quantite || ''}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Aucun équipement enregistré</p>
                        <p className="text-sm text-gray-400 mt-1">Les équipements sont ajoutés lors de la création du véhicule</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Carte essence</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        editedVehicle.carte_essence_attribuee
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${!isEditing ? 'cursor-not-allowed opacity-60' : ''}`}>
                        <input
                          type="checkbox"
                          checked={editedVehicle.carte_essence_attribuee || false}
                          onChange={(e) => isEditing && setEditedVehicle({ ...editedVehicle, carte_essence_attribuee: e.target.checked })}
                          disabled={!isEditing}
                          className="mr-3 w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Carte essence attribuée au véhicule</span>
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
                          placeholder="Ex: Total, Shell, BP..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de carte</label>
                        <input
                          type="text"
                          value={editedVehicle.carte_essence_numero || ''}
                          onChange={(e) => setEditedVehicle({ ...editedVehicle, carte_essence_numero: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Ex: CE-123456"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'documents' && (
              <VehicleDocuments vehicleId={vehicle.id} />
            )}
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </>
  );
}
