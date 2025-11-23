import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  X,
  Search,
  PlayCircle,
  XCircle,
  User,
  Mail
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ResolveIncidentModal } from './ResolveIncidentModal';

interface Incident {
  id: string;
  type: 'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd';
  profil_id: string;
  date_expiration_originale: string;
  date_creation_incident: string;
  statut: 'actif' | 'en_cours' | 'resolu' | 'ignore';
  date_resolution: string | null;
  nouvelle_date_validite: string | null;
  notes: string | null;
  metadata: any;
  profil?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'actif' | 'en_cours' | 'resolu' | 'ignore'>('actif');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();

    const channel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incident')
        .select(`
          *,
          profil:profil_id (
            prenom,
            nom,
            email
          )
        `)
        .order('date_expiration_originale', { ascending: true });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTabCount = (tab: string) => {
    return incidents.filter(i => i.statut === tab).length;
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'titre_sejour': return <CreditCard className="w-5 h-5" />;
      case 'visite_medicale': return <FileText className="w-5 h-5" />;
      case 'permis_conduire': return <CreditCard className="w-5 h-5" />;
      case 'contrat_cdd': return <Calendar className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getDaysSinceExpiration = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - expDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days: number) => {
    if (days > 30) return 'border-red-600 bg-red-50';
    if (days > 7) return 'border-orange-500 bg-orange-50';
    return 'border-yellow-500 bg-yellow-50';
  };

  const getUrgencyBadge = (days: number) => {
    if (days > 30) return { text: 'CRITIQUE', color: 'bg-red-600 text-white' };
    if (days > 7) return { text: 'URGENT', color: 'bg-orange-600 text-white' };
    return { text: 'RÉCENT', color: 'bg-yellow-600 text-white' };
  };

  const handleChangeStatus = async (incidentId: string, newStatus: 'en_cours' | 'ignore') => {
    setChangingStatus(incidentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('change_incident_status', {
        p_incident_id: incidentId,
        p_nouveau_statut: newStatus,
        p_notes: newStatus === 'en_cours' ? 'Traitement en cours' : 'Incident ignoré',
        p_user_id: user?.id
      });

      if (error) throw error;

      await fetchIncidents();
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Erreur lors du changement de statut');
    } finally {
      setChangingStatus(null);
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (incident.statut !== activeTab) return false;

    if (filterType !== 'all' && incident.type !== filterType) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nom = `${incident.profil?.prenom} ${incident.profil?.nom}`.toLowerCase();
      const email = incident.profil?.email?.toLowerCase() || '';
      if (!nom.includes(search) && !email.includes(search)) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement des incidents..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des incidents</h1>
          <p className="text-slate-600 mt-1">Documents expirés et leur suivi</p>
        </div>
        <button
          onClick={fetchIncidents}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Clock className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('actif')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'actif'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          Actifs
          {getTabCount('actif') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'actif' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'
            }`}>
              {getTabCount('actif')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('en_cours')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'en_cours'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <PlayCircle className="w-5 h-5" />
          En cours
          {getTabCount('en_cours') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'en_cours' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {getTabCount('en_cours')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('resolu')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'resolu'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          Résolus
          {getTabCount('resolu') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'resolu' ? 'bg-white text-green-600' : 'bg-green-100 text-green-600'
            }`}>
              {getTabCount('resolu')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ignore')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'ignore'
              ? 'bg-gray-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <XCircle className="w-5 h-5" />
          Ignorés
          {getTabCount('ignore') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'ignore' ? 'bg-white text-gray-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {getTabCount('ignore')}
            </span>
          )}
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
      </div>

      {filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun incident</h3>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'all'
              ? 'Aucun incident ne correspond à vos critères de recherche'
              : `Aucun incident avec le statut "${activeTab}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const daysSince = getDaysSinceExpiration(incident.date_expiration_originale);
            const urgencyBadge = getUrgencyBadge(daysSince);

            return (
              <div
                key={incident.id}
                className={`bg-white rounded-lg border-2 p-5 transition-all hover:shadow-lg ${
                  activeTab !== 'resolu' ? getUrgencyColor(daysSince) : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        activeTab === 'resolu' ? 'bg-green-200' :
                        daysSince > 30 ? 'bg-red-200' :
                        daysSince > 7 ? 'bg-orange-200' : 'bg-yellow-200'
                      }`}>
                        {getTypeIcon(incident.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900">
                            {incident.profil?.prenom} {incident.profil?.nom}
                          </h3>
                          {activeTab !== 'resolu' && (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${urgencyBadge.color}`}>
                              {urgencyBadge.text}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{incident.profil?.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{getTypeLabel(incident.type)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-14 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">
                          Expiré le: {new Date(incident.date_expiration_originale).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {activeTab !== 'resolu' && (
                        <div className="px-3 py-1 rounded-full bg-red-600 text-white font-bold">
                          {daysSince} jour{daysSince > 1 ? 's' : ''} depuis expiration
                        </div>
                      )}
                      {incident.statut === 'resolu' && incident.nouvelle_date_validite && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span>Résolu le {new Date(incident.date_resolution!).toLocaleDateString('fr-FR')}</span>
                          <span className="mx-2">→</span>
                          <span>Nouveau: {new Date(incident.nouvelle_date_validite).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>

                    {incident.notes && (
                      <div className="ml-14 mt-2 text-sm text-gray-600 italic">
                        Note: {incident.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {activeTab === 'actif' && (
                      <>
                        <button
                          onClick={() => handleChangeStatus(incident.id, 'en_cours')}
                          disabled={changingStatus === incident.id}
                          className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                        >
                          <PlayCircle className="w-4 h-4" />
                          En cours
                        </button>
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Résoudre
                        </button>
                        <button
                          onClick={() => handleChangeStatus(incident.id, 'ignore')}
                          disabled={changingStatus === incident.id}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Ignorer
                        </button>
                      </>
                    )}
                    {activeTab === 'en_cours' && (
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Résoudre
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedIncident && (
        <ResolveIncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdate={fetchIncidents}
        />
      )}
    </div>
  );
}
