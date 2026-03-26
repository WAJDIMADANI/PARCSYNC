import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Calendar, DollarSign, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
}

interface Maintenance {
  id: string;
  vehicule_id: string;
  type: string;
  description: string | null;
  date_intervention: string;
  cout: number | null;
  kilometrage: number | null;
  prestataire: string | null;
  statut: 'a_faire' | 'faite';
  prochain_controle_date: string | null;
  prochain_controle_km: number | null;
  frequence_km: number | null;
  frequence_mois: number | null;
  created_at: string;
  vehicule?: Vehicle;
}

export function MaintenanceList() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'a_faire' | 'faite'>('all');

  useEffect(() => {
    fetchMaintenances();
  }, []);

  const fetchMaintenances = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*, vehicule:vehicule_id(id, immatriculation, marque, modele)')
        .order('date_intervention', { ascending: false });

      if (error) throw error;
      setMaintenances(data || []);
    } catch (error) {
      console.error('Erreur chargement maintenances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'faite':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'a_faire':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'faite':
        return 'bg-green-100 text-green-700';
      case 'a_faire':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'faite':
        return 'Terminée';
      case 'a_faire':
        return 'Planifiée';
      default:
        return statut;
    }
  };

  const filteredMaintenances = maintenances.filter(m => {
    const matchesSearch = m.vehicule
      ? `${m.vehicule.immatriculation} ${m.vehicule.marque} ${m.vehicule.modele} ${m.type} ${m.prestataire || ''}`.toLowerCase().includes(search.toLowerCase())
      : false;

    const matchesStatus = filterStatus === 'all' || m.statut === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const totalCost = filteredMaintenances
    .filter(m => m.statut === 'faite' && m.cout)
    .reduce((sum, m) => sum + (m.cout || 0), 0);

  const doneCount = maintenances.filter(m => m.statut === 'faite').length;
  const plannedCount = maintenances.filter(m => m.statut === 'a_faire').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement de la maintenance..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Maintenance & Garage</h1>
        <p className="text-gray-600 mt-1">Suivi des interventions et entretiens</p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Planifiées</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{plannedCount}</p>
            </div>
            <Calendar className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Terminées</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{doneCount}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Coût total (terminées)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCost.toLocaleString()} €</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher une maintenance..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilterStatus('a_faire')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm ${
              filterStatus === 'a_faire'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Planifiées
          </button>
          <button
            onClick={() => setFilterStatus('faite')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm ${
              filterStatus === 'faite'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Terminées
          </button>
        </div>
      </div>

      {filteredMaintenances.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune maintenance trouvée</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Véhicule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prestataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kilométrage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coût
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaintenances.map((maintenance) => (
                <tr key={maintenance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {maintenance.vehicule ? (
                      <div>
                        <div className="font-semibold">{maintenance.vehicule.immatriculation}</div>
                        <div className="text-xs text-gray-500">
                          {maintenance.vehicule.marque} {maintenance.vehicule.modele}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {maintenance.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(maintenance.date_intervention).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {maintenance.prestataire || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {maintenance.kilometrage ? `${maintenance.kilometrage.toLocaleString()} km` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {maintenance.cout ? `${maintenance.cout.toLocaleString()} €` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(maintenance.statut)}`}>
                      {getStatusIcon(maintenance.statut)}
                      <span className="ml-1">{getStatusLabel(maintenance.statut)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {maintenance.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
