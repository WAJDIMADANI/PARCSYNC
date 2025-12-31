import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Plus, Clock, CheckCircle, AlertCircle, User, Calendar, Send, Reply, FileText, Download, MessageSquare } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { Pagination } from './Pagination';

interface Tache {
  id: string;
  expediteur_id: string;
  assignee_id: string;
  titre: string;
  contenu: string;
  statut: 'en_attente' | 'en_cours' | 'completee';
  priorite: 'haute' | 'normal' | 'basse';
  created_at: string;
  expediteur_nom: string;
  expediteur_prenom: string;
  expediteur_email: string;
  expediteur_pole_nom: string;
  lu_par_assignee: boolean;
  lu_par_expediteur: boolean;
  date_derniere_reponse: string | null;
}

interface DemandeExterne {
  id: string;
  type: 'demande_externe';
  titre: string;
  description: string;
  contenu: string;
  reference_id: string;
  statut: 'nouveau' | 'consulte' | 'traite';
  lu: boolean;
  created_at: string;
  profil?: {
    prenom: string;
    nom: string;
    email: string;
    matricule_tca: string;
    poste: string | null;
  };
  pole?: {
    nom: string;
  };
  fichiers?: Array<{ path: string; name: string; size: number }>;
}

type InboxItem = (Tache & { itemType: 'tache' }) | (DemandeExterne & { itemType: 'demande_externe' });

interface TacheMessage {
  id: string;
  tache_id: string;
  auteur_id: string;
  contenu: string;
  created_at: string;
  auteur_nom: string;
  auteur_prenom: string;
  auteur_email: string;
}

interface TaskStats {
  en_attente: number;
  en_cours: number;
  completee: number;
  total: number;
  non_lus: number;
}

