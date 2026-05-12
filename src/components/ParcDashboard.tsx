import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Car, AlertTriangle, Wrench, Shield, TrendingUp, Calendar, FileText } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface DashboardStats {
  totalVehicules: number;
  vehiculesActifs: number;
  ctExpiring: number;
  ctExpired: number;
  assuranceExpiring: number;
  assuranceExpired: number;
  carteRisExpiring: number;
  carteRisExpired: number;
  maintenancesEnCours: number;
  maintenancesPrevues: number;
}

export function ParcDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicules: 0,
    vehiculesActifs: 0,
    ctExpiring: 0,
    ctExpired: 0,
    assuranceExpiring: 0,
    assuranceExpired: 0,
    carteRisExpiring: 0,
    carteRisExpired: 0,
    maintenancesEnCours: 0,
    maintenancesPrevues: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [vehicules, documentsVehicule, maintenances] = await Promise.all([
        supabase.from('vehicule').select('id, statut'),
        supabase.from('document_vehicule')
          .select('vehicule_id, type_document, date_expiration, actif')
          .eq('actif', true)
          .not('date_expiration', 'is', null)
          .in('type_document', ['controle_technique', 'assurance', 'carte_ris']),
        supabase.from('maintenance').select('statut')
      ]);

      const vehiculesData = vehicules.data || [];
      const vehiculesActifs = vehiculesData.filter(v => v.statut === 'actif');
      const vehiculesActifsIds = new Set(vehiculesActifs.map(v => v.id));
      const documentsData = documentsVehicule.data || [];
      const maintenancesData = maintenances.data || [];

      // Filtrer uniquement les documents des véhicules actifs
      const activeVehicleDocuments = documentsData.filter(d => vehiculesActifsIds.has(d.vehicule_id));

      // CT à renouveler (30 prochains jours) - véhicules distincts
      const ctExpiringVehicles = new Set(
        activeVehicleDocuments
          .filter(d => {
            if (d.type_document !== 'controle_technique' || !d.date_expiration) return false;
            return d.date_expiration >= today && d.date_expiration <= in30Days;
          })
          .map(d => d.vehicule_id)
      );

      // CT expirés - véhicules distincts
      const ctExpiredVehicles = new Set(
        activeVehicleDocuments
          .filter(d => {
            if (d.type_document !== 'controle_technique' || !d.date_expiration) return false;
            return d.date_expiration < today;
          })
          .map(d => d.vehicule_id)
      );

      // Assurance à renouveler (30 prochains jours) - véhicules distincts
      const assuranceExpiringVehicles = new Set(
        activeVehicleDocuments
          .filter(d => {
            if (d.type_document !== 'assurance' || !d.date_expiration) return false;
            return d.date_expiration >= today && d.date_expiration <= in30Days;
          })
          .map(d => d.vehicule_id)
      );

      // Assurance expirées - véhicules distincts
      const assuranceExpiredVehicles = new Set(
        activeVehicleDocuments
          .filter(d => {
            if (d.type_document !== 'assurance' || !d.date_expiration) return false;
            return d.date_expiration < today;
          })
          .map(d => d.vehicule_id)
      );

      // Carte RIS à renouveler (30 prochains jours) - véhicules distincts
      const carteRisExpiringVehicles = new Set(
        activeVehicleDocuments
          .filter(d => {
            if (d.type_document !== 'carte_ris' || !d.date_expiration) return false;
            return d.date_expiration >= today && d.date_expiration <= in30Days;
          })
          .map(d => d.vehicule_id)
      );

      // Carte RIS expirées - véhicules distincts
      const carteRisExpiredVehicles = new Set(
        activeVehicleDocuments
          .filter(d => {
            if (d.type_document !== 'carte_ris' || !d.date_expiration) return false;
            return d.date_expiration < today;
          })
          .map(d => d.vehicule_id)
      );

      setStats({
        totalVehicules: vehiculesData.length,
        vehiculesActifs: vehiculesActifs.length,
        ctExpiring: ctExpiringVehicles.size,
        ctExpired: ctExpiredVehicles.size,
        assuranceExpiring: assuranceExpiringVehicles.size,
        assuranceExpired: assuranceExpiredVehicles.size,
        carteRisExpiring: carteRisExpiringVehicles.size,
        carteRisExpired: carteRisExpiredVehicles.size,
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
            {stats.ctExpired > 0 && (
              <span className="block text-red-600 font-semibold mt-1">
                {stats.ctExpired} expirés
              </span>
            )}
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
            {stats.assuranceExpired > 0 && (
              <span className="block text-red-600 font-semibold mt-1">
                {stats.assuranceExpired} expirés
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Cartes RIS à renouveler</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.carteRisExpiring}</p>
            </div>
            <FileText className="w-12 h-12 text-purple-600" />
          </div>
          <div className="text-sm text-gray-600">
            Dans les 30 prochains jours
            {stats.carteRisExpired > 0 && (
              <span className="block text-red-600 font-semibold mt-1">
                {stats.carteRisExpired} expirés
              </span>
            )}
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
                {stats.ctExpiring + stats.ctExpired + stats.assuranceExpiring + stats.assuranceExpired + stats.carteRisExpiring + stats.carteRisExpired}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <div className="text-sm text-gray-600">
            Actions requises
            <div className="mt-2 space-y-1">
              {(stats.ctExpired + stats.assuranceExpired + stats.carteRisExpired) > 0 && (
                <span className="block text-red-600 font-semibold text-xs">
                  {stats.ctExpired + stats.assuranceExpired + stats.carteRisExpired} documents expirés
                </span>
              )}
            </div>
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
                  {stats.vehiculesActifs > 0
                    ? Math.round(((stats.vehiculesActifs * 3 - (stats.ctExpiring + stats.ctExpired + stats.assuranceExpiring + stats.assuranceExpired + stats.carteRisExpiring + stats.carteRisExpired)) / (stats.vehiculesActifs * 3)) * 100)
                    : 100}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${stats.vehiculesActifs > 0
                      ? ((stats.vehiculesActifs * 3 - (stats.ctExpiring + stats.ctExpired + stats.assuranceExpiring + stats.assuranceExpired + stats.carteRisExpiring + stats.carteRisExpired)) / (stats.vehiculesActifs * 3)) * 100
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
            {stats.ctExpired > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-500">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">CT expirés - URGENT</p>
                    <p className="text-sm text-red-700">{stats.ctExpired} véhicule(s) à contrôler immédiatement</p>
                  </div>
                </div>
              </div>
            )}

            {stats.assuranceExpired > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-500">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Assurances expirées - URGENT</p>
                    <p className="text-sm text-red-700">{stats.assuranceExpired} véhicule(s) à assurer immédiatement</p>
                  </div>
                </div>
              </div>
            )}

            {stats.carteRisExpired > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-500">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Cartes RIS expirées - URGENT</p>
                    <p className="text-sm text-red-700">{stats.carteRisExpired} véhicule(s) concerné(s)</p>
                  </div>
                </div>
              </div>
            )}

            {stats.ctExpiring > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">CT à renouveler</p>
                    <p className="text-sm text-gray-600">{stats.ctExpiring} véhicule(s) à contrôler sous 30 jours</p>
                  </div>
                </div>
              </div>
            )}

            {stats.assuranceExpiring > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Assurances à renouveler</p>
                    <p className="text-sm text-gray-600">{stats.assuranceExpiring} véhicule(s) concerné(s) sous 30 jours</p>
                  </div>
                </div>
              </div>
            )}

            {stats.carteRisExpiring > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Cartes RIS à renouveler</p>
                    <p className="text-sm text-gray-600">{stats.carteRisExpiring} véhicule(s) concerné(s) sous 30 jours</p>
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

            {stats.ctExpiring === 0 && stats.ctExpired === 0 && stats.assuranceExpiring === 0 && stats.assuranceExpired === 0 && stats.carteRisExpiring === 0 && stats.carteRisExpired === 0 && stats.maintenancesEnCours === 0 && (
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
