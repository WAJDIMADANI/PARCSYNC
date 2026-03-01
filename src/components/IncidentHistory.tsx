import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, Calendar, User, FileText, Download, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface HistoryEntry {
  id: string;
  incident_id: string;
  action: string;
  ancien_statut: string | null;
  nouveau_statut: string | null;
  ancienne_date: string | null;
  nouvelle_date: string | null;
  notes: string | null;
  created_at: string;
  incident?: {
    type: string;
    profil_id: string;
    profil?: {
      prenom: string;
      nom: string;
    };
  };
}

interface Stats {
  total_incidents: number;
  incidents_resolus: number;
  incidents_en_cours: number;
  temps_moyen_resolution: number;
  par_type: { type: string; count: number }[];
}

interface IncidentHistoryProps {
  onViewProfile?: (profilId: string, returnParams?: any) => void;
  viewParams?: any;
}

export function IncidentHistory({ onViewProfile, viewParams }: IncidentHistoryProps = {}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_historique')
        .select(`
          *,
          incident:incident_id (
            type,
            profil_id,
            profil:profil_id (
              prenom,
              nom
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: incidents, error } = await supabase
        .from('incident')
        .select('*');

      if (error) throw error;

      const total = incidents?.length || 0;
      const resolus = incidents?.filter(i => i.statut === 'resolu').length || 0;
      const enCours = incidents?.filter(i => i.statut === 'en_cours').length || 0;

      const resolvedIncidents = incidents?.filter(i => i.statut === 'resolu' && i.date_resolution && i.date_creation_incident) || [];
      let tempsTotal = 0;
      resolvedIncidents.forEach(i => {
        const created = new Date(i.date_creation_incident);
        const resolved = new Date(i.date_resolution);
        const diff = Math.ceil((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        tempsTotal += diff;
      });
      const tempsMoyen = resolvedIncidents.length > 0 ? Math.round(tempsTotal / resolvedIncidents.length) : 0;

      const typeCount: { [key: string]: number } = {};
      incidents?.forEach(i => {
        typeCount[i.type] = (typeCount[i.type] || 0) + 1;
      });

      const parType = Object.entries(typeCount).map(([type, count]) => ({ type, count }));

      setStats({
        total_incidents: total,
        incidents_resolus: resolus,
        incidents_en_cours: enCours,
        temps_moyen_resolution: tempsMoyen,
        par_type: parType
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'creation': return 'Création';
      case 'changement_statut': return 'Changement de statut';
      case 'resolution': return 'Résolution';
      case 'mise_a_jour': return 'Mise à jour';
      case 'email_envoye': return 'Email envoyé';
      default: return action;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'titre_sejour': return 'Titre de séjour';
      case 'visite_medicale': return 'Visite médicale';
      case 'permis_conduire': return 'Permis de conduire';
      case 'contrat_cdd': return 'Contrat CDD';
      default: return type;
    }
  };

  const handleViewProfile = (profilId: string) => {
    if (onViewProfile) {
      onViewProfile(profilId);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'creation': return 'bg-blue-100 text-blue-800';
      case 'changement_statut': return 'bg-orange-100 text-orange-800';
      case 'resolution': return 'bg-green-100 text-green-800';
      case 'mise_a_jour': return 'bg-purple-100 text-purple-800';
      case 'email_envoye': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Action', 'Type de document', 'Employé', 'Ancien statut', 'Nouveau statut', 'Ancienne date', 'Nouvelle date', 'Notes'];
    const rows = filteredHistory.map(entry => [
      new Date(entry.created_at).toLocaleDateString('fr-FR'),
      getActionLabel(entry.action),
      getTypeLabel(entry.incident?.type || ''),
      `${entry.incident?.profil?.prenom || ''} ${entry.incident?.profil?.nom || ''}`,
      entry.ancien_statut || '',
      entry.nouveau_statut || '',
      entry.ancienne_date ? new Date(entry.ancienne_date).toLocaleDateString('fr-FR') : '',
      entry.nouvelle_date ? new Date(entry.nouvelle_date).toLocaleDateString('fr-FR') : '',
      entry.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_incidents_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredHistory = history.filter(entry => {
    if (filterType !== 'all' && entry.incident?.type !== filterType) return false;
    if (filterAction !== 'all' && entry.action !== filterAction) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nom = `${entry.incident?.profil?.prenom} ${entry.incident?.profil?.nom}`.toLowerCase();
      if (!nom.includes(search)) return false;
    }

    if (dateFrom) {
      const entryDate = new Date(entry.created_at);
      const fromDate = new Date(dateFrom);
      if (entryDate < fromDate) return false;
    }

    if (dateTo) {
      const entryDate = new Date(entry.created_at);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      if (entryDate > toDate) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement de l'historique..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historique des incidents</h1>
          <p className="text-slate-600 mt-1">Audit complet de toutes les actions</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-900">Total incidents</h3>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{stats.total_incidents}</p>
            <p className="text-xs text-blue-700 mt-1">Depuis le début</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-900">Résolus</h3>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">{stats.incidents_resolus}</p>
            <p className="text-xs text-green-700 mt-1">
              {stats.total_incidents > 0 ? Math.round((stats.incidents_resolus / stats.total_incidents) * 100) : 0}% du total
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-orange-900">En cours</h3>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-900">{stats.incidents_en_cours}</p>
            <p className="text-xs text-orange-700 mt-1">En traitement</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-900">Temps moyen</h3>
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900">{stats.temps_moyen_resolution}</p>
            <p className="text-xs text-purple-700 mt-1">Jours pour résolution</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Filtres</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            <option value="titre_sejour">Titre de séjour</option>
            <option value="visite_medicale">Visite médicale</option>
            <option value="permis_conduire">Permis de conduire</option>
            <option value="contrat_cdd">Contrat CDD</option>
          </select>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toutes les actions</option>
            <option value="creation">Création</option>
            <option value="changement_statut">Changement statut</option>
            <option value="resolution">Résolution</option>
            <option value="mise_a_jour">Mise à jour</option>
            <option value="email_envoye">Email envoyé</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Date début"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Date fin"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employé</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Changement</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Aucune entrée d'historique trouvée</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleTimeString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(entry.action)}`}>
                        {getActionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTypeLabel(entry.incident?.type || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.incident?.profil?.prenom} {entry.incident?.profil?.nom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.ancien_statut && entry.nouveau_statut && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{entry.ancien_statut}</span>
                          <span>→</span>
                          <span className="font-semibold">{entry.nouveau_statut}</span>
                        </div>
                      )}
                      {entry.ancienne_date && entry.nouvelle_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">{new Date(entry.ancienne_date).toLocaleDateString('fr-FR')}</span>
                          <span>→</span>
                          <span className="font-semibold text-green-600">{new Date(entry.nouvelle_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.incident?.profil_id && (
                        <button
                          onClick={() => handleViewProfile(entry.incident!.profil_id)}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Voir le profil du salarié"
                        >
                          <User className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
