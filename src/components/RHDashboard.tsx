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
      salaries_concernes: 0,
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
    inbox: {
      total: 0,
      non_lus: 0,
    },
    vivier: {
      total: 0,
      ce_mois: 0,
      aujourdhui: 0,
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

    const incidentsChannel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident' }, () => {
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

    const tachesChannel = supabase
      .channel('taches-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => {
        fetchInboxStats();
      })
      .subscribe();

    const tachesMessagesChannel = supabase
      .channel('taches-messages-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches_messages' }, () => {
        fetchInboxStats();
      })
      .subscribe();

    const inboxChannel = supabase
      .channel('inbox-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, () => {
        fetchInboxStats();
      })
      .subscribe();

    const demandesExternesChannel = supabase
      .channel('demandes-externes-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes_externes' }, () => {
        fetchInboxStats();
      })
      .subscribe();

    const vivierChannel = supabase
      .channel('vivier-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vivier' }, () => {
        fetchVivierStats();
      })
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
      fetchCandidatesStats(),
      fetchEmployeesStats(),
      fetchNotificationsStats(),
      fetchIncidentsStats(),
      fetchDemandesStats(),
      fetchValidationsStats(),
      fetchValidationsWithMessages(),
      fetchInboxStats(),
      fetchVivierStats(),
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
        .select('statut, date_entree, date_sortie')
        .is('deleted_at', null);

      if (!profils) return;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = new Date().toISOString().slice(0, 10);

      const actifs = profils.filter((p) => p.statut === 'actif').length;
      const nouveaux_mois = profils.filter(
        (p) =>
          p.statut === 'actif' &&
          p.date_entree &&
          new Date(p.date_entree) >= firstDayOfMonth
      ).length;

      const { count: periode_essai_count, error: periodeEssaiError } = await supabase
        .from('profil')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'salarie')
        .eq('statut', 'actif')
        .is('deleted_at', null)
        .not('date_fin_periode_essai', 'is', null)
        .gte('date_fin_periode_essai', today);

      if (periodeEssaiError) {
        console.error('Erreur calcul période essai:', periodeEssaiError);
      }
      const periode_essai = periode_essai_count || 0;

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

      // Récupérer toutes les notifications depuis la vue (filtre 30 jours automatique)
      const { data: notifications } = await supabase
        .from('v_notifications_ui')
        .select('type, statut, date_echeance, profil:profil_id(statut)')
        .in('statut', ['active', 'email_envoye']);

      // Récupérer les CDD expirés depuis la fonction RPC
      const { data: cddData } = await supabase.rpc('get_cdd_expires');

      const non_lues = alertes?.filter((a) => !a.is_read).length || 0;
      const urgentes = alertes?.filter((a) => a.priorite === 'haute').length || 0;

      const now = new Date();
      const documents_expires =
        documents?.filter(
          (d) => d.date_expiration && new Date(d.date_expiration) <= now
        ).length || 0;

      // Compter le total en appliquant les mêmes filtres que NotificationsList
      const activeNotifications = notifications?.filter(n => {
        // Exclure resolue et ignoree
        if (n.statut === 'resolue' || n.statut === 'ignoree') return false;

        // Exclure les notifications expirées
        if (n.date_echeance) {
          const daysRemaining = Math.ceil(
            (new Date(n.date_echeance).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysRemaining >= 0; // Seulement non expirés
        }
        return true;
      }) || [];

      // Chercher tous les types dans les notifications actives (pas incident)
      const titre_sejour = activeNotifications.filter(n => n.type === 'titre_sejour').length;
      const visite_medicale = activeNotifications.filter(n => n.type === 'visite_medicale').length;
      const permis_conduire = activeNotifications.filter(n => n.type === 'permis_conduire').length;
      const contrat_cdd = activeNotifications.filter(n => n.type === 'cdd').length;

      setStats((prev) => ({
        ...prev,
        notifications: {
          total: activeNotifications.length,
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
      // RÈGLE MÉTIER : On compte UNIQUEMENT les incidents en statut 'expire'
      // (pour matcher exactement l'onglet "Gestion des incidents")

      // 1. Récupérer TOUS les incidents en statut 'expire' depuis la table incident
      const { data: allIncidents } = await supabase
        .from('incident')
        .select(`
          id,
          type,
          created_at,
          date_creation_incident,
          statut,
          profil_id,
          contrat_id,
          metadata,
          profil:profil_id (
            prenom,
            nom,
            email,
            statut
          ),
          contrat:contrat_id (
            type,
            date_debut,
            date_fin,
            statut
          )
        `)
        .eq('statut', 'expire')
        .neq('profil.statut', 'inactif');

      // 2. Compter le TOTAL d'incidents expirés (count(*) sur incidents)
      const totalIncidents = allIncidents?.length || 0;

      // 3. Compter les incidents de ce mois (date_creation_incident >= premier jour du mois)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const ce_mois = (allIncidents || []).filter(i => {
        const incidentDate = new Date(i.date_creation_incident || i.created_at);
        return incidentDate >= firstDayOfMonth;
      }).length;

      // 4. Compter les salariés distincts concernés (info secondaire)
      const salariesConcernes = new Set((allIncidents || []).map(i => i.profil_id)).size;

      // Log pour debug
      console.log('📊 Dashboard RH - Incidents (statut=expire):', {
        totalIncidents,
        ce_mois,
        salariesConcernes,
        types: {
          titre_sejour: (allIncidents || []).filter(i => i.type === 'titre_sejour').length,
          visite_medicale: (allIncidents || []).filter(i => i.type === 'visite_medicale').length,
          permis_conduire: (allIncidents || []).filter(i => i.type === 'permis_conduire').length,
          contrat_expire: (allIncidents || []).filter(i => i.type === 'contrat_expire').length,
        }
      });

      // 5. Si aucun incident, retourner des stats vides
      if (totalIncidents === 0) {
        setStats((prev) => ({
          ...prev,
          incidents: {
            total: 0,
            ce_mois: 0,
            salaries_concernes: 0,
            par_type: [],
            recents: [],
            top_employes: [],
          },
        }));
        return;
      }

      // 6. Préparer les incidents pour les statistiques détaillées
      const incidents = allIncidents || [];

      // 7. Compter les incidents par type (affichage lisible)
      const typeCountMap: { [key: string]: number } = {
        'Titre de séjour': 0,
        'Visite médicale': 0,
        'Permis de conduire': 0,
        'Contrat CDD expiré': 0,
        'Avenant expiré': 0,
      };

      incidents.forEach((i: any) => {
        if (i.type === 'titre_sejour') {
          typeCountMap['Titre de séjour']++;
        } else if (i.type === 'visite_medicale') {
          typeCountMap['Visite médicale']++;
        } else if (i.type === 'permis_conduire') {
          typeCountMap['Permis de conduire']++;
        } else if (i.type === 'contrat_expire') {
          // Déterminer le type depuis metadata OU depuis le contrat
          const contratTypeFromMetadata = i.metadata?.contrat_type?.toLowerCase();
          const contratTypeFromContrat = i.contrat?.type?.toLowerCase();
          const contratType = contratTypeFromMetadata || contratTypeFromContrat || 'cdd';

          if (contratType === 'cdd') {
            typeCountMap['Contrat CDD expiré']++;
          } else if (contratType === 'avenant') {
            typeCountMap['Avenant expiré']++;
          }
        }
      });

      const par_type = Object.entries(typeCountMap)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({ type, count }));

      // 8. Compter les incidents par employé (top 5)
      const employeMap: { [key: string]: { nom: string; prenom: string; count: number } } = {};
      incidents.forEach((i: any) => {
        if (i.profil_id && i.profil) {
          const key = i.profil_id;
          if (!employeMap[key]) {
            employeMap[key] = {
              nom: i.profil.nom || '',
              prenom: i.profil.prenom || '',
              count: 0,
            };
          }
          employeMap[key].count++;
        }
      });

      const top_employes = Object.values(employeMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 9. Récupérer les 5 incidents les plus récents
      const recents = incidents
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.date_creation_incident || 0);
          const dateB = new Date(b.created_at || b.date_creation_incident || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);

      // 10. Mettre à jour les statistiques
      setStats((prev) => ({
        ...prev,
        incidents: {
          total: totalIncidents,
          ce_mois: ce_mois,
          salaries_concernes: salariesConcernes,
          par_type,
          recents,
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

  const fetchInboxStats = async () => {
    if (!appUser) return;

    try {
      // 1. Récupérer les tâches (même requête que InboxPage)
      const { data: taches } = await supabase
        .from('taches')
        .select('*')
        .or(`assignee_id.eq.${appUser.id},expediteur_id.eq.${appUser.id}`);

      // 2. Récupérer les messages inbox - RLS gère le filtrage par utilisateur
      const { data: inboxData } = await supabase
        .from('inbox')
        .select('*');

      const tachesCount = taches?.length || 0;
      const demandesCount = inboxData?.length || 0;
      const total = tachesCount + demandesCount;

      // Calculer les non lus
      const nonLusTaches = (taches || []).filter((t: any) =>
        (t.assignee_id === appUser.id && !t.lu_par_assignee) ||
        (t.expediteur_id === appUser.id && !t.lu_par_expediteur)
      ).length;
      const nonLusDemandes = (inboxData || []).filter((d: any) => !d.lu).length;
      const non_lus = nonLusTaches + nonLusDemandes;

      console.log('Inbox count', non_lus);
      console.log('📊 Dashboard Inbox:', {
        tachesCount,
        demandesCount,
        total,
        non_lus,
        inboxData: inboxData?.map(d => ({ id: d.id, lu: d.lu, utilisateur_id: d.utilisateur_id })),
        source: 'taches + inbox (RLS)'
      });

      setStats((prev) => ({
        ...prev,
        inbox: { total, non_lus },
      }));
    } catch (error) {
      console.error('Error fetching inbox stats:', error);
    }
  };

  const fetchVivierStats = async () => {
    try {
      // Total des candidats dans le vivier
      const { count: totalCount } = await supabase
        .from('vivier')
        .select('id', { count: 'exact', head: true });

      // Candidats ajoutés ce mois
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { count: thisMonthCount } = await supabase
        .from('vivier')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());

      // Candidats ajoutés aujourd'hui
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfToday.getDate() + 1);

      const { count: todayCount } = await supabase
        .from('vivier')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', startOfTomorrow.toISOString());

      setStats((prev) => ({
        ...prev,
        vivier: {
          total: totalCount || 0,
          ce_mois: thisMonthCount || 0,
          aujourdhui: todayCount || 0,
        },
      }));
    } catch (error) {
      console.error('Error fetching vivier stats:', error);
      setStats((prev) => ({
        ...prev,
        vivier: {
          total: 0,
          ce_mois: 0,
          aujourdhui: 0,
        },
      }));
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
            nom_salarie,
            prenom_salarie,
            matricule_salarie,
            profil:profil_id (
              nom,
              prenom,
              matricule_tca
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
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-full hover:from-orange-600 hover:to-amber-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Clock className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
            hasNotification={stats.demandes.en_attente > 0}
            notificationCount={stats.demandes.en_attente}
          />
        </button>

        <button
          onClick={() => onNavigate?.('inbox')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<Inbox className="w-6 h-6" />}
            title="Inbox"
            value={stats.inbox.total}
            subtitle={stats.inbox.non_lus > 0 ? `${stats.inbox.non_lus} non lus` : 'Aucun message'}
            trend={stats.inbox.non_lus > 0 ? 'up' : 'neutral'}
            trendValue={stats.inbox.non_lus > 0 ? 'Nouveau' : 'Boîte vide'}
            color="purple"
            hasNotification={stats.inbox.non_lus > 0}
            notificationCount={stats.inbox.non_lus}
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/notifications')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<Bell className="w-6 h-6" />}
            title="Notifications"
            value={stats.notifications.total}
            subtitle={`${stats.notifications.non_lues} non lues`}
            trend={stats.notifications.total > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.notifications.urgentes} urgentes`}
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
            subtitle={`${stats.incidents.ce_mois} ce mois • ${stats.incidents.salaries_concernes} salarié${stats.incidents.salaries_concernes > 1 ? 's' : ''}`}
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
            hasNotification={stats.validations.en_attente > 0 || validationsWithMessages.length > 0}
            notificationCount={stats.validations.en_attente > 0 ? stats.validations.en_attente : validationsWithMessages.length}
          />
        </button>

        <button
          onClick={() => onNavigate?.('rh/vivier')}
          className="text-left hover:scale-105 transition-transform"
        >
          <StatCard
            icon={<Database className="w-6 h-6" />}
            title="Vivier"
            value={stats.vivier.total}
            subtitle={`${stats.vivier.ce_mois} ce mois`}
            trend={stats.vivier.aujourdhui > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.vivier.aujourdhui} aujourd'hui`}
            color="blue"
          />
        </button>
      </div>

      {validationsWithMessages.length > 0 && (
        <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 rounded-xl shadow-lg border-2 border-sky-300 p-6 mb-6">
          <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            Validations avec nouveaux messages
            <span className="ml-2 px-4 py-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-sky-600 text-white text-sm font-extrabold rounded-full shadow-lg animate-pulse">
              {validationsWithMessages.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validationsWithMessages.map((validation) => (
              <button
                key={validation.id}
                onClick={() => setSelectedValidation(validation)}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border-l-4 border-sky-500 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer text-left relative shadow-md"
              >
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-extrabold rounded-full animate-pulse shadow-lg ring-2 ring-red-300">
                    +{validation.unread_count}
                  </span>
                </div>
                <div className="pr-12">
                  <p className="text-sm text-gray-600 mb-2 font-bold">
                    {validation.prenom_salarie} {validation.nom_salarie}
                  </p>
                  <p className="text-lg font-extrabold text-sky-600 mb-3">
                    {validation.type_demande}
                  </p>
                  <div className="flex items-center gap-2 mb-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <User className="w-4 h-4 text-gray-500" />
                    <p className="text-xs font-semibold text-gray-700">
                      {validation.demandeur_prenom} {validation.demandeur_nom}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <p className="text-xs font-semibold text-gray-700">
                      {new Date(validation.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {validation.priorite === 'urgente' && (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-md">
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
            <p className="text-sm font-semibold text-gray-700 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
              Cliquez sur une carte pour voir les messages et répondre
            </p>
          </div>
        </div>
      )}

      {stats.employees.documents_manquants > 0 && (
        <div
          onClick={() => onNavigate?.('rh/documents-manquants')}
          className="bg-gradient-to-br from-red-50 via-orange-50 to-red-100 rounded-xl shadow-lg p-6 border-l-4 border-red-500 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-red-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-red-900 flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                Documents manquants par salarié
              </h3>
              <p className="text-red-800 font-bold">
                <span className="text-3xl font-extrabold">{stats.employees.documents_manquants}</span> salarié
                {stats.employees.documents_manquants > 1 ? 's' : ''} avec documents manquants
              </p>
              <p className="text-sm font-semibold text-red-700 mt-2 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-lg inline-block">
                Cliquez pour voir le détail et contacter les salariés concernés
              </p>
            </div>
            <FileText className="w-12 h-12 text-red-400" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 p-6">
          <h3 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
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

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 p-6">
          <h3 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
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

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 p-6">
          <h3 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            Incidents par type
          </h3>
          {stats.incidents.par_type.length > 0 ? (
            <div className="space-y-3">
              {stats.incidents.par_type.map((item) => (
                <div key={item.type} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg hover:shadow-md transition-all">
                  <span className="text-sm font-bold text-gray-700">{item.type}</span>
                  <span className="text-sm font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-600 px-4 py-1.5 rounded-full shadow-md">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucun incident enregistré</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 p-6">
          <h3 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Top 5 incidents par salarié
          </h3>
          {stats.incidents.top_employes.length > 0 ? (
            <div className="space-y-3">
              {stats.incidents.top_employes.map((emp, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg hover:shadow-md transition-all">
                  <span className="text-sm font-bold text-gray-700">
                    {emp.prenom} {emp.nom}
                  </span>
                  <span className="text-sm font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-600 px-4 py-1.5 rounded-full shadow-md">
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

      <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white border-2 border-orange-300">
        <h3 className="text-xl font-extrabold mb-5 flex items-center gap-3">
          <div className="w-2 h-8 bg-white rounded-full"></div>
          Actions rapides
        </h3>
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
  hasNotification,
  notificationCount,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string | React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  hasNotification?: boolean;
  notificationCount?: number;
}) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-sky-500 to-blue-600',
    green: 'bg-gradient-to-br from-emerald-500 to-green-600',
    amber: 'bg-gradient-to-br from-orange-500 to-amber-600',
    red: 'bg-gradient-to-br from-red-500 to-rose-600',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-600',
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 transform hover:scale-105 relative overflow-hidden">
      {hasNotification && notificationCount && notificationCount > 0 && (
        <>
          <div className="absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 opacity-20 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-2 right-2 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-full animate-ping opacity-75" />
              <div className="relative flex items-center justify-center min-w-[28px] h-7 px-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white text-xs font-extrabold rounded-full shadow-lg ring-4 ring-red-200 ring-opacity-50">
                {notificationCount > 99 ? '99+' : notificationCount}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl shadow-lg ${colorClasses[color]} text-white`}>
          {icon}
        </div>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-rose-500" />}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-600 mb-2">{title}</p>
        <p className="text-4xl font-extrabold text-gray-900 mb-3">{value}</p>
        <p className="text-sm font-semibold text-gray-700 mb-1">{subtitle}</p>
        <p className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">{trendValue}</p>
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
    blue: 'bg-gradient-to-r from-sky-500 to-blue-600',
    amber: 'bg-gradient-to-r from-orange-500 to-amber-600',
    green: 'bg-gradient-to-r from-emerald-500 to-green-600',
    red: 'bg-gradient-to-r from-red-500 to-rose-600',
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white rounded-md shadow-sm">
            {icon}
          </div>
          <span className="text-sm font-bold text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-extrabold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm">
          {value} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-white rounded-full h-3 shadow-inner">
        <div
          className={`h-3 rounded-full shadow-md ${colorClasses[color]} transition-all duration-500`}
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
    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white px-4 py-3 rounded-lg hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg">
          {icon}
        </div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-gray-900 bg-gradient-to-br from-gray-100 to-slate-100 px-4 py-1.5 rounded-full shadow-sm">
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
      className="bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl p-5 transition-all duration-300 text-left shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/30"
    >
      <p className="text-3xl font-extrabold mb-2">{count}</p>
      <p className="text-sm font-bold">{label}</p>
    </button>
  );
}
