import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Calendar, DollarSign, Plus, X, CheckCircle, Clock, FileText, ExternalLink, CreditCard as Edit3 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ValidationModal } from './ValidationModal';

interface Maintenance {
  id: string;
  vehicule_id: string;
  type: string;
  description: string | null;
  date_intervention: string | null;
  cout: number | null;
  kilometrage: number | null;
  prestataire: string | null;
  statut: 'a_faire' | 'faite';
  prochain_controle_date: string | null;
  prochain_controle_km: number | null;
  frequence_km: number | null;
  frequence_mois: number | null;
  facture_url: string | null;
  facture_path: string | null;
  facture_nom_fichier: string | null;
  facture_uploaded_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Props {
  vehicleId: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function VehicleMaintenances({ vehicleId }: Props) {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMarkAsDoneModal, setShowMarkAsDoneModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const typeInputRef = useRef<HTMLInputElement>(null);
  const dateInterventionRef = useRef<HTMLInputElement>(null);
  const dateInterventionMarkAsDoneRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Maintenance>>({
    type: '',
    description: '',
    statut: 'a_faire',
    prestataire: '',
    prochain_controle_date: '',
    prochain_controle_km: null,
    frequence_km: null,
    frequence_mois: null,
    date_intervention: '',
    kilometrage: null,
    cout: null,
    facture_url: '',
    facture_path: '',
    facture_nom_fichier: '',
  });

  const [markAsDoneData, setMarkAsDoneData] = useState({
    date_intervention: new Date().toISOString().split('T')[0],
    kilometrage: '',
    cout: '',
    prestataire: '',
    facture_url: '',
    facture_path: '',
    facture_nom_fichier: '',
  });

  useEffect(() => {
    fetchMaintenances();
  }, [vehicleId]);

  const fetchMaintenances = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .eq('vehicule_id', vehicleId);

      if (error) throw error;

      // Tri métier
      const sorted = (data || []).sort((a, b) => {
        if (a.statut === 'a_faire' && b.statut === 'a_faire') {
          // Pour les maintenances à faire : tri par date de prochain contrôle (plus proche en premier)
          if (a.prochain_controle_date && b.prochain_controle_date) {
            return new Date(a.prochain_controle_date).getTime() - new Date(b.prochain_controle_date).getTime();
          }
          if (a.prochain_controle_date) return -1;
          if (b.prochain_controle_date) return 1;
          return 0;
        }
        if (a.statut === 'faite' && b.statut === 'faite') {
          // Pour les maintenances faites : tri par date d'intervention (plus récente en premier)
          if (a.date_intervention && b.date_intervention) {
            return new Date(b.date_intervention).getTime() - new Date(a.date_intervention).getTime();
          }
          if (a.date_intervention) return -1;
          if (b.date_intervention) return 1;
          return 0;
        }
        return 0;
      });

      setMaintenances(sorted);
    } catch (error) {
      console.error('Erreur chargement maintenances:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: '',
      description: '',
      statut: 'a_faire',
      prestataire: '',
      prochain_controle_date: '',
      prochain_controle_km: null,
      frequence_km: null,
      frequence_mois: null,
      date_intervention: '',
      kilometrage: null,
      cout: null,
      facture_url: '',
      facture_path: '',
      facture_nom_fichier: '',
    });
    setFieldErrors({});
  };

  const validateFormData = (): boolean => {
    const errors: Record<string, string> = {};
    const errorMessages: string[] = [];

    // Type obligatoire
    if (!formData.type || formData.type.trim() === '') {
      errors.type = 'Le type de maintenance est obligatoire';
      errorMessages.push('Le type de maintenance est obligatoire');
    }

    // Si statut = faite, date_intervention obligatoire
    if (formData.statut === 'faite' && (!formData.date_intervention || formData.date_intervention.trim() === '')) {
      errors.date_intervention = 'La date d\'intervention est obligatoire pour une maintenance faite';
      errorMessages.push('La date d\'intervention est obligatoire pour une maintenance marquée comme faite');
    }

    if (errorMessages.length > 0) {
      setFieldErrors(errors);
      setValidationMessage('Merci de remplir les champs obligatoires avant de continuer.');
      setValidationErrors(errorMessages);
      setShowValidationModal(true);

      // Focus sur le premier champ en erreur
      setTimeout(() => {
        if (errors.type && typeInputRef.current) {
          typeInputRef.current.focus();
        } else if (errors.date_intervention && dateInterventionRef.current) {
          dateInterventionRef.current.focus();
        }
      }, 100);

      return false;
    }

    setFieldErrors({});
    return true;
  };

