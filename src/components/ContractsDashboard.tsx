import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Users, TrendingUp, Calendar, AlertTriangle, CheckCircle, Clock, FileCheck } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ContractsList } from './ContractsList';
import { AlertsList } from './AlertsList';

interface ContractStats {
  total: number;
  enAttenteSignature: number;
  signes: number;
  actifs: number;
  expires: number;
  refuses: number;
  cdi: number;
  cdd: number;
  avenants: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

export function ContractsDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'liste' | 'alertes'>('stats');
  const [stats, setStats] = useState<ContractStats>({
    total: 0,
    enAttenteSignature: 0,
    signes: 0,
    actifs: 0,
    expires: 0,
    refuses: 0,
    cdi: 0,
    cdd: 0,
    avenants: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { data: contracts, error } = await supabase
        .from('contrat')
        .select(`
          id,
          statut,
          date_envoi,
          modele:modele_id(type_contrat)
        `);

      if (error) throw error;

      const statsData: ContractStats = {
        total: contracts?.length || 0,
        enAttenteSignature: 0,
        signes: 0,
        actifs: 0,
        expires: 0,
        refuses: 0,
        cdi: 0,
        cdd: 0,
        avenants: 0,
      };

      contracts?.forEach(contract => {
        switch (contract.statut) {
          case 'en_attente_signature':
            statsData.enAttenteSignature++;
            break;
          case 'signe':
            statsData.signes++;
            break;
          case 'actif':
            statsData.actifs++;
            break;
          case 'expire':
            statsData.expires++;
            break;
          case 'refuse':
            statsData.refuses++;
            break;
        }

        if (contract.modele?.type_contrat === 'CDI') {
          statsData.cdi++;
        } else if (contract.modele?.type_contrat === 'CDD') {
          statsData.cdd++;
        } else if (contract.modele?.type_contrat === 'Avenant') {
          statsData.avenants++;
        }
      });

      setStats(statsData);

      const monthlyMap = new Map<string, number>();
      contracts?.forEach(contract => {
        if (contract.date_envoi) {
          const date = new Date(contract.date_envoi);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
        }
      });

      const sortedMonthly = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, count]) => {
          const [year, monthNum] = month.split('-');
          const date = new Date(parseInt(year), parseInt(monthNum) - 1);
          return {
            month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
            count
          };
        });

      setMonthlyData(sortedMonthly);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    color,
    bgColor
  }: {
    icon: any;
    title: string;
    value: number;
    color: string;
    bgColor: string;
  }) => (
    <div className={`${bgColor} rounded-xl shadow-lg p-6 border-2 border-${color}-200 hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
        </div>
        <div className={`p-4 bg-${color}-100 rounded-xl`}>
          <Icon className={`w-8 h-8 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion de Contrats</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble et suivi des contrats</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'stats'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Statistiques
          </div>
        </button>
        <button
          onClick={() => setActiveTab('liste')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'liste'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liste des contrats
          </div>
        </button>
        <button
          onClick={() => setActiveTab('alertes')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'alertes'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertes
          </div>
        </button>
      </div>

      {activeTab === 'stats' && (
        <>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" text="Chargement des statistiques..." />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={FileText}
                  title="Total de contrats"
                  value={stats.total}
                  color="blue"
                  bgColor="bg-blue-50"
                />
                <StatCard
                  icon={Clock}
                  title="En attente signature"
                  value={stats.enAttenteSignature}
                  color="amber"
                  bgColor="bg-amber-50"
                />
                <StatCard
                  icon={CheckCircle}
                  title="Contrats signés"
                  value={stats.signes}
                  color="green"
                  bgColor="bg-green-50"
                />
                <StatCard
                  icon={Users}
                  title="Contrats actifs"
                  value={stats.actifs}
                  color="teal"
                  bgColor="bg-teal-50"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    Répartition par type de contrat
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">CDI</p>
                          <p className="text-sm text-gray-600">Contrats à durée indéterminée</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{stats.cdi}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">CDD</p>
                          <p className="text-sm text-gray-600">Contrats à durée déterminée</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-orange-600">{stats.cdd}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Avenants</p>
                          <p className="text-sm text-gray-600">Modifications de contrats</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{stats.avenants}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    Statuts des contrats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">En attente signature</span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
                        {stats.enAttenteSignature}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Signés</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                        {stats.signes}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Actifs</span>
                      <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-bold">
                        {stats.actifs}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Refusés</span>
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-sm font-bold">
                        {stats.refuses}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Expirés</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-bold">
                        {stats.expires}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {monthlyData.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Évolution des contrats (6 derniers mois)
                  </h3>
                  <div className="flex items-end justify-between gap-4 h-64">
                    {monthlyData.map((data, index) => {
                      const maxCount = Math.max(...monthlyData.map(d => d.count));
                      const heightPercent = (data.count / maxCount) * 100;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-sm font-bold text-blue-600">{data.count}</span>
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500"
                            style={{ height: `${heightPercent}%`, minHeight: '20px' }}
                          />
                          <span className="text-xs font-medium text-gray-600 text-center">{data.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'liste' && <ContractsList />}

      {activeTab === 'alertes' && <AlertsList onVivierClick={() => {}} />}
    </div>
  );
}
