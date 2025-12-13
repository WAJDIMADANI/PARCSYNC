import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { ValidateRequestModal } from './ValidateRequestModal';
import { usePermissions } from '../contexts/PermissionsContext';
import {
  Users,
  UserCheck,
  UserPlus,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Bell,
  Phone,
  CheckSquare,
  MessageSquare,
  User,
} from 'lucide-react';

interface Stats {
  candidates: {
    total: number;
    nouveau: number;
    en_cours: number;
    accepte: number;
    refuse: number;
    recent24h: number;
    recent7d: number;
  };
  employees: {
    total: number;
    actifs: number;
    nouveaux_mois: number;
    periode_essai: number;
    departs_prevus: number;
    documents_manquants: number;
  };
  notifications: {
    total: number;
    non_lues: number;
    urgentes: number;
    documents_expires: number;
    titre_sejour: number;
    visite_medicale: number;
    permis_conduire: number;
    contrat_cdd: number;
  };
  incidents: {
    total: number;
    ce_mois: number;
    par_type: { type: string; count: number }[];
    recents: any[];
    top_employes: { nom: string; prenom: string; count: number }[];
  };
  demandes: {
    total: number;
    en_attente: number;
    urgentes: number;
  };
  validations: {
    total: number;
    en_attente: number;
    urgentes: number;
  };
}

interface ValidationWithMessages {
  id: string;
  demande_id: string;
  demandeur_id: string;
  validateur_id: string;
  type_action: string;
  priorite: 'normale' | 'urgente';
  statut: 'en_attente' | 'approuvee' | 'rejetee' | 'transferee';
  message_demande: string;
  commentaire_validateur: string | null;
  created_at: string;
  responded_at: string | null;
  type_demande: string;
  demande_description: string;
  demande_statut: string;
  nom_salarie: string | null;
  prenom_salarie: string | null;
  matricule_salarie: string | null;
  demandeur_email: string;
  demandeur_nom: string;
  demandeur_prenom: string;
  validateur_email: string | null;
  validateur_nom: string | null;
  validateur_prenom: string | null;
  unread_count: number;
}

