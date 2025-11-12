import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Car, AlertTriangle, Wrench, Shield, TrendingUp, Calendar } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface DashboardStats {
  totalVehicules: number;
  vehiculesActifs: number;
  ctExpiring: number;
  assuranceExpiring: number;
  maintenancesEnCours: number;
  maintenancesPrevues: number;
}

export function ParcDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicules: 0,
    vehiculesActifs: 0,
    ctExpiring: 0,
    assuranceExpiring: 0,
    maintenancesEnCours: 0,
    maintenancesPrevues: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [vehicules, documents, maintenances] = await Promise.all([
        supabase.from('vehicule').select('id, statut'),
        supabase.from('document')
          .select('type, date_expiration')
          .eq('owner_type', 'vehicule')
          .in('type', ['controle_technique', 'assurance']),
        supabase.from('maintenance').select('statut')
      ]);

      const vehiculesData = vehicules.data || [];
      const documentsData = documents.data || [];
      const maintenancesData = maintenances.data || [];

      const ctExpiring = documentsData.filter(d =>
        d.type === 'controle_technique' &&
        new Date(d.date_expiration) <= in30Days &&
        new Date(d.date_expiration) >= today
      ).length;

      const assuranceExpiring = documentsData.filter(d =>
        d.type === 'assurance' &&
        new Date(d.date_expiration) <= in30Days &&
        new Date(d.date_expiration) >= today
      ).length;

      setStats({
        totalVehicules: vehiculesData.length,
        vehiculesActifs: vehiculesData.filter(v => v.statut === 'actif').length,
        ctExpiring,
        assuranceExpiring,
        maintenancesEnCours: maintenancesData.filter(m => m.statut === 'en_cours').length,
        maintenancesPrevues: maintenancesData.filter(m => m.statut === 'planifie').length,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement du tableau de bord..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Parc</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre flotte automobile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Total véhicules</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalVehicules}</p>
            </div>
            <Car className="w-12 h-12 text-blue-600" />
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-green-600">{stats.vehiculesActifs}</span> actifs
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">CT à renouveler</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.ctExpiring}</p>
            </div>
            <Shield className="w-12 h-12 text-orange-600" />
          </div>
          <div className="text-sm text-gray-600">
            Dans les 30 prochains jours
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Assurances à renouveler</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.assuranceExpiring}</p>
            </div>
            <Shield className="w-12 h-12 text-green-600" />
          </div>
          <div className="text-sm text-gray-600">
            Dans les 30 prochains jours
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Maintenances en cours</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.maintenancesEnCours}</p>
            </div>
            <Wrench className="w-12 h-12 text-blue-600" />
          </div>
          <div className="text-sm text-gray-600">
            Interventions actives
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Maintenances prévues</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.maintenancesPrevues}</p>
            </div>
            <Calendar className="w-12 h-12 text-gray-600" />
          </div>
          <div className="text-sm text-gray-600">
            À planifier
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Alertes totales</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {stats.ctExpiring + stats.assuranceExpiring}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <div className="text-sm text-gray-600">
            Actions requises
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Santé du parc
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Véhicules actifs</span>
                <span className="font-medium text-gray-900">
                  {stats.totalVehicules > 0
                    ? Math.round((stats.vehiculesActifs / stats.totalVehicules) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${stats.totalVehicules > 0
                      ? (stats.vehiculesActifs / stats.totalVehicules) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Documents à jour</span>
                <span className="font-medium text-gray-900">
                  {stats.totalVehicules > 0 && (stats.ctExpiring + stats.assuranceExpiring) > 0
                    ? Math.round(((stats.totalVehicules * 2 - (stats.ctExpiring + stats.assuranceExpiring)) / (stats.totalVehicules * 2)) * 100)
                    : 100}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${stats.totalVehicules > 0 && (stats.ctExpiring + stats.assuranceExpiring) > 0
                      ? ((stats.totalVehicules * 2 - (stats.ctExpiring + stats.assuranceExpiring)) / (stats.totalVehicules * 2)) * 100
                      : 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Actions prioritaires
          </h3>
          <div className="space-y-3">
            {stats.ctExpiring > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">CT à renouveler</p>
                    <p className="text-sm text-gray-600">{stats.ctExpiring} véhicule(s) à contrôler</p>
                  </div>
                </div>
              </div>
            )}

            {stats.assuranceExpiring > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Assurances à renouveler</p>
                    <p className="text-sm text-gray-600">{stats.assuranceExpiring} véhicule(s) concerné(s)</p>
                  </div>
                </div>
              </div>
            )}

            {stats.maintenancesEnCours > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Maintenances en cours</p>
                    <p className="text-sm text-gray-600">{stats.maintenancesEnCours} intervention(s) active(s)</p>
                  </div>
                </div>
              </div>
            )}

            {stats.ctExpiring === 0 && stats.assuranceExpiring === 0 && stats.maintenancesEnCours === 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Aucune action requise</p>
                    <p className="text-sm text-gray-600">Tous les documents sont à jour</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