  const validateMarkAsDoneData = (): boolean => {
    const errors: Record<string, string> = {};
    const errorMessages: string[] = [];

    // Date intervention obligatoire
    if (!markAsDoneData.date_intervention || markAsDoneData.date_intervention.trim() === '') {
      errors.date_intervention = 'La date d\'intervention est obligatoire';
      errorMessages.push('La date d\'intervention est obligatoire pour marquer une maintenance comme faite');
    }

    if (errorMessages.length > 0) {
      setFieldErrors(errors);
      setValidationMessage('Merci de remplir les champs obligatoires avant de continuer.');
      setValidationErrors(errorMessages);
      setShowValidationModal(true);

      // Focus sur le champ en erreur
      setTimeout(() => {
        if (errors.date_intervention && dateInterventionMarkAsDoneRef.current) {
          dateInterventionMarkAsDoneRef.current.focus();
        }
      }, 100);

      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleAddMaintenance = async () => {
    // Validation frontend
    if (!validateFormData()) {
      return;
    }

    setSaving(true);
    try {
      const insertData = {
        vehicule_id: vehicleId,
        type: formData.type!,
        description: formData.description || null,
        statut: formData.statut || 'a_faire',
        prestataire: formData.prestataire || null,
        prochain_controle_date: formData.prochain_controle_date || null,
        prochain_controle_km: formData.prochain_controle_km || null,
        frequence_km: formData.frequence_km || null,
        frequence_mois: formData.frequence_mois || null,
        date_intervention: formData.date_intervention || null,
        kilometrage: formData.kilometrage || null,
        cout: formData.cout || null,
        facture_url: formData.facture_url || null,
        facture_path: formData.facture_path || null,
        facture_nom_fichier: formData.facture_nom_fichier || null,
        facture_uploaded_at: formData.facture_url || formData.facture_path ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('maintenance')
        .insert(insertData);

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      fetchMaintenances();
    } catch (error) {
      console.error('Erreur ajout maintenance:', error);
      setValidationMessage('Erreur lors de l\'enregistrement en base de données.');
      setValidationErrors(['Une erreur technique est survenue. Veuillez réessayer.']);
      setShowValidationModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setFormData({
      type: maintenance.type,
      description: maintenance.description || '',
      statut: maintenance.statut,
      prestataire: maintenance.prestataire || '',
      prochain_controle_date: maintenance.prochain_controle_date || '',
      prochain_controle_km: maintenance.prochain_controle_km || null,
      frequence_km: maintenance.frequence_km || null,
      frequence_mois: maintenance.frequence_mois || null,
      date_intervention: maintenance.date_intervention || '',
      kilometrage: maintenance.kilometrage || null,
      cout: maintenance.cout || null,
      facture_url: maintenance.facture_url || '',
      facture_path: maintenance.facture_path || '',
      facture_nom_fichier: maintenance.facture_nom_fichier || '',
    });
    setFieldErrors({});
    setShowEditModal(true);
  };

  const handleUpdateMaintenance = async () => {
    if (!selectedMaintenance) return;

    // Validation frontend
    if (!validateFormData()) {
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        type: formData.type!,
        description: formData.description || null,
        statut: formData.statut,
        prestataire: formData.prestataire || null,
        prochain_controle_date: formData.prochain_controle_date || null,
        prochain_controle_km: formData.prochain_controle_km || null,
        frequence_km: formData.frequence_km || null,
        frequence_mois: formData.frequence_mois || null,
        date_intervention: formData.date_intervention || null,
        kilometrage: formData.kilometrage || null,
        cout: formData.cout || null,
        facture_url: formData.facture_url || null,
        facture_path: formData.facture_path || null,
        facture_nom_fichier: formData.facture_nom_fichier || null,
        facture_uploaded_at: (formData.facture_url || formData.facture_path) && !selectedMaintenance.facture_uploaded_at
          ? new Date().toISOString()
          : selectedMaintenance.facture_uploaded_at,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('maintenance')
        .update(updateData)
        .eq('id', selectedMaintenance.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedMaintenance(null);
      resetForm();
      fetchMaintenances();
    } catch (error) {
      console.error('Erreur modification maintenance:', error);
      setValidationMessage('Erreur lors de l\'enregistrement en base de données.');
      setValidationErrors(['Une erreur technique est survenue. Veuillez réessayer.']);
      setShowValidationModal(true);
    } finally {
      setSaving(false);
    }
  };

  const openMarkAsDoneModal = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setMarkAsDoneData({
      date_intervention: new Date().toISOString().split('T')[0],
      kilometrage: '',
      cout: '',
      prestataire: maintenance.prestataire || '',
      facture_url: '',
      facture_path: '',
      facture_nom_fichier: '',
    });
    setFieldErrors({});
    setShowMarkAsDoneModal(true);
  };

  const handleConfirmMarkAsDone = async () => {
    if (!selectedMaintenance) return;

    // Validation frontend
    if (!validateMarkAsDoneData()) {
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        statut: 'faite' as const,
        date_intervention: markAsDoneData.date_intervention,
        kilometrage: markAsDoneData.kilometrage ? parseInt(markAsDoneData.kilometrage) : null,
        cout: markAsDoneData.cout ? parseFloat(markAsDoneData.cout) : null,
        prestataire: markAsDoneData.prestataire || selectedMaintenance.prestataire || null,
        facture_url: markAsDoneData.facture_url || null,
        facture_path: markAsDoneData.facture_path || null,
        facture_nom_fichier: markAsDoneData.facture_nom_fichier || null,
        facture_uploaded_at: markAsDoneData.facture_url || markAsDoneData.facture_path
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('maintenance')
        .update(updateData)
        .eq('id', selectedMaintenance.id);

      if (error) throw error;

      setShowMarkAsDoneModal(false);
      setSelectedMaintenance(null);
      setFieldErrors({});
      fetchMaintenances();
    } catch (error) {
      console.error('Erreur mise à jour maintenance:', error);
      setValidationMessage('Erreur lors de l\'enregistrement en base de données.');
      setValidationErrors(['Une erreur technique est survenue. Veuillez réessayer.']);
      setShowValidationModal(true);
    } finally {
      setSaving(false);
    }
  };

  const maintenancesAFaire = maintenances.filter(m => m.statut === 'a_faire');
  const maintenancesFaites = maintenances.filter(m => m.statut === 'faite');

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Maintenances du véhicule</h3>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une maintenance
        </button>
      </div>

      {/* Maintenances à faire */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-orange-600" />
          <h4 className="text-base font-semibold text-gray-900">Maintenances à faire</h4>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
            {maintenancesAFaire.length}
          </span>
        </div>

        {maintenancesAFaire.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">Aucune maintenance planifiée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {maintenancesAFaire.map((maintenance) => (
              <div key={maintenance.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">{maintenance.type}</h5>
                    {maintenance.description && (
                      <p className="text-sm text-gray-600 mt-1">{maintenance.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => handleEdit(maintenance)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Modifier
                    </button>
                    <button
                      onClick={() => openMarkAsDoneModal(maintenance)}
                      className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Marquer faite
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {maintenance.frequence_km && (
                    <div>
                      <span className="text-gray-500">Fréquence km:</span>
                      <span className="ml-2 font-medium">{maintenance.frequence_km.toLocaleString()} km</span>
                    </div>
                  )}
                  {maintenance.frequence_mois && (
                    <div>
                      <span className="text-gray-500">Fréquence:</span>
                      <span className="ml-2 font-medium">{maintenance.frequence_mois} mois</span>
                    </div>
                  )}
                  {maintenance.prochain_controle_date && (
                    <div>
                      <span className="text-gray-500">Prochain contrôle:</span>
                      <span className="ml-2 font-medium">
                        {new Date(maintenance.prochain_controle_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {maintenance.prochain_controle_km && (
                    <div>
                      <span className="text-gray-500">Prochain contrôle km:</span>
                      <span className="ml-2 font-medium">{maintenance.prochain_controle_km.toLocaleString()} km</span>
                    </div>
                  )}
                  {maintenance.prestataire && (
                    <div>
                      <span className="text-gray-500">Prestataire:</span>
                      <span className="ml-2 font-medium">{maintenance.prestataire}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maintenances réalisées */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="text-base font-semibold text-gray-900">Maintenances réalisées</h4>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            {maintenancesFaites.length}
          </span>
        </div>

        {maintenancesFaites.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">Aucune maintenance réalisée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {maintenancesFaites.map((maintenance) => (
              <div key={maintenance.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">{maintenance.type}</h5>
                    {maintenance.description && (
                      <p className="text-sm text-gray-600 mt-1">{maintenance.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-3">
                    {(maintenance.facture_url || maintenance.facture_nom_fichier) && (
                      <a
                        href={maintenance.facture_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        {maintenance.facture_nom_fichier || 'Facture'}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(maintenance)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Modifier
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {maintenance.date_intervention && (
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(maintenance.date_intervention).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {maintenance.kilometrage && (
                    <div>
                      <span className="text-gray-500">Kilométrage:</span>
                      <span className="ml-2 font-medium">{maintenance.kilometrage.toLocaleString()} km</span>
                    </div>
                  )}
                  {maintenance.cout !== null && (
                    <div>
                      <span className="text-gray-500">Coût:</span>
                      <span className="ml-2 font-medium">{maintenance.cout.toFixed(2)} €</span>
                    </div>
                  )}
                  {maintenance.prestataire && (
                    <div>
                      <span className="text-gray-500">Prestataire:</span>
                      <span className="ml-2 font-medium">{maintenance.prestataire}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Ajouter une maintenance</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de maintenance *
                  </label>
                  <input
                    ref={typeInputRef}
                    type="text"
                    value={formData.type}
                    onChange={(e) => {
                      setFormData({ ...formData, type: e.target.value });
                      if (fieldErrors.type && e.target.value.trim()) {
                        setFieldErrors({ ...fieldErrors, type: undefined });
                      }
                    }}
                    placeholder="Ex: Vidange, Révision, Pneus..."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      fieldErrors.type
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {fieldErrors.type && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'a_faire' | 'faite' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="a_faire">À faire</option>
                    <option value="faite">Faite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails de la maintenance..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prestataire
                  </label>
                  <input
                    type="text"
                    value={formData.prestataire}
                    onChange={(e) => setFormData({ ...formData, prestataire: e.target.value })}
                    placeholder="Ex: Garage Martin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.frequence_km || ''}
                    onChange={(e) => setFormData({ ...formData, frequence_km: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence (mois)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.frequence_mois || ''}
                    onChange={(e) => setFormData({ ...formData, frequence_mois: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prochain contrôle (date)
                  </label>
                  <input
                    type="date"
                    value={formData.prochain_controle_date}
                    onChange={(e) => setFormData({ ...formData, prochain_controle_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prochain contrôle (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prochain_controle_km || ''}
                    onChange={(e) => setFormData({ ...formData, prochain_controle_km: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 150000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date intervention
                  </label>
                  <input
                    type="date"
                    value={formData.date_intervention}
                    onChange={(e) => setFormData({ ...formData, date_intervention: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilométrage
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.kilometrage || ''}
                    onChange={(e) => setFormData({ ...formData, kilometrage: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 125000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coût (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cout || ''}
                    onChange={(e) => setFormData({ ...formData, cout: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Ex: 89.90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Facture
                  </label>
                  <input
                    type="url"
                    value={formData.facture_url}
                    onChange={(e) => setFormData({ ...formData, facture_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom fichier facture
                  </label>
                  <input
                    type="text"
                    value={formData.facture_nom_fichier}
                    onChange={(e) => setFormData({ ...formData, facture_nom_fichier: e.target.value })}
                    placeholder="facture_123.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chemin facture (storage)
                </label>
                <input
                  type="text"
                  value={formData.facture_path}
                  onChange={(e) => setFormData({ ...formData, facture_path: e.target.value })}
                  placeholder="vehicules/ABC123/maintenances/facture.pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddMaintenance}
                disabled={saving || !formData.type}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Marquer comme faite */}
      {showMarkAsDoneModal && selectedMaintenance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Marquer comme faite</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedMaintenance.type}</p>
              </div>
              <button
                onClick={() => setShowMarkAsDoneModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'intervention *
                </label>
                <input
                  ref={dateInterventionMarkAsDoneRef}
                  type="date"
                  value={markAsDoneData.date_intervention}
                  onChange={(e) => {
                    setMarkAsDoneData({ ...markAsDoneData, date_intervention: e.target.value });
                    if (fieldErrors.date_intervention && e.target.value.trim()) {
                      setFieldErrors({ ...fieldErrors, date_intervention: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    fieldErrors.date_intervention
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.date_intervention && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.date_intervention}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilométrage
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={markAsDoneData.kilometrage}
                    onChange={(e) => setMarkAsDoneData({ ...markAsDoneData, kilometrage: e.target.value })}
                    placeholder="Ex: 125000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coût (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={markAsDoneData.cout}
                    onChange={(e) => setMarkAsDoneData({ ...markAsDoneData, cout: e.target.value })}
                    placeholder="Ex: 89.90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prestataire
                </label>
                <input
                  type="text"
                  value={markAsDoneData.prestataire}
                  onChange={(e) => setMarkAsDoneData({ ...markAsDoneData, prestataire: e.target.value })}
                  placeholder="Ex: Garage Martin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Facture
                  </label>
                  <input
                    type="url"
                    value={markAsDoneData.facture_url}
                    onChange={(e) => setMarkAsDoneData({ ...markAsDoneData, facture_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom fichier facture
                  </label>
                  <input
                    type="text"
                    value={markAsDoneData.facture_nom_fichier}
                    onChange={(e) => setMarkAsDoneData({ ...markAsDoneData, facture_nom_fichier: e.target.value })}
                    placeholder="facture_123.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chemin facture (storage)
                </label>
                <input
                  type="text"
                  value={markAsDoneData.facture_path}
                  onChange={(e) => setMarkAsDoneData({ ...markAsDoneData, facture_path: e.target.value })}
                  placeholder="vehicules/ABC123/maintenances/facture.pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowMarkAsDoneModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmMarkAsDone}
                disabled={saving || !markAsDoneData.date_intervention}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition */}
      {showEditModal && selectedMaintenance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Modifier la maintenance</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMaintenance(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de maintenance *
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="Ex: Vidange, Révision, Pneus..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'a_faire' | 'faite' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="a_faire">À faire</option>
                    <option value="faite">Faite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails de la maintenance..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prestataire
                  </label>
                  <input
                    type="text"
                    value={formData.prestataire}
                    onChange={(e) => setFormData({ ...formData, prestataire: e.target.value })}
                    placeholder="Ex: Garage Martin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.frequence_km || ''}
                    onChange={(e) => setFormData({ ...formData, frequence_km: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence (mois)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.frequence_mois || ''}
                    onChange={(e) => setFormData({ ...formData, frequence_mois: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prochain contrôle (date)
                  </label>
                  <input
                    type="date"
                    value={formData.prochain_controle_date}
                    onChange={(e) => setFormData({ ...formData, prochain_controle_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prochain contrôle (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prochain_controle_km || ''}
                    onChange={(e) => setFormData({ ...formData, prochain_controle_km: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 150000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date intervention
                  </label>
                  <input
                    type="date"
                    value={formData.date_intervention}
                    onChange={(e) => setFormData({ ...formData, date_intervention: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilométrage
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.kilometrage || ''}
                    onChange={(e) => setFormData({ ...formData, kilometrage: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 125000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coût (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cout || ''}
                    onChange={(e) => setFormData({ ...formData, cout: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Ex: 89.90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Facture
                  </label>
                  <input
                    type="url"
                    value={formData.facture_url}
                    onChange={(e) => setFormData({ ...formData, facture_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom fichier facture
                  </label>
                  <input
                    type="text"
                    value={formData.facture_nom_fichier}
                    onChange={(e) => setFormData({ ...formData, facture_nom_fichier: e.target.value })}
                    placeholder="facture_123.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chemin facture (storage)
                </label>
                <input
                  type="text"
                  value={formData.facture_path}
                  onChange={(e) => setFormData({ ...formData, facture_path: e.target.value })}
                  placeholder="vehicules/ABC123/maintenances/facture.pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMaintenance(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateMaintenance}
                disabled={saving || !formData.type}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validation */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        message={validationMessage}
        errors={validationErrors}
      />
    </div>
  );
}