export function InboxPage() {
  const { user, appUserId } = useAuth();
  const [taches, setTaches] = useState<Tache[]>([]);
  const [demandesExternes, setDemandesExternes] = useState<DemandeExterne[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({ en_attente: 0, en_cours: 0, completee: 0, total: 0, non_lus: 0 });
  const [selectedTask, setSelectedTask] = useState<Tache | null>(null);
  const [selectedDemandeExterne, setSelectedDemandeExterne] = useState<DemandeExterne | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'en_cours' | 'completee'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTaches();

    // Abonnement temps réel pour les mises à jour de tâches et demandes externes
    const subscription = supabase
      .channel('inbox_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taches',
        },
        () => {
          // Recharger toutes les tâches quand il y a un changement
          fetchTaches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taches_messages',
        },
        () => {
          // Recharger quand il y a un nouveau message
          fetchTaches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox',
        },
        () => {
          // Recharger quand il y a une nouvelle demande externe
          fetchTaches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demandes_externes',
        },
        () => {
          // Recharger quand une demande externe est modifiée
          fetchTaches();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, appUserId]);

  const fetchTaches = async () => {
    if (!user || !appUserId) return;

    try {
      const [tachesResult, inboxResult] = await Promise.all([
        supabase
          .from('taches')
          .select(`
            *,
            expediteur:expediteur_id(nom, prenom, email, pole_id, pole:pole_id(nom)),
            assignee:assignee_id(nom, prenom, email)
          `)
          .or(`assignee_id.eq.${appUserId},expediteur_id.eq.${appUserId}`)
          .order('date_derniere_reponse', { ascending: false, nullsFirst: false }),

        supabase
          .from('inbox')
          .select('*')
          .eq('utilisateur_id', appUserId)
          .order('created_at', { ascending: false })
      ]);

      if (tachesResult.error) throw tachesResult.error;

      const formattedTaches: (Tache & { itemType: 'tache' })[] = (tachesResult.data || []).map((t: any) => ({
        ...t,
        itemType: 'tache' as const,
        expediteur_nom: t.expediteur?.nom || '',
        expediteur_prenom: t.expediteur?.prenom || '',
        expediteur_email: t.expediteur?.email || '',
        expediteur_pole_nom: t.expediteur?.pole?.nom || 'Sans pôle',
        lu_par_assignee: t.lu_par_assignee ?? false,
        lu_par_expediteur: t.lu_par_expediteur ?? true
      }));

      let formattedDemandes: (DemandeExterne & { itemType: 'demande_externe' })[] = [];

      console.log('🔍 Tous les messages inbox:', inboxResult.data?.map(x => ({ titre: x.titre, reference_type: x.reference_type, type: x.type })));
      console.log('Chargement messages inbox...');
      console.log('Inbox result:', inboxResult.data?.length || 0, 'entrées', inboxResult.error);

      if (inboxResult.error) {
        console.warn('Erreur chargement inbox:', inboxResult.error);
      } else if (inboxResult.data && inboxResult.data.length > 0) {
        // Séparer les demandes externes des autres messages (profil, etc.)
        const demandesExternesInbox = inboxResult.data.filter((i: any) => i.reference_type === 'demande_externe');
        const autresMessages = inboxResult.data.filter((i: any) => i.reference_type !== 'demande_externe');

        // Charger les détails des demandes externes uniquement
        if (demandesExternesInbox.length > 0) {
          const demandeIds = demandesExternesInbox.map((i: any) => i.reference_id);
          console.log('IDs des demandes externes à charger:', demandeIds);

          const { data: demandesData, error: demandesError } = await supabase
            .from('demandes_externes')
            .select(`
              id,
              profil_id,
              pole_id,
              fichiers,
              profil:profil_id(prenom, nom, email, matricule_tca, poste),
              pole:pole_id(nom)
            `)
            .in('id', demandeIds);

          console.log('Détails demandes chargés:', demandesData?.length || 0, 'demandes', demandesError);

          if (!demandesError) {
            const demandesMap = new Map((demandesData || []).map((d: any) => [d.id, d]));

            const formattedDemandesExternes = demandesExternesInbox.map((inbox: any) => {
              const demandeDetails = demandesMap.get(inbox.reference_id);
              return {
                id: inbox.id,
                itemType: 'demande_externe' as const,
                type: 'demande_externe' as const,
                titre: inbox.titre,
                description: inbox.description,
                contenu: inbox.contenu,
                reference_id: inbox.reference_id,
                statut: inbox.statut || 'nouveau',
                lu: inbox.lu ?? false,
                created_at: inbox.created_at,
                profil: demandeDetails?.profil,
                pole: demandeDetails?.pole,
                fichiers: demandeDetails?.fichiers || []
              };
            });

            formattedDemandes = [...formattedDemandesExternes];
            console.log('Demandes externes formatées:', formattedDemandesExternes.length);
          }
        }

        // Ajouter les autres messages (profil, etc.) sans charger de détails supplémentaires
        if (autresMessages.length > 0) {
          const formattedAutres = autresMessages.map((inbox: any) => ({
            id: inbox.id,
            itemType: 'demande_externe' as const,
            type: 'demande_externe' as const,
            titre: inbox.titre,
            description: inbox.description || '',
            contenu: inbox.contenu || '',
            reference_id: inbox.reference_id,
            statut: inbox.statut || 'nouveau',
            lu: inbox.lu ?? false,
            created_at: inbox.created_at,
            profil: undefined,
            pole: undefined,
            fichiers: []
          }));

          formattedDemandes = [...formattedDemandes, ...formattedAutres];
          console.log('Autres messages formatés:', autresMessages.length, '(type profil, etc.)');
        }

        console.log('Total messages inbox:', formattedDemandes.length);
      } else {
        console.log('Aucun message trouvé dans inbox');
      }

      setTaches(formattedTaches);
      setDemandesExternes(formattedDemandes);

      const allItems = [...formattedTaches, ...formattedDemandes].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      setInboxItems(allItems);

      const nonLusTaches = formattedTaches.filter((t) =>
        (t.assignee_id === appUserId && !t.lu_par_assignee) ||
        (t.expediteur_id === appUserId && !t.lu_par_expediteur)
      ).length;
      const nonLusDemandes = formattedDemandes.filter(d => !d.lu).length;

      const newStats = {
        en_attente: formattedTaches.filter((t) => t.statut === 'en_attente').length,
        en_cours: formattedTaches.filter((t) => t.statut === 'en_cours').length,
        completee: formattedTaches.filter((t) => t.statut === 'completee').length,
        total: allItems.length,
        non_lus: nonLusTaches + nonLusDemandes
      };

      console.log('📊 Page Inbox:', {
        tachesCount: formattedTaches.length,
        demandesCount: formattedDemandes.length,
        total: allItems.length,
        non_lus: newStats.non_lus,
        filters: {
          utilisateur_id: appUserId,
          source: 'taches + inbox'
        }
      });

      setStats(newStats);
    } catch (error) {
      console.error('Erreur chargement inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'en_attente' | 'en_cours' | 'completee') => {
    try {
      const { error } = await supabase
        .from('taches')
        .update({ statut: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTaches(prev => prev.map(t => t.id === taskId ? { ...t, statut: newStatus } : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, statut: newStatus } : null);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;

    try {
      await supabase.from('taches').delete().eq('id', taskId);
      setTaches(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const markAsRead = async (tache: Tache) => {
    try {
      // Si je suis l'assignee et que ce n'est pas déjà lu
      if (tache.assignee_id === appUserId && !tache.lu_par_assignee) {
        const { error } = await supabase.rpc('mark_task_as_read', { task_uuid: tache.id });

        if (!error) {
          setTaches(prev => prev.map(t =>
            t.id === tache.id ? { ...t, lu_par_assignee: true } : t
          ));
          setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) }));
        }
      }

      // Si je suis l'expéditeur et que ce n'est pas déjà lu
      if (tache.expediteur_id === appUserId && !tache.lu_par_expediteur) {
        const { error } = await supabase.rpc('mark_task_as_read_by_sender', { task_uuid: tache.id });

        if (!error) {
          setTaches(prev => prev.map(t =>
            t.id === tache.id ? { ...t, lu_par_expediteur: true } : t
          ));
          setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) }));
        }
      }
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const handleOpenTask = (tache: Tache) => {
    setSelectedTask(tache);
    markAsRead(tache);
  };

  const handleOpenDemandeExterne = async (demande: DemandeExterne) => {
    setSelectedDemandeExterne(demande);

    if (!demande.lu) {
      try {
        const { error } = await supabase
          .from('inbox')
          .update({ lu: true })
          .eq('id', demande.id);

        if (!error) {
          setDemandesExternes(prev => prev.map(d =>
            d.id === demande.id ? { ...d, lu: true } : d
          ));
          setInboxItems(prev => prev.map(item =>
            item.itemType === 'demande_externe' && item.id === demande.id
              ? { ...item, lu: true }
              : item
          ));
          setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) }));
        }
      } catch (error) {
        console.error('Erreur marquage lu:', error);
      }
    }
  };

  const updateDemandeExterneStatus = async (demandeId: string, newStatus: 'nouveau' | 'consulte' | 'traite') => {
    try {
      const { error } = await supabase
        .from('inbox')
        .update({ statut: newStatus })
        .eq('id', demandeId);

      if (error) throw error;

      setDemandesExternes(prev => prev.map(d => d.id === demandeId ? { ...d, statut: newStatus } : d));
      setInboxItems(prev => prev.map(item =>
        item.itemType === 'demande_externe' && item.id === demandeId
          ? { ...item, statut: newStatus }
          : item
      ));
      if (selectedDemandeExterne?.id === demandeId) {
        setSelectedDemandeExterne(prev => prev ? { ...prev, statut: newStatus } : null);
      }
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'haute':
        return 'bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 backdrop-blur-sm';
      case 'normal':
        return 'bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 backdrop-blur-sm';
      case 'basse':
        return 'bg-gradient-to-br from-slate-400 via-gray-400 to-slate-500 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 backdrop-blur-sm';
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-md';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'en_attente': return <Clock className="w-4 h-4 text-white drop-shadow-sm" />;
      case 'en_cours': return <AlertCircle className="w-4 h-4 text-white drop-shadow-sm" />;
      case 'completee': return <CheckCircle className="w-4 h-4 text-white drop-shadow-sm" />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300';
      case 'en_cours':
        return 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300';
      case 'completee':
        return 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-md';
    }
  };

  const getDemandeStatusBadgeClass = (statut: string) => {
    switch (statut) {
      case 'traite':
        return 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300';
      case 'consulte':
        return 'bg-gradient-to-br from-sky-500 via-blue-500 to-sky-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300';
      default:
        return 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300';
    }
  };

  const filteredItems = filter === 'all'
    ? inboxItems
    : inboxItems.filter(item =>
        item.itemType === 'tache' && item.statut === filter
      );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl relative shadow-md">
            <Inbox className="w-8 h-8 text-white" />
            {stats.non_lus > 0 && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                {stats.non_lus}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              Boîte de Réception
              {stats.non_lus > 0 && (
                <span className="ml-2 px-4 py-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white text-sm font-extrabold rounded-full shadow-lg animate-pulse ring-2 ring-orange-300 ring-offset-2">
                  {stats.non_lus} non {stats.non_lus === 1 ? 'lu' : 'lus'}
                </span>
              )}
            </h1>
            <p className="text-gray-600">Tâches assignées</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-full hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300 font-bold transform hover:scale-105 ring-2 ring-orange-300 ring-offset-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle tâche
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Inbox className="w-10 h-10 text-gray-500" />} />
        <StatCard label="En attente" value={stats.en_attente} icon={<Clock className="w-10 h-10 text-orange-500" />} />
        <StatCard label="En cours" value={stats.en_cours} icon={<AlertCircle className="w-10 h-10 text-amber-500" />} />
        <StatCard label="Complétées" value={stats.completee} icon={<CheckCircle className="w-10 h-10 text-emerald-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4 flex gap-3 flex-wrap">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Toutes ({stats.total})</FilterButton>
          <FilterButton active={filter === 'en_attente'} onClick={() => setFilter('en_attente')}>En attente ({stats.en_attente})</FilterButton>
          <FilterButton active={filter === 'en_cours'} onClick={() => setFilter('en_cours')}>En cours ({stats.en_cours})</FilterButton>
          <FilterButton active={filter === 'completee'} onClick={() => setFilter('completee')}>Complétées ({stats.completee})</FilterButton>
        </div>

        <div className="py-2">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Aucun message</div>
          ) : (
            paginatedItems.map(item => {
              if (item.itemType === 'tache') {
                const tache = item;
                const isUnread =
                  (tache.assignee_id === appUserId && !tache.lu_par_assignee) ||
                  (tache.expediteur_id === appUserId && !tache.lu_par_expediteur);
                return (
                  <div
                    key={`tache-${tache.id}`}
                    onClick={() => handleOpenTask(tache)}
                    className={`mx-4 my-3 p-5 rounded-lg cursor-pointer transition-all duration-200 ${
                      isUnread
                        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 shadow-lg hover:shadow-xl hover:from-orange-100 hover:to-amber-100'
                        : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${
                          isUnread ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          <MessageSquare className={`w-5 h-5 ${isUnread ? 'text-orange-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {isUnread && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white text-xs font-extrabold rounded-full uppercase tracking-tight shadow-lg animate-pulse">
                                Nouveau
                              </span>
                            )}
                            <p className={`text-sm font-semibold ${isUnread ? 'text-orange-900' : 'text-gray-600'}`}>
                              {tache.expediteur_pole_nom}
                            </p>
                          </div>
                          <p className={`text-base truncate mb-2 ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {tache.titre}
                          </p>
                          <p className="text-sm text-gray-500">
                            Par {tache.expediteur_prenom} {tache.expediteur_nom}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                        <span className={`px-2 py-1 text-xs font-extrabold rounded-full uppercase tracking-wide ${getPriorityColor(tache.priorite)}`}>
                          {tache.priorite}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getStatusBadgeClass(tache.statut)}`}>
                          {getStatusIcon(tache.statut)}
                          <span className="text-xs font-bold uppercase tracking-tight whitespace-nowrap">{tache.statut.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const demande = item;
                const isUnread = !demande.lu;
                return (
                  <div
                    key={`demande-${demande.id}`}
                    onClick={() => handleOpenDemandeExterne(demande)}
                    className={`mx-4 my-3 p-5 rounded-lg cursor-pointer transition-all duration-200 ${
                      isUnread
                        ? 'bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-400 shadow-lg hover:shadow-xl hover:from-rose-100 hover:to-orange-100'
                        : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${
                          isUnread ? 'bg-rose-100' : 'bg-gray-100'
                        }`}>
                          <FileText className={`w-5 h-5 ${isUnread ? 'text-rose-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {isUnread && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white text-xs font-extrabold rounded-full uppercase tracking-tight shadow-lg animate-pulse">
                                Nouveau
                              </span>
                            )}
                            <p className={`text-sm font-semibold ${isUnread ? 'text-rose-900' : 'text-gray-600'}`}>
                              {demande.pole?.nom || 'Demande externe'}
                            </p>
                          </div>
                          <p className={`text-base truncate mb-2 ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {demande.titre}
                          </p>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {demande.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                        <span className={`px-2 py-1 text-xs font-extrabold rounded-full uppercase tracking-tight whitespace-nowrap ${getDemandeStatusBadgeClass(demande.statut)}`}>
                          {demande.statut}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>

        {filteredItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={updateTaskStatus}
          onDelete={deleteTask}
        />
      )}

      {selectedDemandeExterne && (
        <DemandeExterneModal
          demande={selectedDemandeExterne}
          onClose={() => setSelectedDemandeExterne(null)}
          onUpdateStatus={updateDemandeExterneStatus}
        />
      )}

      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTaches();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
          <p className="text-4xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full font-bold transition-all duration-300 transform ${
        active
          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg scale-105 ring-2 ring-orange-300 ring-offset-2'
          : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 hover:from-gray-200 hover:to-slate-200 hover:shadow-md hover:scale-102 border border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

interface TaskModalProps {
  task: Tache;
  onClose: () => void;
  onUpdateStatus: (id: string, status: any) => void;
  onDelete: (id: string) => void;
}

function TaskModal({ task, onClose, onUpdateStatus, onDelete }: TaskModalProps) {
  const { appUserId, user } = useAuth();
  const [messages, setMessages] = useState<TacheMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`taches_messages:${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taches_messages',
          filter: `tache_id=eq.${task.id}`
        },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('taches_messages')
        .select(`
          *,
          auteur:auteur_id(nom, prenom, email)
        `)
        .eq('tache_id', task.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map((m: any) => ({
        ...m,
        auteur_nom: m.auteur?.nom || '',
        auteur_prenom: m.auteur?.prenom || '',
        auteur_email: m.auteur?.email || ''
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !appUserId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('taches_messages')
        .insert({
          tache_id: task.id,
          auteur_id: appUserId,
          contenu: replyText
        });

      if (error) throw error;

      setReplyText('');
      setShowReply(false);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (prenom: string, nom: string) => {
    const p = prenom?.charAt(0) || '?';
    const n = nom?.charAt(0) || '?';
    return `${p}${n}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: hours > 8760 ? 'numeric' : undefined });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="bg-white border-b p-4 flex items-center justify-between rounded-t-xl">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{task.titre}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-3 py-1 text-xs font-extrabold rounded-full uppercase tracking-tight shadow-md ${
                task.priorite === 'haute' ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white' :
                task.priorite === 'normal' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' :
                'bg-gradient-to-r from-slate-400 to-gray-500 text-white'
              }`}>
                {task.priorite}
              </span>
              <span className={`px-3 py-1 text-xs font-extrabold rounded-full uppercase tracking-tight shadow-md ${
                task.statut === 'completee' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' :
                task.statut === 'en_cours' ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white' :
                'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
              }`}>
                {task.statut.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {getInitials(task.expediteur_prenom, task.expediteur_nom)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="font-semibold text-gray-900">{task.expediteur_prenom} {task.expediteur_nom}</p>
                    <p className="text-sm text-gray-500">{task.expediteur_email}</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(task.created_at)}</p>
                </div>
                <div className="mt-3 text-gray-700 whitespace-pre-wrap">
                  {task.contenu || <span className="text-gray-400 italic">Aucun contenu</span>}
                </div>
              </div>
            </div>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {getInitials(message.auteur_prenom, message.auteur_nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="font-semibold text-gray-900">{message.auteur_prenom} {message.auteur_nom}</p>
                          <p className="text-sm text-gray-500">{message.auteur_email}</p>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(message.created_at)}</p>
                      </div>
                      <div className="mt-2 text-gray-700 whitespace-pre-wrap">
                        {message.contenu}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {showReply && (
            <div className="bg-white border rounded-lg p-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Écrivez votre réponse..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Send className="w-3 h-3" />
                  {sending ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setReplyText('');
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-gray-200 to-slate-200 text-gray-700 rounded-full hover:from-gray-300 hover:to-slate-300 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-b-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {!showReply && (
                <button
                  onClick={() => setShowReply(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full hover:from-sky-600 hover:to-blue-700 text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Reply className="w-3 h-3" />
                  Répondre
                </button>
              )}
              {task.statut === 'en_attente' && (
                <button
                  onClick={() => onUpdateStatus(task.id, 'en_cours')}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white rounded-full hover:from-amber-600 hover:to-yellow-700 text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  En cours
                </button>
              )}
              {task.statut === 'en_cours' && (
                <button
                  onClick={() => onUpdateStatus(task.id, 'completee')}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Complétée
                </button>
              )}
            </div>
            <button
              onClick={() => { if (confirm('Supprimer cette tâche ?')) { onDelete(task.id); onClose(); } }}
              className="px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full hover:from-red-600 hover:to-rose-700 text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DemandeExterneModalProps {
  demande: DemandeExterne;
  onClose: () => void;
  onUpdateStatus: (id: string, status: 'nouveau' | 'consulte' | 'traite') => void;
}

function DemandeExterneModal({ demande, onClose, onUpdateStatus }: DemandeExterneModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('demandes-externes')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement fichier:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white p-5 flex items-center justify-between rounded-t-xl">
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">{demande.titre}</h2>
            <p className="text-green-50 text-sm mt-1 font-medium">{demande.description}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-green-50 text-2xl font-light transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Informations du chauffeur
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Nom complet:</span>
                <p className="font-medium">{demande.profil?.prenom} {demande.profil?.nom}</p>
              </div>
              <div>
                <span className="text-gray-600">Matricule:</span>
                <p className="font-medium">{demande.profil?.matricule_tca || '-'}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium">{demande.profil?.email}</p>
              </div>
              <div>
                <span className="text-gray-600">Poste:</span>
                <p className="font-medium">{demande.profil?.poste || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Détails de la demande
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Pôle concerné:</span>
                <p className="font-medium">{demande.pole?.nom || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Date de création:</span>
                <p className="font-medium">{formatDate(demande.created_at)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Statut actuel:</span>
                <span className={`inline-block ml-2 px-3 py-1 text-xs font-extrabold rounded-full uppercase tracking-tight shadow-md ${
                  demande.statut === 'traite' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' :
                  demande.statut === 'consulte' ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white' :
                  'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                }`}>
                  {demande.statut}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 block mb-2">Contenu de la demande:</span>
                <div className="bg-gray-50 rounded p-3 whitespace-pre-wrap text-gray-700">
                  {demande.contenu}
                </div>
              </div>
            </div>
          </div>

          {demande.fichiers && demande.fichiers.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Fichiers joints ({demande.fichiers.length})
              </h3>
              <div className="space-y-2">
                {demande.fichiers.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(file.path, file.name)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full text-xs hover:from-sky-600 hover:to-blue-700 flex-shrink-0 font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">Télécharger</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-b-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {demande.statut === 'nouveau' && (
                <button
                  onClick={() => onUpdateStatus(demande.id, 'consulte')}
                  className="px-3 py-2 bg-gradient-to-r from-sky-500 via-blue-500 to-sky-600 text-white rounded-full hover:from-sky-600 hover:to-blue-700 text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Consulté
                </button>
              )}
              {demande.statut === 'consulte' && (
                <button
                  onClick={() => onUpdateStatus(demande.id, 'traite')}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Traité
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gradient-to-r from-gray-200 to-slate-200 text-gray-700 rounded-full hover:from-gray-300 hover:to-slate-300 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Pole {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

interface AppUser {
  id: string;
  nom: string;
  prenom: string;
  pole_id: string | null;
  pole_nom?: string;
}

function CreateModal({ onClose, onSuccess }: CreateModalProps) {
  const { appUserId } = useAuth();
  const [poles, setPoles] = useState<Pole[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [selectedPole, setSelectedPole] = useState<string>('all');
  const [form, setForm] = useState({ assignee_id: '', titre: '', contenu: '', priorite: 'normal' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [polesResult, usersResult] = await Promise.all([
        supabase.from('poles').select('*').eq('actif', true).order('nom'),
        supabase.from('app_utilisateur').select('id, nom, prenom, pole_id').eq('actif', true).order('nom')
      ]);

      const polesData = polesResult.data || [];
      const usersData = usersResult.data || [];

      setPoles(polesData);

      const usersWithPole = usersData.map((user: any) => {
        const pole = polesData.find((p: Pole) => p.id === user.pole_id);
        return {
          ...user,
          pole_nom: pole ? pole.nom : 'Admin'
        };
      });

      setAllUsers(usersWithPole);
      setFilteredUsers(usersWithPole);
    };

    fetchData();

    const handlePolesUpdate = () => {
      fetchData();
    };

    window.addEventListener('poles-updated', handlePolesUpdate);

    return () => {
      window.removeEventListener('poles-updated', handlePolesUpdate);
    };
  }, []);

  useEffect(() => {
    if (selectedPole === 'all') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user =>
        user.pole_id === selectedPole
      );
      setFilteredUsers(filtered);
    }
    setForm(prev => ({ ...prev, assignee_id: '' }));
  }, [selectedPole, allUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assignee_id || !form.titre) {
      alert('Remplissez les champs');
      return;
    }

    setSending(true);
    try {
      await supabase.from('taches').insert({
        expediteur_id: appUserId,
        assignee_id: form.assignee_id,
        titre: form.titre,
        contenu: form.contenu,
        priorite: form.priorite,
        statut: 'en_attente'
      });
      onSuccess();
    } catch (error) {
      alert('Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-5 rounded-t-xl">
          <h2 className="text-xl font-extrabold">Nouvelle tâche</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pôle</label>
            <select
              value={selectedPole}
              onChange={(e) => setSelectedPole(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Tous les pôles</option>
              {poles.map(pole => (
                <option key={pole.id} value={pole.id}>{pole.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assigner à *</label>
            <select
              value={form.assignee_id}
              onChange={(e) => setForm({...form, assignee_id: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              required
            >
              <option value="">Sélectionner un utilisateur...</option>
              {filteredUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.prenom} {user.nom} ({user.pole_nom})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Titre *</label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => setForm({...form, titre: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contenu</label>
            <textarea
              value={form.contenu}
              onChange={(e) => setForm({...form, contenu: e.target.value})}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Priorité</label>
            <select
              value={form.priorite}
              onChange={(e) => setForm({...form, priorite: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="basse">Basse</option>
              <option value="normal">Normale</option>
              <option value="haute">Haute</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {sending ? 'Création...' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-gray-200 to-slate-200 text-gray-700 rounded-full hover:from-gray-300 hover:to-slate-300 transition-all duration-300 font-bold shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}