interface RHDashboardProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function RHDashboard({ onNavigate }: RHDashboardProps = {}) {
  const { appUser } = usePermissions();
  const [stats, setStats] = useState<Stats>({
    candidates: {
      total: 0,
      nouveau: 0,
      en_cours: 0,
      accepte: 0,
      refuse: 0,
      recent24h: 0,
      recent7d: 0,
    },
    employees: {
      total: 0,
      actifs: 0,
      nouveaux_mois: 0,
      periode_essai: 0,
      departs_prevus: 0,
      documents_manquants: 0,
    },
    notifications: {
      total: 0,
      non_lues: 0,
      urgentes: 0,
      documents_expires: 0,
      titre_sejour: 0,
      visite_medicale: 0,
      permis_conduire: 0,
      contrat_cdd: 0,
    },
    incidents: {
      total: 0,
      ce_mois: 0,
      par_type: [],
      recents: [],
      top_employes: [],
    },
    demandes: {
      total: 0,
      en_attente: 0,
      urgentes: 0,
    },
    validations: {
      total: 0,
      en_attente: 0,
      urgentes: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [validationsWithMessages, setValidationsWithMessages] = useState<ValidationWithMessages[]>([]);
  const [selectedValidation, setSelectedValidation] = useState<ValidationWithMessages | null>(null);

  useEffect(() => {
    fetchStats();

    const candidatsChannel = supabase
      .channel('candidats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidat' }, () => {
        fetchCandidatesStats();
      })
      .subscribe();

    const profilsChannel = supabase
      .channel('profils-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profil' }, () => {
        fetchEmployeesStats();
      })
      .subscribe();

    const alertesChannel = supabase
      .channel('alertes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerte' }, () => {
        fetchNotificationsStats();
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => {
        fetchNotificationsStats();
      })
      .subscribe();

    const validationsChannel = supabase
      .channel('validations-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demande_validation' }, () => {
        fetchValidationsStats();
        fetchValidationsWithMessages();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-validation-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_validation' }, () => {
        fetchValidationsWithMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(candidatsChannel);
      supabase.removeChannel(profilsChannel);
      supabase.removeChannel(alertesChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(validationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    await Promise.all([
      fetchCandidatesStats(),
      fetchEmployeesStats(),
      fetchNotificationsStats(),
      fetchIncidentsStats(),
      fetchDemandesStats(),
      fetchValidationsStats(),
      fetchValidationsWithMessages(),
    ]);
    setLoading(false);
  };

  const fetchCandidatesStats = async () => {
    try {
      const { data: candidats } = await supabase
        .from('candidat')
        .select('pipeline, created_at')
        .is('deleted_at', null);

      if (!candidats) return;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recent24h = candidats.filter(
        (c) => new Date(c.created_at) >= oneDayAgo
      ).length;
      const recent7d = candidats.filter(
        (c) => new Date(c.created_at) >= sevenDaysAgo
      ).length;

      setStats((prev) => ({
        ...prev,
        candidates: {
          total: candidats.length,
          nouveau: candidats.filter((c) => c.pipeline === 'nouveau').length,
          en_cours: candidats.filter((c) => c.pipeline === 'en_cours').length,
          accepte: candidats.filter((c) => c.pipeline === 'accepte').length,
          refuse: candidats.filter((c) => c.pipeline === 'refuse').length,
          recent24h,
          recent7d,
        },
      }));
    } catch (error) {
      console.error('Error fetching candidates stats:', error);
    }
  };

  const fetchEmployeesStats = async () => {
    try {
      const { data: profils } = await supabase
        .from('profil')
        .select('statut, date_entree, date_sortie');

      if (!profils) return;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const actifs = profils.filter((p) => p.statut === 'actif').length;
      const nouveaux_mois = profils.filter(
        (p) =>
          p.statut === 'actif' &&
          p.date_entree &&
          new Date(p.date_entree) >= firstDayOfMonth
      ).length;
      const periode_essai = profils.filter(
        (p) =>
          p.statut === 'actif' &&
          p.date_entree &&
          new Date(p.date_entree) >= threeMonthsAgo
      ).length;
      const departs_prevus = profils.filter(
        (p) =>
          p.date_sortie &&
          new Date(p.date_sortie) >= now &&
          new Date(p.date_sortie) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      ).length;

      const { data: missingDocs, error: missingDocsError } = await supabase.rpc('get_missing_documents_by_salarie');
      if (missingDocsError) {
        console.error('❌ Erreur get_missing_documents_by_salarie:', missingDocsError);
      }
      console.log('📊 Documents manquants:', missingDocs);
      const documents_manquants = missingDocs?.length || 0;

      setStats((prev) => ({
        ...prev,
        employees: {
          total: profils.length,
          actifs,
          nouveaux_mois,
          periode_essai,
          departs_prevus,
          documents_manquants,
        },
      }));
    } catch (error) {
      console.error('Error fetching employees stats:', error);
    }
  };

  const fetchNotificationsStats = async () => {
    try {
      const { data: alertes } = await supabase
        .from('alerte')
        .select('is_read, priorite');

      const { data: documents } = await supabase
        .from('document')
        .select('date_expiration')
        .not('date_expiration', 'is', null);

      const { data: notifications } = await supabase
        .from('notification')
        .select('type, statut')
        .in('statut', ['active', 'email_envoye']);

      const non_lues = alertes?.filter((a) => !a.is_read).length || 0;
      const urgentes = alertes?.filter((a) => a.priorite === 'haute').length || 0;

      const now = new Date();
      const documents_expires =
        documents?.filter(
          (d) => d.date_expiration && new Date(d.date_expiration) <= now
        ).length || 0;

      const titre_sejour = notifications?.filter(n => n.type === 'titre_sejour').length || 0;
      const visite_medicale = notifications?.filter(n => n.type === 'visite_medicale').length || 0;
      const permis_conduire = notifications?.filter(n => n.type === 'permis_conduire').length || 0;
      const contrat_cdd = notifications?.filter(n => n.type === 'contrat_cdd').length || 0;

      setStats((prev) => ({
        ...prev,
        notifications: {
          total: alertes?.length || 0,
          non_lues,
          urgentes,
          documents_expires,
          titre_sejour,
          visite_medicale,
          permis_conduire,
          contrat_cdd,
        },
      }));
    } catch (error) {
      console.error('Error fetching notifications stats:', error);
    }
  };

  const fetchIncidentsStats = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('v_incidents_stats')
        .select('*')
        .single();

      if (statsError) {
        console.error('Error fetching v_incidents_stats:', statsError);
      }

      const { data: incidents } = await supabase
        .from('incident')
        .select(`
          *,
          profil:profil_id (
            prenom,
            nom,
            email
          ),
          contrat:contrat_id (
            type,
            date_debut,
            date_fin,
            statut
          )
        `)
        .order('date_creation_incident', { ascending: false });

      if (!incidents || !statsData) {
        setStats((prev) => ({
          ...prev,
          incidents: {
            total: statsData?.total_incidents || 0,
            ce_mois: statsData?.incidents_ce_mois || 0,
            par_type: [],
            recents: [],
            top_employes: [],
          },
        }));
        return;
      }

      const typeMap: { [key: string]: number } = {};
      incidents.forEach((i) => {
        if (i.type) {
          typeMap[i.type] = (typeMap[i.type] || 0) + 1;
        }
      });

      const getTypeLabel = (type: string, contrat?: any) => {
        if (type === 'contrat_expire' && contrat) {
          const contratType = contrat.type?.toLowerCase();
          if (contratType === 'cdd') return 'Contrat CDD';
          if (contratType === 'avenant') return 'Avenant au contrat';
          return 'Contrat';
        }

        switch (type) {
          case 'titre_sejour': return 'Titre de séjour';
          case 'visite_medicale': return 'Visite médicale';
          case 'permis_conduire': return 'Permis de conduire';
          case 'contrat_cdd': return 'Contrat CDD';
          case 'contrat_expire': return 'Contrat expiré';
          default: return type;
        }
      };

      const par_type = Object.entries(typeMap).map(([type, count]) => ({
        type: getTypeLabel(type),
        count,
      }));

      const employeMap: { [key: string]: { nom: string; prenom: string; count: number } } = {};
      incidents.forEach((i: any) => {
        if (i.profil_id && i.profil) {
          const key = i.profil_id;
          if (!employeMap[key]) {
            employeMap[key] = {
              nom: i.profil.nom,
              prenom: i.profil.prenom,
              count: 0,
            };
          }
          employeMap[key].count++;
        }
      });

      const top_employes = Object.values(employeMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const activeIncidents = incidents.filter((i) => i.statut === 'actif').slice(0, 5);

      setStats((prev) => ({
        ...prev,
        incidents: {
          total: statsData.total_incidents,
          ce_mois: statsData.incidents_ce_mois,
          par_type,
          recents: activeIncidents,
          top_employes,
        },
      }));
    } catch (error) {
      console.error('Error fetching incidents stats:', error);
    }
  };

  const fetchDemandesStats = async () => {
    try {
      const { data: demandes } = await supabase
        .from('demande_standard')
        .select('statut, priorite');

      if (!demandes) {
        setStats((prev) => ({
          ...prev,
          demandes: {
            total: 0,
            en_attente: 0,
            urgentes: 0,
          },
        }));
        return;
      }

      const en_attente = demandes.filter((d) => d.statut === 'en_attente').length;
      const urgentes = demandes.filter((d) => d.statut === 'en_attente' && d.priorite === 'urgente').length;

      setStats((prev) => ({
        ...prev,
        demandes: {
          total: demandes.length,
          en_attente,
          urgentes,
        },
      }));
    } catch (error) {
      console.error('Error fetching demandes stats:', error);
    }
  };

  const fetchValidationsStats = async () => {
    try {
      const { data: validations } = await supabase
        .from('demande_validation')
        .select('statut, priorite');

      if (!validations) {
        setStats((prev) => ({
          ...prev,
          validations: {
            total: 0,
            en_attente: 0,
            urgentes: 0,
          },
        }));
        return;
      }

      const en_attente = validations.filter((v) => v.statut === 'en_attente').length;
      const urgentes = validations.filter((v) => v.statut === 'en_attente' && v.priorite === 'urgente').length;

      setStats((prev) => ({
        ...prev,
        validations: {
          total: validations.length,
          en_attente,
          urgentes,
        },
      }));
    } catch (error) {
      console.error('Error fetching validations stats:', error);
    }
  };

  const fetchValidationsWithMessages = async () => {
    if (!appUser) return;

    try {
      const { data: validationsData, error: validationsError } = await supabase
        .from('demande_validation')
        .select(`
          *,
          demande:demande_id (
            type_demande,
            description,
            statut,
            salarie:salarie_id (
              nom,
              prenom,
              matricule
            )
          ),
          demandeur:demandeur_id (
            email,
            nom,
            prenom
          ),
          validateur:validateur_id (
            email,
            nom,
            prenom
          )
        `)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false });

      if (validationsError) throw validationsError;

      if (!validationsData || validationsData.length === 0) {
        setValidationsWithMessages([]);
        return;
      }

      const validationsWithUnreadCounts = await Promise.all(
        validationsData.map(async (validation: any) => {
          const { count, error: countError } = await supabase
            .from('message_validation')
            .select('*', { count: 'exact', head: true })
            .eq('demande_validation_id', validation.id)
            .eq('lu', false)
            .neq('auteur_id', appUser.id);

          if (countError) {
            console.error('Error counting unread messages:', countError);
          }

          return {
            id: validation.id,
            demande_id: validation.demande_id,
            demandeur_id: validation.demandeur_id,
            validateur_id: validation.validateur_id,
            type_action: validation.type_action,
            priorite: validation.priorite,
            statut: validation.statut,
            message_demande: validation.message_demande,
            commentaire_validateur: validation.commentaire_validateur,
            created_at: validation.created_at,
            responded_at: validation.responded_at,
            type_demande: validation.demande?.type_demande || '',
            demande_description: validation.demande?.description || '',
            demande_statut: validation.demande?.statut || '',
            nom_salarie: validation.demande?.salarie?.nom || null,
            prenom_salarie: validation.demande?.salarie?.prenom || null,
            matricule_salarie: validation.demande?.salarie?.matricule || null,
            demandeur_email: validation.demandeur?.email || '',
            demandeur_nom: validation.demandeur?.nom || '',
            demandeur_prenom: validation.demandeur?.prenom || '',
            validateur_email: validation.validateur?.email || null,
            validateur_nom: validation.validateur?.nom || null,
            validateur_prenom: validation.validateur?.prenom || null,
            unread_count: count || 0,
          };
        })
      );

      const validationsWithUnread = validationsWithUnreadCounts.filter(v => v.unread_count > 0);
      setValidationsWithMessages(validationsWithUnread);
    } catch (error) {
      console.error('Error fetching validations with messages:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement du tableau de bord RH..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord RH</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble en temps réel</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Clock className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <button
          onClick={() => onNavigate?.('rh/candidats')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<Users className="w-6 h-6" />}
            title="Candidatures"
            value={stats.candidates.total}
            subtitle={`${stats.candidates.nouveau} nouveaux`}
            trend={stats.candidates.recent7d > stats.candidates.recent24h ? 'up' : 'down'}
            trendValue={`${stats.candidates.recent24h} aujourd'hui`}
            color="blue"
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/salaries')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<UserCheck className="w-6 h-6" />}
            title="Salariés Actifs"
            value={stats.employees.actifs}
            subtitle={`${stats.employees.nouveaux_mois} ce mois`}
            trend={stats.employees.nouveaux_mois > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.employees.periode_essai} en période d'essai`}
            color="green"
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/demandes')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<Phone className="w-6 h-6" />}
            title="Demandes"
            value={stats.demandes.total}
            subtitle={`${stats.demandes.en_attente} en attente`}
            trend={stats.demandes.urgentes > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.demandes.urgentes} urgentes`}
            color="blue"
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/notifications')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<Bell className="w-6 h-6" />}
            title="Notifications"
            value={(stats.notifications.titre_sejour || 0) + (stats.notifications.visite_medicale || 0) + (stats.notifications.permis_conduire || 0) + (stats.notifications.contrat_cdd || 0)}
            subtitle={`${stats.notifications.documents_expires} docs expirés`}
            trend={((stats.notifications.titre_sejour || 0) + (stats.notifications.visite_medicale || 0) + (stats.notifications.permis_conduire || 0) + (stats.notifications.contrat_cdd || 0)) > 0 ? 'up' : 'neutral'}
            trendValue={`Documents à renouveler`}
            color="amber"
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/incidents')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Incidents"
            value={stats.incidents.total}
            subtitle={`${stats.incidents.ce_mois} ce mois`}
            trend={stats.incidents.ce_mois > stats.incidents.total / 12 ? 'up' : 'down'}
            trendValue="Voir détails"
            color="red"
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/validations')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<CheckSquare className="w-6 h-6" />}
            title="Validations"
            value={stats.validations.total}
            subtitle={`${stats.validations.en_attente} en attente`}
            trend={stats.validations.urgentes > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.validations.urgentes} urgentes`}
            color="purple"
          />
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
          Documents expirés
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate?.('rh/incidents', { tab: 'titre_sejour' })}
            className="bg-white rounded-lg p-4 border-l-4 border-red-500 hover:shadow-lg hover:scale-105 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Titres de séjour</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.notifications.titre_sejour || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </button>
          <button
            onClick={() => onNavigate?.('rh/incidents', { tab: 'visite_medicale' })}
            className="bg-white rounded-lg p-4 border-l-4 border-green-500 hover:shadow-lg hover:scale-105 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Visites médicales</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.notifications.visite_medicale || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </button>
          <button
            onClick={() => onNavigate?.('rh/incidents', { tab: 'permis_conduire' })}
            className="bg-white rounded-lg p-4 border-l-4 border-orange-500 hover:shadow-lg hover:scale-105 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Permis de conduire</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.notifications.permis_conduire || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </button>
          <button
            onClick={() => onNavigate?.('rh/incidents', { tab: 'contrat_cdd' })}
            className="bg-white rounded-lg p-4 border-l-4 border-red-600 hover:shadow-lg hover:scale-105 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Contrats CDD</p>
                <p className="text-2xl font-bold text-red-700">
                  {stats.notifications.contrat_cdd || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-red-400" />
            </div>
          </button>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Total: <span className="font-bold text-blue-700">{(stats.notifications.titre_sejour || 0) + (stats.notifications.visite_medicale || 0) + (stats.notifications.permis_conduire || 0) + (stats.notifications.contrat_cdd || 0)}</span> notifications actives
          </p>
        </div>
      </div>

      {validationsWithMessages.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            Validations avec nouveaux messages
            <span className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
              {validationsWithMessages.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validationsWithMessages.map((validation) => (
              <button
                key={validation.id}
                onClick={() => setSelectedValidation(validation)}
                className="bg-white rounded-lg p-4 border-l-4 border-blue-500 hover:shadow-lg hover:scale-105 transition-all cursor-pointer text-left relative"
              >
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    +{validation.unread_count}
                  </span>
                </div>
                <div className="pr-10">
                  <p className="text-sm text-gray-600 mb-1 font-medium">
                    {validation.prenom_salarie} {validation.nom_salarie}
                  </p>
                  <p className="text-lg font-bold text-blue-600 mb-2">
                    {validation.type_demande}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-600">
                      {validation.demandeur_prenom} {validation.demandeur_nom}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-600">
                      {new Date(validation.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {validation.priorite === 'urgente' && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Urgent
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Cliquez sur une carte pour voir les messages et répondre
            </p>
          </div>
        </div>
      )}

      {stats.employees.documents_manquants > 0 && (
        <div
          onClick={() => onNavigate?.('rh/documents-manquants')}
          className="bg-gradient-to-br from-red-50 to-red-100/30 rounded-xl shadow-md p-6 border-l-4 border-red-500 cursor-pointer hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-red-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Documents manquants par salarié
              </h3>
              <p className="text-red-700">
                <span className="text-2xl font-bold">{stats.employees.documents_manquants}</span> salarié
                {stats.employees.documents_manquants > 1 ? 's' : ''} avec documents manquants
              </p>
              <p className="text-sm text-red-600 mt-1">
                Cliquez pour voir le détail et contacter les salariés concernés
              </p>
            </div>
            <FileText className="w-12 h-12 text-red-400" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Répartition des candidatures
          </h3>
          <div className="space-y-3">
            <ProgressBar
              label="Nouveaux"
              value={stats.candidates.nouveau}
              total={stats.candidates.total}
              color="blue"
              icon={<Clock className="w-4 h-4" />}
            />
            <ProgressBar
              label="En cours"
              value={stats.candidates.en_cours}
              total={stats.candidates.total}
              color="amber"
              icon={<AlertCircle className="w-4 h-4" />}
            />
            <ProgressBar
              label="Acceptés"
              value={stats.candidates.accepte}
              total={stats.candidates.total}
              color="green"
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <ProgressBar
              label="Refusés"
              value={stats.candidates.refuse}
              total={stats.candidates.total}
              color="red"
              icon={<XCircle className="w-4 h-4" />}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-500" />
            Informations salariés
          </h3>
          <div className="space-y-4">
            <InfoRow
              label="Total"
              value={stats.employees.total.toString()}
              icon={<Users className="w-4 h-4 text-slate-500" />}
            />
            <InfoRow
              label="Actifs"
              value={stats.employees.actifs.toString()}
              icon={<UserCheck className="w-4 h-4 text-green-500" />}
            />
            <InfoRow
              label="Nouveaux ce mois"
              value={stats.employees.nouveaux_mois.toString()}
              icon={<UserPlus className="w-4 h-4 text-blue-500" />}
            />
            <InfoRow
              label="En période d'essai"
              value={stats.employees.periode_essai.toString()}
              icon={<Clock className="w-4 h-4 text-amber-500" />}
            />
            <InfoRow
              label="Départs prévus (30j)"
              value={stats.employees.departs_prevus.toString()}
              icon={<Calendar className="w-4 h-4 text-red-500" />}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Incidents par type
          </h3>
          {stats.incidents.par_type.length > 0 ? (
            <div className="space-y-3">
              {stats.incidents.par_type.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{item.type}</span>
                  <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucun incident enregistré</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Top 5 incidents par salarié
          </h3>
          {stats.incidents.top_employes.length > 0 ? (
            <div className="space-y-3">
              {stats.incidents.top_employes.map((emp, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {emp.prenom} {emp.nom}
                  </span>
                  <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                    {emp.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucun incident enregistré</p>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
        <h3 className="text-xl font-bold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            label="Candidatures"
            count={stats.candidates.nouveau}
            onClick={() => {}}
          />
          <QuickActionButton
            label="Alertes"
            count={stats.notifications.non_lues}
            onClick={() => {}}
          />
          <QuickActionButton
            label="Documents"
            count={stats.notifications.documents_expires}
            onClick={() => {}}
          />
          <QuickActionButton
            label="Départs"
            count={stats.employees.departs_prevus}
            onClick={() => {}}
          />
        </div>
      </div>

      {selectedValidation && (
        <ValidateRequestModal
          validation={selectedValidation}
          onClose={() => setSelectedValidation(null)}
          onSuccess={() => {
            setSelectedValidation(null);
            fetchValidationsStats();
            fetchValidationsWithMessages();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-500',
    green: 'bg-green-500 text-green-500',
    amber: 'bg-amber-500 text-amber-500',
    red: 'bg-red-500 text-red-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-opacity-10 ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
        <p className="text-xs text-slate-400 mt-1">{trendValue}</p>
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color,
  icon,
}: {
  label: string;
  value: number;
  total: number;
  color: 'blue' | 'amber' | 'green' | 'red';
  icon: React.ReactNode;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900">
          {value} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
        {value}
      </span>
    </div>
  );
}

function QuickActionButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 transition-all text-left"
    >
      <p className="text-2xl font-bold mb-1">{count}</p>
      <p className="text-sm opacity-90">{label}</p>
    </button>
  );
}
