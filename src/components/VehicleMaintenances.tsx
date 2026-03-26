import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Calendar, DollarSign, Plus, X, CheckCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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
  facture_url: string | null;
  created_at: string;
}

interface Props {
  vehicleId: string;
}

export function VehicleMaintenances({ vehicleId }: Props) {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Maintenance>>({
    type: '',
    description: '',
    statut: 'a_faire',
    prestataire: '',
    prochain_controle_date: '',
    prochain_controle_km: null,
    frequence_km: null,
  });

  useEffect(() => {
    fetchMaintenances();
  }, [vehicleId]);

  const fetchMaintenances = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .eq('vehicule_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaintenances(data || []);
    } catch (error) {
      console.error('Erreur chargement maintenances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = async () => {
    if (!formData.type) {
      alert('Le type de maintenance est obligatoire');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('maintenance')
        .insert({
          vehicule_id: vehicleId,
          type: formData.type,
          description: formData.description || null,
          statut: formData.statut,
          prestataire: formData.prestataire || null,
          prochain_controle_date: formData.prochain_controle_date || null,
          prochain_controle_km: formData.prochain_controle_km || null,
          frequence_km: formData.frequence_km || null,
        });

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        type: '',
        description: '',
        statut: 'a_faire',
        prestataire: '',
        prochain_controle_date: '',
        prochain_controle_km: null,
        frequence_km: null,
      });
      fetchMaintenances();
    } catch (error) {
      console.error('Erreur ajout maintenance:', error);
      alert('Erreur lors de l\'ajout de la maintenance');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsDone = async (maintenanceId: string) => {
    if (!confirm('Marquer cette maintenance comme faite ?')) return;

    try {
      const { error } = await supabase
        .from('maintenance')
        .update({
          statut: 'faite',
          date_intervention: new Date().toISOString().split('T')[0],
        })
        .eq('id', maintenanceId);

      if (error) throw error;
      fetchMaintenances();
    } catch (error) {
      console.error('Erreur mise à jour maintenance:', error);
      alert('Erreur lors de la mise à jour');
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
          onClick={() => setShowAddModal(true)}
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
                  <button
                    onClick={() => handleMarkAsDone(maintenance.id)}
                    className="ml-3 inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Marquer comme faite
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {maintenance.frequence_km && (
                    <div>
                      <span className="text-gray-500">Fréquence:</span>
                      <span className="ml-2 font-medium">{maintenance.frequence_km.toLocaleString()} km</span>
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
                  {maintenance.facture_url && (
                    <a
                      href={maintenance.facture_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Facture
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
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
                  {maintenance.cout && (
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    Prochain contrôle (date)
                  </label>
                  <input
                    type="date"
                    value={formData.prochain_controle_date}
                    onChange={(e) => setFormData({ ...formData, prochain_controle_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prochain contrôle (km)
                  </label>
                  <input
                    type="number"
                    value={formData.prochain_controle_km || ''}
                    onChange={(e) => setFormData({ ...formData, prochain_controle_km: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ex: 150000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
    </div>
  );
}
