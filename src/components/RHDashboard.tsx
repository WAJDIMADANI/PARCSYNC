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
  Inbox,
  Database,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

// ─── Interfaces (inchangées) ───────────────────────────────────

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
    salaries_concernes: number;
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
  inbox: {
    total: number;
    non_lus: number;
  };
  vivier: {
    total: number;
    ce_mois: number;
    aujourdhui: number;
  };
}

interface ValidationWithMessages {
  id: string;
  demande_id: string;
  avance_frais_id?: string | null;
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
  avance_montant?: number | null;
  avance_facture?: 'A_FOURNIR' | 'TRANSMIS' | 'RECU' | null;
  avance_facture_path?: string | null;
}

interface RHDashboardProps {
  onNavigate?: (view: string, params?: any) => void;
}

// ─── Composant principal ───────────────────────────────────────

export function RHDashboard({ onNavigate }: RHDashboardProps = {}) {
  const { appUser } = usePermissions();
  const [stats, setStats] = useState<Stats>({
    candidates: { total: 0, nouveau: 0, en_cours: 0, accepte: 0, refuse: 0, recent24h: 0, recent7d: 0 },
    employees: { total: 0, actifs: 0, nouveaux_mois: 0, periode_essai: 0, departs_prevus: 0, documents_manquants: 0 },
    notifications: { total: 0, non_lues: 0, urgentes: 0, documents_expires: 0, titre_sejour: 0, visite_medicale: 0, permis_conduire: 0, contrat_cdd: 0 },
    incidents: { total: 0, ce_mois: 0, salaries_concernes: 0, par_type: [], recents: [], top_employes: [] },
    demandes: { total: 0, en_attente: 0, urgentes: 0 },
    validations: { total: 0, en_attente: 0, urgentes: 0 },
    inbox: { total: 0, non_lus: 0 },
    vivier: { total: 0, ce_mois: 0, aujourdhui: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validationsWithMessages, setValidationsWithMessages] = useState<ValidationWithMessages[]>([]);
  const [selectedValidation, setSelectedValidation] = useState<ValidationWithMessages | null>(null);

  // ─── Data fetching (logique inchangée) ─────────────────────

  useEffect(() => {
    fetchStats();

    const candidatsChannel = supabase
      .channel('candidats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidat' }, () => { fetchCandidatesStats(); })
      .subscribe();
    const profilsChannel = supabase
      .channel('profils-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profil' }, () => { fetchEmployeesStats(); })
      .subscribe();
    const alertesChannel = supabase
      .channel('alertes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerte' }, () => { fetchNotificationsStats(); })
      .subscribe();
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => { fetchNotificationsStats(); })
      .subscribe();
    const incidentsChannel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident' }, () => { fetchNotificationsStats(); })
      .subscribe();
    const validationsChannel = supabase
      .channel('validations-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demande_validation' }, () => { fetchValidationsStats(); fetchValidationsWithMessages(); })
      .subscribe();
    const messagesChannel = supabase
      .channel('messages-validation-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_validation' }, () => { fetchValidationsWithMessages(); })
      .subscribe();
    const tachesChannel = supabase
      .channel('taches-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => { fetchInboxStats(); })
      .subscribe();
    const tachesMessagesChannel = supabase
      .channel('taches-messages-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches_messages' }, () => { fetchInboxStats(); })
      .subscribe();
    const inboxChannel = supabase
      .channel('inbox-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, () => { fetchInboxStats(); })
      .subscribe();
    const demandesExternesChannel = supabase
      .channel('demandes-externes-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes_externes' }, () => { fetchInboxStats(); })
      .subscribe();
    const vivierChannel = supabase
      .channel('vivier-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vivier' }, () => { fetchVivierStats(); })
      .subscribe();

    return () => {
      supabase.removeChannel(candidatsChannel);
      supabase.removeChannel(profilsChannel);
      supabase.removeChannel(alertesChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(validationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(tachesChannel);
      supabase.removeChannel(tachesMessagesChannel);
      supabase.removeChannel(inboxChannel);
      supabase.removeChannel(demandesExternesChannel);
      supabase.removeChannel(vivierChannel);
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    await Promise.all([
      fetchCandidatesStats(), fetchEmployeesStats(), fetchNotificationsStats(),
      fetchIncidentsStats(), fetchDemandesStats(), fetchValidationsStats(),
      fetchValidationsWithMessages(), fetchInboxStats(), fetchVivierStats(),
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const fetchCandidatesStats = async () => {
    try {
      const { data: candidats } = await supabase.from('candidat').select('pipeline, created_at').is('deleted_at', null);
      if (!candidats) return;
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recent24h = candidats.filter((c) => new Date(c.created_at) >= oneDayAgo).length;
      const recent7d = candidats.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length;
      setStats((prev) => ({ ...prev, candidates: { total: candidats.length, nouveau: candidats.filter((c) => c.pipeline === 'nouveau').length, en_cours: candidats.filter((c) => c.pipeline === 'en_cours').length, accepte: candidats.filter((c) => c.pipeline === 'accepte').length, refuse: candidats.filter((c) => c.pipeline === 'refuse').length, recent24h, recent7d } }));
    } catch (error) { console.error('Error fetching candidates stats:', error); }
  };

  const fetchEmployeesStats = async () => {
    try {
      const { data: profils } = await supabase.from('profil').select('statut, date_entree, date_sortie').is('deleted_at', null);
      if (!profils) return;
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = new Date().toISOString().slice(0, 10);
      const actifs = profils.filter((p) => p.statut === 'actif').length;
      const nouveaux_mois = profils.filter((p) => p.statut === 'actif' && p.date_entree && new Date(p.date_entree) >= firstDayOfMonth).length;
      const { count: periode_essai_count } = await supabase.from('profil').select('id', { count: 'exact', head: true }).eq('role', 'salarie').eq('statut', 'actif').is('deleted_at', null).not('date_fin_periode_essai', 'is', null).gte('date_fin_periode_essai', today);
      const periode_essai = periode_essai_count || 0;
      const departs_prevus = profils.filter((p) => p.date_sortie && new Date(p.date_sortie) >= now && new Date(p.date_sortie) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)).length;
      const { data: missingDocs } = await supabase.rpc('get_missing_documents_by_salarie');
      const documents_manquants = missingDocs?.length || 0;
      setStats((prev) => ({ ...prev, employees: { total: profils.length, actifs, nouveaux_mois, periode_essai, departs_prevus, documents_manquants } }));
    } catch (error) { console.error('Error fetching employees stats:', error); }
  };

  const fetchNotificationsStats = async () => {
    try {
      const { data: alertes } = await supabase.from('alerte').select('is_read');
      const { data: documents } = await supabase.from('document').select('date_expiration').not('date_expiration', 'is', null);
      const { data: notifications } = await supabase.from('v_notifications_ui').select('type, statut, date_echeance, profil:profil_id(statut)').in('statut', ['active', 'email_envoye']);
      const non_lues = alertes?.filter((a) => !a.is_read).length || 0;
      const now = new Date();
      const documents_expires = documents?.filter((d) => d.date_expiration && new Date(d.date_expiration) <= now).length || 0;
      const activeNotifications = notifications?.filter(n => {
        if (n.statut === 'resolue' || n.statut === 'ignoree') return false;
        if (n.date_echeance) { return Math.ceil((new Date(n.date_echeance).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) >= 0; }
        return true;
      }) || [];
      const titre_sejour = activeNotifications.filter(n => n.type === 'titre_sejour').length;
      const visite_medicale = activeNotifications.filter(n => n.type === 'visite_medicale').length;
      const permis_conduire = activeNotifications.filter(n => n.type === 'permis_conduire').length;
      const contrat_cdd = activeNotifications.filter(n => n.type === 'cdd').length;
      setStats((prev) => ({ ...prev, notifications: { total: activeNotifications.length, non_lues, urgentes: 0, documents_expires, titre_sejour, visite_medicale, permis_conduire, contrat_cdd } }));
    } catch (error) { console.error('Error fetching notifications stats:', error); }
  };

  const fetchIncidentsStats = async () => {
    try {
      const { count: totalIncidents } = await supabase.from('v_gestion_incidents_source').select('id', { count: 'exact', head: true });
      const { data: allIncidents } = await supabase.from('v_gestion_incidents_source').select('*');
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const ce_mois = (allIncidents || []).filter(i => new Date(i.date_creation_incident || i.created_at) >= firstDayOfMonth).length;
      const salariesConcernes = new Set((allIncidents || []).map(i => i.profil_id)).size;
      if (!totalIncidents || totalIncidents === 0) { setStats((prev) => ({ ...prev, incidents: { total: 0, ce_mois: 0, salaries_concernes: 0, par_type: [], recents: [], top_employes: [] } })); return; }
      const incidents = allIncidents || [];
      const typeCountMap: { [key: string]: number } = { 'Titre de séjour': 0, 'Visite médicale': 0, 'Permis de conduire': 0, 'Contrat CDD expiré': 0, 'Avenant expiré': 0 };
      incidents.forEach((i: any) => {
        if (i.type === 'titre_sejour') typeCountMap['Titre de séjour']++;
        else if (i.type === 'visite_medicale') typeCountMap['Visite médicale']++;
        else if (i.type === 'permis_conduire') typeCountMap['Permis de conduire']++;
        else if (i.type === 'contrat_expire') { const ct = (i.metadata?.contrat_type || i.contrat?.type || 'cdd').toLowerCase(); if (ct === 'cdd') typeCountMap['Contrat CDD expiré']++; else if (ct === 'avenant') typeCountMap['Avenant expiré']++; }
      });
      const par_type = Object.entries(typeCountMap).filter(([_, c]) => c > 0).map(([type, count]) => ({ type, count }));
      const employeMap: { [key: string]: { nom: string; prenom: string; count: number } } = {};
      incidents.forEach((i: any) => { if (i.profil_id && i.profil) { const k = i.profil_id; if (!employeMap[k]) employeMap[k] = { nom: i.profil.nom || '', prenom: i.profil.prenom || '', count: 0 }; employeMap[k].count++; } });
      const top_employes = Object.values(employeMap).sort((a, b) => b.count - a.count).slice(0, 5);
      const recents = incidents.sort((a, b) => new Date(b.created_at || b.date_creation_incident || 0).getTime() - new Date(a.created_at || a.date_creation_incident || 0).getTime()).slice(0, 5);
      setStats((prev) => ({ ...prev, incidents: { total: totalIncidents || 0, ce_mois, salaries_concernes: salariesConcernes, par_type, recents, top_employes } }));
    } catch (error) { console.error('Error fetching incidents stats:', error); }
  };

  const fetchDemandesStats = async () => {
    try {
      const { data: demandes } = await supabase.from('demande_standard').select('statut, priorite');
      if (!demandes) { setStats((prev) => ({ ...prev, demandes: { total: 0, en_attente: 0, urgentes: 0 } })); return; }
      setStats((prev) => ({ ...prev, demandes: { total: demandes.length, en_attente: demandes.filter((d) => d.statut === 'en_attente').length, urgentes: demandes.filter((d) => d.statut === 'en_attente' && d.priorite === 'urgente').length } }));
    } catch (error) { console.error('Error fetching demandes stats:', error); }
  };

  const fetchValidationsStats = async () => {
    try {
      const { data: validations } = await supabase.from('demande_validation').select('statut, priorite');
      if (!validations) { setStats((prev) => ({ ...prev, validations: { total: 0, en_attente: 0, urgentes: 0 } })); return; }
      setStats((prev) => ({ ...prev, validations: { total: validations.length, en_attente: validations.filter((v) => v.statut === 'en_attente').length, urgentes: validations.filter((v) => v.statut === 'en_attente' && v.priorite === 'urgente').length } }));
    } catch (error) { console.error('Error fetching validations stats:', error); }
  };

  const fetchInboxStats = async () => {
    if (!appUser) return;
    try {
      const { data: taches } = await supabase.from('taches').select('*').or(`assignee_id.eq.${appUser.id},expediteur_id.eq.${appUser.id}`);
      const { data: inboxData } = await supabase.from('inbox').select('*');
      const total = (taches?.length || 0) + (inboxData?.length || 0);
      const nonLusTaches = (taches || []).filter((t: any) => (t.assignee_id === appUser.id && !t.lu_par_assignee) || (t.expediteur_id === appUser.id && !t.lu_par_expediteur)).length;
      const nonLusDemandes = (inboxData || []).filter((d: any) => !d.lu).length;
      setStats((prev) => ({ ...prev, inbox: { total, non_lus: nonLusTaches + nonLusDemandes } }));
    } catch (error) { console.error('Error fetching inbox stats:', error); }
  };

  const fetchVivierStats = async () => {
    try {
      const { count: totalCount } = await supabase.from('vivier').select('id', { count: 'exact', head: true });
      const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0);
      const { count: thisMonthCount } = await supabase.from('vivier').select('id', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth.toISOString());
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfToday.getDate() + 1);
      const { count: todayCount } = await supabase.from('vivier').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString()).lt('created_at', startOfTomorrow.toISOString());
      setStats((prev) => ({ ...prev, vivier: { total: totalCount || 0, ce_mois: thisMonthCount || 0, aujourdhui: todayCount || 0 } }));
    } catch (error) { console.error('Error fetching vivier stats:', error); setStats((prev) => ({ ...prev, vivier: { total: 0, ce_mois: 0, aujourdhui: 0 } })); }
  };

  const fetchValidationsWithMessages = async () => {
    if (!appUser) return;
    try {
      const { data: validationsData, error: validationsError } = await supabase.from('demande_validation').select(`*, demande:demande_id (type_demande, description, statut, nom_salarie, prenom_salarie, matricule_salarie, profil:profil_id (nom, prenom, matricule_tca)), demandeur:demandeur_id (email, nom, prenom), validateur:validateur_id (email, nom, prenom)`).eq('statut', 'en_attente').order('created_at', { ascending: false });
      if (validationsError) throw validationsError;
      if (!validationsData || validationsData.length === 0) { setValidationsWithMessages([]); return; }
      const validationsWithUnreadCounts = await Promise.all(validationsData.map(async (validation: any) => {
        const { count } = await supabase.from('message_validation').select('*', { count: 'exact', head: true }).eq('demande_validation_id', validation.id).eq('lu', false).neq('auteur_id', appUser.id);
        return { id: validation.id, demande_id: validation.demande_id, demandeur_id: validation.demandeur_id, validateur_id: validation.validateur_id, type_action: validation.type_action, priorite: validation.priorite, statut: validation.statut, message_demande: validation.message_demande, commentaire_validateur: validation.commentaire_validateur, created_at: validation.created_at, responded_at: validation.responded_at, type_demande: validation.demande?.type_demande || '', demande_description: validation.demande?.description || '', demande_statut: validation.demande?.statut || '', nom_salarie: validation.demande?.salarie?.nom || null, prenom_salarie: validation.demande?.salarie?.prenom || null, matricule_salarie: validation.demande?.salarie?.matricule || null, demandeur_email: validation.demandeur?.email || '', demandeur_nom: validation.demandeur?.nom || '', demandeur_prenom: validation.demandeur?.prenom || '', validateur_email: validation.validateur?.email || null, validateur_nom: validation.validateur?.nom || null, validateur_prenom: validation.validateur?.prenom || null, unread_count: count || 0 };
      }));
      setValidationsWithMessages(validationsWithUnreadCounts.filter(v => v.unread_count > 0));
    } catch (error) { console.error('Error fetching validations with messages:', error); }
  };

  // ─── Helpers ─────────────────────────────────────────────────

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement du tableau de bord..." />
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium capitalize">{dateStr}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Tableau de bord RH</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── KPI Cards — Ligne 1 (4 principales) ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          onClick={() => onNavigate?.('rh/salaries')}
          accent="#00c875"
          icon={<UserCheck className="w-5 h-5" />}
          label="Salariés actifs"
          value={stats.employees.actifs}
          badge={stats.employees.nouveaux_mois > 0 ? `+${stats.employees.nouveaux_mois} ce mois` : undefined}
          badgeColor="green"
          sub={`${stats.employees.periode_essai} en période d'essai`}
        />
        <KpiCard
          onClick={() => onNavigate?.('rh/candidats')}
          accent="#0073ea"
          icon={<Users className="w-5 h-5" />}
          label="Candidatures"
          value={stats.candidates.total}
          badge={stats.candidates.nouveau > 0 ? `${stats.candidates.nouveau} nouveaux` : undefined}
          badgeColor="blue"
          sub={`${stats.candidates.recent24h} aujourd'hui`}
        />
        <KpiCard
          onClick={() => onNavigate?.('rh/incidents')}
          accent="#e44258"
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Incidents"
          value={stats.incidents.total}
          badge={stats.incidents.ce_mois > 0 ? `${stats.incidents.ce_mois} ce mois` : undefined}
          badgeColor="red"
          sub={`${stats.incidents.salaries_concernes} salarié${stats.incidents.salaries_concernes > 1 ? 's' : ''} concerné${stats.incidents.salaries_concernes > 1 ? 's' : ''}`}
        />
        <KpiCard
          onClick={() => onNavigate?.('rh/notifications')}
          accent="#fdab3d"
          icon={<Bell className="w-5 h-5" />}
          label="Notifications"
          value={stats.notifications.total}
          badge={stats.notifications.urgentes > 0 ? `${stats.notifications.urgentes} urgentes` : undefined}
          badgeColor="amber"
          sub={`${stats.notifications.non_lues} non lues`}
        />
      </div>

      {/* ── KPI Cards — Ligne 2 (4 secondaires) ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          onClick={() => onNavigate?.('inbox')}
          accent="#a25ddc"
          icon={<Inbox className="w-5 h-5" />}
          label="Inbox"
          value={stats.inbox.total}
          badge={stats.inbox.non_lus > 0 ? `${stats.inbox.non_lus} non lus` : undefined}
          badgeColor="purple"
          sub={stats.inbox.non_lus > 0 ? 'Messages en attente' : 'Boîte vide'}
          pulse={stats.inbox.non_lus > 0}
        />
        <KpiCard
          onClick={() => onNavigate?.('rh/demandes')}
          accent="#0073ea"
          icon={<Phone className="w-5 h-5" />}
          label="Demandes"
          value={stats.demandes.total}
          badge={stats.demandes.en_attente > 0 ? `${stats.demandes.en_attente} en attente` : undefined}
          badgeColor="blue"
          sub={`${stats.demandes.urgentes} urgentes`}
        />
        <KpiCard
          onClick={() => onNavigate?.('rh/validations')}
          accent="#a25ddc"
          icon={<CheckSquare className="w-5 h-5" />}
          label="Validations"
          value={stats.validations.total}
          badge={stats.validations.en_attente > 0 ? `${stats.validations.en_attente} en attente` : undefined}
          badgeColor="purple"
          sub={`${stats.validations.urgentes} urgentes`}
          pulse={validationsWithMessages.length > 0}
        />
        <KpiCard
          onClick={() => onNavigate?.('rh/vivier')}
          accent="#00c875"
          icon={<Database className="w-5 h-5" />}
          label="Vivier"
          value={stats.vivier.total}
          badge={stats.vivier.ce_mois > 0 ? `+${stats.vivier.ce_mois} ce mois` : undefined}
          badgeColor="green"
          sub={`${stats.vivier.aujourdhui} aujourd'hui`}
        />
      </div>

      {/* ── Validations avec nouveaux messages ──────── */}
      {validationsWithMessages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-blue-500" />
              <h3 className="text-base font-bold text-gray-900">Validations avec nouveaux messages</h3>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                {validationsWithMessages.length}
              </span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {validationsWithMessages.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedValidation(v)}
                className="group text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-all relative"
              >
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full">
                    +{v.unread_count}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">
                  {v.prenom_salarie} {v.nom_salarie}
                </p>
                <p className="text-sm font-bold text-gray-900 mb-2 pr-8">{v.type_demande}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{v.demandeur_prenom} {v.demandeur_nom}</span>
                  <span className="text-gray-300">·</span>
                  <span>{new Date(v.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                {v.priorite === 'urgente' && (
                  <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded">
                    Urgent
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Alerte Documents manquants ──────────────── */}
      {stats.employees.documents_manquants > 0 && (
        <button
          onClick={() => onNavigate?.('rh/documents-manquants')}
          className="w-full text-left group"
        >
          <div className="bg-white rounded-xl border border-red-200 hover:border-red-300 p-5 flex items-center gap-4 transition-all hover:shadow-sm">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Documents manquants</p>
              <p className="text-sm text-gray-500">
                <span className="font-bold text-red-600">{stats.employees.documents_manquants}</span> salarié{stats.employees.documents_manquants > 1 ? 's' : ''} avec documents manquants
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors" />
          </div>
        </button>
      )}

      {/* ── Sections détaillées (grid 2 colonnes) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Répartition candidatures */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-blue-500" />
            <h3 className="text-base font-bold text-gray-900">Répartition des candidatures</h3>
          </div>
          <div className="p-5 space-y-4">
            <BarRow label="Nouveaux" value={stats.candidates.nouveau} total={stats.candidates.total} color="#0073ea" />
            <BarRow label="En cours" value={stats.candidates.en_cours} total={stats.candidates.total} color="#fdab3d" />
            <BarRow label="Acceptés" value={stats.candidates.accepte} total={stats.candidates.total} color="#00c875" />
            <BarRow label="Refusés" value={stats.candidates.refuse} total={stats.candidates.total} color="#e44258" />
          </div>
        </div>

        {/* Informations salariés */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-green-500" />
            <h3 className="text-base font-bold text-gray-900">Informations salariés</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <DataRow icon={<Users className="w-4 h-4 text-gray-400" />} label="Total" value={stats.employees.total} />
            <DataRow icon={<UserCheck className="w-4 h-4 text-green-500" />} label="Actifs" value={stats.employees.actifs} highlight />
            <DataRow icon={<UserPlus className="w-4 h-4 text-blue-500" />} label="Nouveaux ce mois" value={stats.employees.nouveaux_mois} />
            <DataRow icon={<Clock className="w-4 h-4 text-amber-500" />} label="En période d'essai" value={stats.employees.periode_essai} />
            <DataRow icon={<Calendar className="w-4 h-4 text-red-500" />} label="Départs prévus (30j)" value={stats.employees.departs_prevus} alert={stats.employees.departs_prevus > 0} />
          </div>
        </div>

        {/* Incidents par type */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-red-500" />
            <h3 className="text-base font-bold text-gray-900">Incidents par type</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.incidents.par_type.length > 0 ? stats.incidents.par_type.map((item) => (
              <div key={item.type} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-700">{item.type}</span>
                <span className="text-sm font-bold text-white bg-red-500 px-3 py-0.5 rounded-full min-w-[36px] text-center">
                  {item.count}
                </span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Aucun incident enregistré</div>
            )}
          </div>
        </div>

        {/* Top 5 incidents par salarié */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-amber-500" />
            <h3 className="text-base font-bold text-gray-900">Top 5 incidents par salarié</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.incidents.top_employes.length > 0 ? stats.incidents.top_employes.map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700">{emp.prenom} {emp.nom}</span>
                </div>
                <span className="text-sm font-bold text-white bg-amber-500 px-3 py-0.5 rounded-full min-w-[36px] text-center">
                  {emp.count}
                </span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Aucun incident enregistré</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal validation ─────────────────────────── */}
      {selectedValidation && (
        <ValidateRequestModal
          validation={selectedValidation}
          onClose={() => setSelectedValidation(null)}
          onSuccess={() => { setSelectedValidation(null); fetchValidationsStats(); fetchValidationsWithMessages(); }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function KpiCard({ onClick, accent, icon, label, value, badge, badgeColor, sub, pulse }: {
  onClick?: () => void;
  accent: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  badge?: string;
  badgeColor?: 'green' | 'blue' | 'red' | 'amber' | 'purple';
  sub?: string;
  pulse?: boolean;
}) {
  const badgeColors = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left bg-white rounded-xl border border-gray-200 hover:border-gray-300 p-5 transition-all hover:shadow-md overflow-hidden"
    >
      {/* Left accent border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: accent }} />

      {/* Pulse indicator */}
      {pulse && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accent }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: accent }} />
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: `${accent}15`, color: accent }}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {badge && (
          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${badgeColors[badgeColor || 'blue']}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Hover arrow */}
      <ArrowUpRight
        className="absolute bottom-3 right-3 w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </button>
  );
}

function BarRow({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DataRow({ icon, label, value, highlight, alert }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className={`text-sm font-bold tabular-nums ${alert ? 'text-red-600' : highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}