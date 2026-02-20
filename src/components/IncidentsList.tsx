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
import { SendReminderModal } from './SendReminderModal';
import { Pagination } from './Pagination';

interface Incident {
  id: string;
  type: 'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd' | 'contrat_expire' | 'avenant_expirer';
  profil_id: string;
  contrat_id?: string;
  date_expiration_originale: string;
  date_creation_incident: string;
  statut: 'actif' | 'en_cours' | 'resolu' | 'ignore' | 'expire';
  date_resolution: string | null;
  nouvelle_date_validite: string | null;
  notes: string | null;
  metadata: any;
  profil?: {
    prenom: string;
    nom: string;
    email: string;
  };
  contrat?: {
    type: string;
    date_debut: string;
    date_fin: string;
    statut: string;
  };
}

interface IncidentsListProps {
  onViewProfile?: (profilId: string) => void;
}

export function IncidentsList({ onViewProfile }: IncidentsListProps = {}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd' | 'avenant_expirer'>('titre_sejour');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [reminderIncident, setReminderIncident] = useState<Incident | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let isInitialLoad = true;

    const loadIncidents = async () => {
      if (isInitialLoad) {
        try {
          await supabase.rpc('detect_and_expire_incidents');
        } catch (error) {
          console.error('Error detecting expired incidents:', error);
        }
        isInitialLoad = false;
      }
      await fetchIncidents();
    };

    loadIncidents();

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
      // Ne plus appeler detect_and_expire_incidents ici pour éviter la boucle infinie

      // 1. Récupérer les CDD expirés depuis la fonction RPC (logique Dashboard)
      const { data: cddData, error: cddError } = await supabase.rpc('get_cdd_expires_for_incidents');

      if (cddError) {
        console.error('❌ Erreur get_cdd_expires:', cddError);
      }

      console.log('📊 CDD expirés depuis RPC:', cddData?.length || 0);

      // 2. Récupérer les avenants expirés depuis la fonction RPC
      const { data: avenantsData, error: avenantsError } = await supabase.rpc('get_avenants_expires');

      if (avenantsError) {
        console.error('❌ Erreur get_avenants_expires:', avenantsError);
      }

      console.log('avenantsData length', avenantsData?.length);
      console.log('📊 Avenants expirés depuis RPC:', avenantsData?.length || 0);

      // Récupérer les autres types d'incidents (titre_sejour, visite_medicale, permis_conduire)
      const { data: autresData, error: autresError } = await supabase
        .from('incident')
        .select(`
          *,
          profil:profil_id (
            prenom,
            nom,
            email,
            statut
          )
        `)
        .neq('type', 'contrat_expire')
        .neq('profil.statut', 'inactif')
        .order('date_expiration_originale', { ascending: true });

      if (autresError) throw autresError;

      // DEBUG: Vérifier les données titre_sejour
      console.log('Données titre_sejour retournées:', autresData?.filter(i => i.type === 'titre_sejour'));
      console.log('Total autres incidents:', autresData?.length);
      console.log('Erreur autresError:', autresError);

      // Transformer les CDD depuis la RPC (logique Dashboard)
      const cddFormatted = (cddData || []).map(cdd => ({
        id: `cdd-${cdd.profil_id}-${cdd.contrat_id}`, // ID généré pour l'affichage
        type: 'contrat_expire' as const,
        profil_id: cdd.profil_id,
        contrat_id: cdd.contrat_id,
        date_expiration_originale: cdd.date_expiration_reelle,
        date_creation_incident: new Date().toISOString(),
        statut: 'actif' as const,
        date_resolution: null,
        nouvelle_date_validite: null,
        notes: null,
        metadata: {
          jours_avant_expiration: cdd.jours_avant_expiration,
          contrat_type: 'cdd'
        },
        profil: {
          nom: cdd.nom,
          prenom: cdd.prenom,
          email: cdd.email,
          matricule_tca: cdd.matricule_tca
        },
        contrat: {
          type: 'cdd',
          date_debut: cdd.contrat_date_debut,
          date_fin: cdd.contrat_date_fin,
          statut: cdd.contrat_statut
        }
      }));

      // Transformer les avenants depuis la RPC
      const avenantsFormatted = (avenantsData || []).map(av => {
        // Calculer jours depuis expiration
        const expDate = new Date(av.date_expiration_reelle);
        const today = new Date();
        const diffTime = today.getTime() - expDate.getTime();
        const joursSinceExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: `avenant-${av.profil_id}`, // ID généré pour l'affichage
          type: 'contrat_expire' as const,
          profil_id: av.profil_id,
          contrat_id: undefined,
          date_expiration_originale: av.date_expiration_reelle,
          date_creation_incident: new Date().toISOString(),
          statut: 'actif' as const,
          date_resolution: null,
          nouvelle_date_validite: null,
          notes: null,
          metadata: {
            jours_depuis_expiration: joursSinceExpiration,
            avenant_1_date_fin: av.avenant_1_date_fin,
            avenant_2_date_fin: av.avenant_2_date_fin,
            contrat_type: 'avenant'
          },
          profil: {
            nom: av.nom,
            prenom: av.prenom,
            email: av.email
          },
          contrat: {
            type: 'avenant',
            date_debut: '',
            date_fin: av.date_expiration_reelle,
            statut: 'expire'
          }
        };
      });

      // Fusionner CDD et avenants
      const contratsFormatted = [...cddFormatted, ...avenantsFormatted];

      // Fusionner les deux listes
      const allIncidents = [...contratsFormatted, ...(autresData || [])];

      // Trier par date d'expiration
      allIncidents.sort((a, b) =>
        new Date(a.date_expiration_originale).getTime() - new Date(b.date_expiration_originale).getTime()
      );

      setIncidents(allIncidents);

      console.log('📊 Compteurs incidents (logique Dashboard):', {
        cdd_expires_depuis_rpc: cddFormatted.length,
        avenant_expires_depuis_vue: avenantsFormatted.length,
        total_contrats_expires: contratsFormatted.length,
        autres_incidents: (autresData || []).length,
        total_tous_incidents: allIncidents.length
      });
    } catch (error) {
      console.error('❌ ERREUR COMPLÈTE:', error);
      console.error('Message:', error?.message);
      console.error('Status:', error?.status);
      console.error('Details:', error?.details);
    } finally {
      setLoading(false);
    }
  };

  const getTabCount = (type: string) => {
    if (type === 'contrat_cdd') {
      return incidents.filter(i =>
        i.type === 'contrat_expire' && i.metadata?.contrat_type?.toLowerCase() === 'cdd'
      ).length;
    }

    if (type === 'avenant_expirer') {
      return incidents.filter(i =>
        i.type === 'contrat_expire' && i.metadata?.contrat_type?.toLowerCase() === 'avenant'
      ).length;
    }

    return incidents.filter(i => i.type === type).length;
  };

  const getTypeLabel = (incident: Incident) => {
    if (incident.type === 'contrat_expire' && incident.metadata?.contrat_type) {
      const contratType = incident.metadata.contrat_type.toLowerCase();
      if (contratType === 'cdd') return 'Contrat CDD';
      if (contratType === 'avenant') return 'Avenant au contrat';
      return 'Contrat';
    }

    switch (incident.type) {
      case 'titre_sejour': return 'Pièce d\'identité';
      case 'visite_medicale': return 'Visite médicale';
      case 'permis_conduire': return 'Permis de conduire';
      case 'contrat_cdd': return 'Contrat CDD';
      case 'contrat_expire': return 'Contrat expiré';
      case 'avenant_expirer': return 'Avenant au contrat';
      default: return incident.type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'titre_sejour': return <CreditCard className="w-5 h-5" />;
      case 'visite_medicale': return <FileText className="w-5 h-5" />;
      case 'permis_conduire': return <CreditCard className="w-5 h-5" />;
      case 'contrat_cdd': return <Calendar className="w-5 h-5" />;
      case 'contrat_expire': return <Calendar className="w-5 h-5" />;
      case 'avenant_expirer': return <Calendar className="w-5 h-5" />;
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

  const handleSendReminder = (incident: Incident) => {
    if (!incident.profil?.email) {
      alert('Impossible d\'envoyer le rappel : email du salarié manquant');
      return;
    }
    setReminderIncident(incident);
  };

  const handleViewProfile = (profilId: string) => {
    if (onViewProfile) {
      onViewProfile(profilId);
    }
  };

  const confirmSendReminder = async () => {
    if (!reminderIncident) return;

    const { data: { user } } = await supabase.auth.getUser();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-incident-manual-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        incident_id: reminderIncident.id,
        profil_id: reminderIncident.profil_id,
        employee_email: reminderIncident.profil?.email,
        employee_name: `${reminderIncident.profil?.prenom} ${reminderIncident.profil?.nom}`,
        document_type: reminderIncident.type,
        expiration_date: reminderIncident.date_expiration_originale,
        user_id: user?.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de l\'envoi du rappel');
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    let matchesTab = false;

    if (activeTab === 'contrat_cdd') {
      matchesTab = incident.type === 'contrat_expire' && incident.metadata?.contrat_type?.toLowerCase() === 'cdd';
    } else if (activeTab === 'avenant_expirer') {
      matchesTab = incident.type === 'contrat_expire' && incident.metadata?.contrat_type?.toLowerCase() === 'avenant';
    } else {
      matchesTab = incident.type === activeTab;
    }

    if (!matchesTab) return false;

    if (filterStatus !== 'all' && incident.statut !== filterStatus) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nom = `${incident.profil?.prenom} ${incident.profil?.nom}`.toLowerCase();
      const email = incident.profil?.email?.toLowerCase() || '';
      if (!nom.includes(search) && !email.includes(search)) return false;
    }

    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterStatus, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + itemsPerPage);

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
          onClick={() => setActiveTab('titre_sejour')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'titre_sejour'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          Pièce d'identité
          {getTabCount('titre_sejour') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'titre_sejour' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {getTabCount('titre_sejour')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('visite_medicale')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'visite_medicale'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          Visite médicale
          {getTabCount('visite_medicale') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'visite_medicale' ? 'bg-white text-green-600' : 'bg-green-100 text-green-600'
            }`}>
              {getTabCount('visite_medicale')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('permis_conduire')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'permis_conduire'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          Permis de conduire
          {getTabCount('permis_conduire') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'permis_conduire' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {getTabCount('permis_conduire')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('contrat_cdd')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'contrat_cdd'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          CDD
          {getTabCount('contrat_cdd') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'contrat_cdd' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'
            }`}>
              {getTabCount('contrat_cdd')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('avenant_expirer')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'avenant_expirer'
              ? 'bg-red-700 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          Avenant
          {getTabCount('avenant_expirer') > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              activeTab === 'avenant_expirer' ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
            }`}>
              {getTabCount('avenant_expirer')}
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolus</option>
          <option value="ignore">Ignorés</option>
          <option value="expire">Expirés</option>
        </select>
      </div>

      {filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun incident</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'Aucun incident ne correspond à vos critères de recherche'
              : `Aucun incident de type "${activeTab === 'titre_sejour' ? 'Pièce d\'identité' :
                  activeTab === 'visite_medicale' ? 'Visite médicale' :
                  activeTab === 'permis_conduire' ? 'Permis de conduire' :
                  activeTab === 'contrat_cdd' ? 'CDD' :
                  activeTab === 'avenant_expirer' ? 'Avenant' : 'Avenant'}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedIncidents.map((incident) => {
            const daysSince = getDaysSinceExpiration(incident.date_expiration_originale);
            const urgencyBadge = getUrgencyBadge(daysSince);

            return (
              <div
                key={incident.id}
                className={`bg-white rounded-lg border-2 p-5 transition-all hover:shadow-lg ${
                  incident.statut === 'expire' ? 'border-red-700 bg-red-50' :
                  incident.statut !== 'resolu' ? getUrgencyColor(daysSince) : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        incident.statut === 'expire' ? 'bg-red-300' :
                        incident.statut === 'resolu' ? 'bg-green-200' :
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
                          {incident.statut === 'expire' && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-700 text-white">
                              EXPIRÉ
                            </span>
                          )}
                          {incident.statut !== 'resolu' && incident.statut !== 'expire' && (
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
                            <span>{getTypeLabel(incident)}</span>
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
                      {incident.statut !== 'resolu' && incident.statut !== 'expire' && (
                        <div className="px-3 py-1 rounded-full bg-red-600 text-white font-bold">
                          {daysSince} jour{daysSince > 1 ? 's' : ''} depuis expiration
                        </div>
                      )}
                      {incident.statut === 'expire' && (
                        <div className="px-3 py-1 rounded-full bg-red-700 text-white font-bold">
                          {['contrat_cdd', 'avenant_expirer', 'contrat_expire'].includes(incident.type)
                            ? 'Contrat expiré - Nécessite une action'
                            : 'Document expiré - Nécessite une action'}
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
                    {incident.statut === 'actif' && (
                      <>
                        <button
                          onClick={() => handleViewProfile(incident.profil_id)}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Voir le profil du salarié"
                        >
                          <User className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSendReminder(incident)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Envoyer un rappel par email"
                        >
                          <Mail className="w-4 h-4" />
                          Rappel
                        </button>
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
                    {incident.statut === 'en_cours' && (
                      <>
                        <button
                          onClick={() => handleViewProfile(incident.profil_id)}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Voir le profil du salarié"
                        >
                          <User className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSendReminder(incident)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Envoyer un rappel par email"
                        >
                          <Mail className="w-4 h-4" />
                          Rappel
                        </button>
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Résoudre
                        </button>
                      </>
                    )}
                    {incident.statut === 'expire' && (
                      <>
                        <button
                          onClick={() => handleViewProfile(incident.profil_id)}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Voir le profil du salarié"
                        >
                          <User className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSendReminder(incident)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Envoyer un rappel par email"
                        >
                          <Mail className="w-4 h-4" />
                          Rappel
                        </button>
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
                    {(incident.statut === 'resolu' || incident.statut === 'ignore') && (
                      <button
                        onClick={() => handleViewProfile(incident.profil_id)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        title="Voir le profil du salarié"
                      >
                        <User className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredIncidents.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredIncidents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {selectedIncident && (
        <ResolveIncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdate={fetchIncidents}
        />
      )}

      {reminderIncident && (
        <SendReminderModal
          employeeName={`${reminderIncident.profil?.prenom} ${reminderIncident.profil?.nom}`}
          employeeEmail={reminderIncident.profil?.email || ''}
          documentType={getTypeLabel(reminderIncident)}
          onConfirm={confirmSendReminder}
          onCancel={() => setReminderIncident(null)}
        />
      )}
    </div>
  );
}
