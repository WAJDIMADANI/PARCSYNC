import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Plus, Clock, CheckCircle, AlertCircle, User, Calendar, Send, Reply, FileText, Download, MessageSquare, X, Trash2 } from 'lucide-react';
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
  type: 'demande_externe' | 'rdv_visite_medicale' | 'ar_fin_absence' | 'ar_justificatif_recu';
  titre: string;
  description: string;
  contenu: string | any;
  reference_id: string;
  reference_type?: string;
  profil_id?: string;
  statut: 'nouveau' | 'consulte' | 'traite' | 'ouvert';
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
  rdv_visite_medicale: number;
  ar_fin_absence: number;
}

interface InboxPageProps {
  onViewProfile?: (profilId: string, returnParams?: any) => void;
  onNavigateToAR?: (arEventId: string) => void;
  viewParams?: any;
}

export function InboxPage({ onViewProfile, onNavigateToAR, viewParams }: InboxPageProps = {}) {
  const { user, appUserId } = useAuth();
  const [taches, setTaches] = useState<Tache[]>([]);
  const [demandesExternes, setDemandesExternes] = useState<DemandeExterne[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({ en_attente: 0, en_cours: 0, completee: 0, total: 0, non_lus: 0, rdv_visite_medicale: 0, ar_fin_absence: 0 });
  const [selectedTask, setSelectedTask] = useState<Tache | null>(null);
  const [selectedDemandeExterne, setSelectedDemandeExterne] = useState<DemandeExterne | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'en_cours' | 'completee' | 'rdv_visite_medicale' | 'ar_fin_absence'>('all');
  const [currentPage, setCurrentPage] = useState(viewParams?.currentPage || 1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (viewParams?.currentPage) {
      setCurrentPage(viewParams.currentPage);
    }
  }, [viewParams]);

  useEffect(() => {
    fetchTaches();

    const subscription = supabase
      .channel('inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => { fetchTaches(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'taches_messages' }, () => { fetchTaches(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, () => { fetchTaches(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes_externes' }, () => { fetchTaches(); })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [user, appUserId]);

  const fetchTaches = async () => {
    if (!user || !appUserId) return;

    try {
      const [tachesResult, inboxResult] = await Promise.all([
        supabase
          .from('taches')
          .select(`*, expediteur:expediteur_id(nom, prenom, email, pole_id, pole:pole_id(nom)), assignee:assignee_id(nom, prenom, email)`)
          .or(`assignee_id.eq.${appUserId},expediteur_id.eq.${appUserId}`)
          .order('date_derniere_reponse', { ascending: false, nullsFirst: false }),
        supabase
          .from('inbox')
          .select('id, titre, description, contenu, reference_id, reference_type, statut, lu, created_at, updated_at, utilisateur_id, type')
          .eq('utilisateur_id', appUserId)
          .order('created_at', { ascending: false })
      ]);

      if (tachesResult.error) throw tachesResult.error;

      const formattedTaches: (Tache & { itemType: 'tache' })[] = (tachesResult.data || []).map((t: any) => ({
        ...t, itemType: 'tache' as const,
        expediteur_nom: t.expediteur?.nom || '', expediteur_prenom: t.expediteur?.prenom || '',
        expediteur_email: t.expediteur?.email || '', expediteur_pole_nom: t.expediteur?.pole?.nom || 'Sans pôle',
        lu_par_assignee: t.lu_par_assignee ?? false, lu_par_expediteur: t.lu_par_expediteur ?? true
      }));

      let formattedDemandes: (DemandeExterne & { itemType: 'demande_externe' })[] = [];

      if (inboxResult.error) {
        console.warn('Erreur chargement inbox:', inboxResult.error);
      } else if (inboxResult.data && inboxResult.data.length > 0) {
        const demandesExternesInbox = inboxResult.data.filter((i: any) => i.reference_type === 'demande_externe');
        const autresMessages = inboxResult.data.filter((i: any) => i.reference_type !== 'demande_externe');

        if (demandesExternesInbox.length > 0) {
          const demandeIds = demandesExternesInbox.map((i: any) => i.reference_id);
          const { data: demandesData, error: demandesError } = await supabase
            .from('demandes_externes')
            .select(`id, profil_id, pole_id, fichiers, profil:profil_id(prenom, nom, email, matricule_tca, poste), pole:pole_id(nom)`)
            .in('id', demandeIds);

          if (!demandesError) {
            const demandesMap = new Map((demandesData || []).map((d: any) => [d.id, d]));
            const formattedDemandesExternes = demandesExternesInbox.map((inbox: any) => {
              const demandeDetails = demandesMap.get(inbox.reference_id);
              return { id: inbox.id, itemType: 'demande_externe' as const, type: 'demande_externe' as const, titre: inbox.titre, description: inbox.description, contenu: inbox.contenu, reference_id: inbox.reference_id, profil_id: demandeDetails?.profil_id, statut: inbox.statut || 'nouveau', lu: inbox.lu ?? false, created_at: inbox.created_at, profil: demandeDetails?.profil, pole: demandeDetails?.pole, fichiers: demandeDetails?.fichiers || [] };
            });
            formattedDemandes = [...formattedDemandesExternes];
          }
        }

        if (autresMessages.length > 0) {
          const formattedAutres = await Promise.all(autresMessages.map(async (inbox: any) => {
            let profilData = undefined;
            if (inbox.reference_type === 'profil' && inbox.reference_id) {
              try { const { data: profil } = await supabase.from('profil').select('prenom, nom, email, matricule_tca, poste').eq('id', inbox.reference_id).single(); if (profil) profilData = profil; } catch (error) { console.error('Erreur chargement profil:', error); }
            }
            if (inbox.reference_type === 'compta_ar_event' && inbox.contenu) {
              try { const contenuParsed = typeof inbox.contenu === 'string' ? JSON.parse(inbox.contenu) : inbox.contenu; if (contenuParsed?.profil_id) { const { data: profil } = await supabase.from('profil').select('prenom, nom, email, matricule_tca, poste').eq('id', contenuParsed.profil_id).single(); if (profil) profilData = profil; } } catch (error) { console.error('Erreur parsing contenu AR:', error); }
            }
            return { id: inbox.id, itemType: 'demande_externe' as const, type: inbox.type || 'demande_externe' as const, titre: inbox.titre, description: inbox.description || '', contenu: inbox.contenu || '', reference_id: inbox.reference_id, reference_type: inbox.reference_type, profil_id: inbox.reference_type === 'profil' ? inbox.reference_id : undefined, statut: inbox.statut || 'nouveau', lu: inbox.lu ?? false, created_at: inbox.created_at, profil: profilData, pole: undefined, fichiers: [] };
          }));
          formattedDemandes = [...formattedDemandes, ...formattedAutres];
        }
      }

      setTaches(formattedTaches);
      setDemandesExternes(formattedDemandes);

      const allItems = [...formattedTaches, ...formattedDemandes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInboxItems(allItems);

      const nonLusTaches = formattedTaches.filter((t) => (t.assignee_id === appUserId && !t.lu_par_assignee) || (t.expediteur_id === appUserId && !t.lu_par_expediteur)).length;
      const nonLusDemandes = formattedDemandes.filter(d => !d.lu).length;
      const rdvVisiteMedicaleCount = formattedDemandes.filter(d => d.type === 'rdv_visite_medicale').length;
      const arFinAbsenceCount = formattedDemandes.filter(d => d.type === 'ar_fin_absence' || d.type === 'ar_justificatif_recu').length;

      setStats({
        en_attente: formattedTaches.filter((t) => t.statut === 'en_attente').length,
        en_cours: formattedTaches.filter((t) => t.statut === 'en_cours').length,
        completee: formattedTaches.filter((t) => t.statut === 'completee').length,
        total: allItems.length,
        non_lus: nonLusTaches + nonLusDemandes,
        rdv_visite_medicale: rdvVisiteMedicaleCount,
        ar_fin_absence: arFinAbsenceCount
      });
    } catch (error) {
      console.error('Erreur chargement inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'en_attente' | 'en_cours' | 'completee') => {
    try {
      const { error } = await supabase.from('taches').update({ statut: newStatus }).eq('id', taskId);
      if (error) throw error;
      setTaches(prev => prev.map(t => t.id === taskId ? { ...t, statut: newStatus } : t));
      if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, statut: newStatus } : null);
    } catch (error) { console.error('Erreur:', error); alert('Erreur'); }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try { await supabase.from('taches').delete().eq('id', taskId); setTaches(prev => prev.filter(t => t.id !== taskId)); if (selectedTask?.id === taskId) setSelectedTask(null); } catch (error) { console.error('Erreur:', error); }
  };

  const markAsRead = async (tache: Tache) => {
    try {
      if (tache.assignee_id === appUserId && !tache.lu_par_assignee) { const { error } = await supabase.rpc('mark_task_as_read', { task_uuid: tache.id }); if (!error) { setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, lu_par_assignee: true } : t)); setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) })); } }
      if (tache.expediteur_id === appUserId && !tache.lu_par_expediteur) { const { error } = await supabase.rpc('mark_task_as_read_by_sender', { task_uuid: tache.id }); if (!error) { setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, lu_par_expediteur: true } : t)); setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) })); } }
    } catch (error) { console.error('Erreur marquage lu:', error); }
  };

  const handleOpenTask = (tache: Tache) => { setSelectedTask(tache); markAsRead(tache); };

  const handleOpenDemandeExterne = async (demande: DemandeExterne) => {
    if (!demande.lu) {
      try { const { error } = await supabase.from('inbox').update({ lu: true }).eq('id', demande.id); if (!error) { setDemandesExternes(prev => prev.map(d => d.id === demande.id ? { ...d, lu: true } : d)); setInboxItems(prev => prev.map(item => item.itemType === 'demande_externe' && item.id === demande.id ? { ...item, lu: true } : item)); setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) })); } } catch (error) { console.error('Erreur marquage lu:', error); }
    }
    if ((demande.type === 'ar_fin_absence' || demande.type === 'ar_justificatif_recu') && demande.reference_id && onNavigateToAR) { onNavigateToAR(demande.reference_id); return; }
    setSelectedDemandeExterne(demande);
  };

  const updateDemandeExterneStatus = async (demandeId: string, newStatus: 'nouveau' | 'consulte' | 'traite') => {
    try {
      const { error } = await supabase.from('inbox').update({ statut: newStatus }).eq('id', demandeId);
      if (error) throw error;
      setDemandesExternes(prev => prev.map(d => d.id === demandeId ? { ...d, statut: newStatus } : d));
      setInboxItems(prev => prev.map(item => item.itemType === 'demande_externe' && item.id === demandeId ? { ...item, statut: newStatus } : item));
      if (selectedDemandeExterne?.id === demandeId) setSelectedDemandeExterne(prev => prev ? { ...prev, statut: newStatus } : null);
    } catch (error) { console.error('Erreur mise à jour statut:', error); alert('Erreur lors de la mise à jour du statut'); }
  };

  // ── Helpers visuels ──

  const getItemAccent = (item: InboxItem): string => {
    if (item.itemType === 'tache') return '#0073ea';
    const d = item as DemandeExterne;
    if (d.type === 'ar_justificatif_recu') return '#00c875';
    if (d.type === 'ar_fin_absence') return '#fdab3d';
    if (d.type === 'rdv_visite_medicale') return '#fdab3d';
    return '#a25ddc';
  };

  const getItemTypeLabel = (item: InboxItem): { text: string; bg: string; color: string } => {
    if (item.itemType === 'tache') return { text: 'Tâche', bg: '#0073ea15', color: '#185FA5' };
    const d = item as DemandeExterne;
    if (d.type === 'ar_justificatif_recu') return { text: 'Justificatif reçu', bg: '#00c87520', color: '#0F6E56' };
    if (d.type === 'ar_fin_absence') return { text: 'Fin d\'absence', bg: '#fdab3d20', color: '#854F0B' };
    if (d.type === 'rdv_visite_medicale') return { text: 'RDV Visite médicale', bg: '#fdab3d20', color: '#854F0B' };
    return { text: 'Document reçu', bg: '#a25ddc20', color: '#3C3489' };
  };

  const getStatusBadge = (item: InboxItem): { text: string; bg: string; color: string } => {
    if (item.itemType === 'tache') {
      const t = item as Tache;
      if (t.statut === 'completee') return { text: 'Complétée', bg: '#00c87520', color: '#0F6E56' };
      if (t.statut === 'en_cours') return { text: 'En cours', bg: '#0073ea15', color: '#185FA5' };
      return { text: 'En attente', bg: '#fdab3d20', color: '#854F0B' };
    }
    const d = item as DemandeExterne;
    if (d.statut === 'traite') return { text: 'Traité', bg: '#00c87520', color: '#0F6E56' };
    if (d.statut === 'consulte') return { text: 'Consulté', bg: '#0073ea15', color: '#185FA5' };
    return { text: 'Nouveau', bg: '#0073ea', color: '#ffffff' };
  };

  const isItemUnread = (item: InboxItem): boolean => {
    if (item.itemType === 'tache') {
      const t = item as Tache;
      return (t.assignee_id === appUserId && !t.lu_par_assignee) || (t.expediteur_id === appUserId && !t.lu_par_expediteur);
    }
    return !(item as DemandeExterne).lu;
  };

  const filteredItems = filter === 'all' ? inboxItems
    : filter === 'rdv_visite_medicale' ? inboxItems.filter(item => item.itemType === 'demande_externe' && item.type === 'rdv_visite_medicale')
    : filter === 'ar_fin_absence' ? inboxItems.filter(item => item.itemType === 'demande_externe' && (item.type === 'ar_fin_absence' || item.type === 'ar_justificatif_recu'))
    : inboxItems.filter(item => item.itemType === 'tache' && item.statut === filter);

  useEffect(() => { setCurrentPage(1); }, [filter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" text="Chargement..." /></div>);
  }

  // ── RENDER ──

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fdab3d15' }}>
            <Inbox className="w-5 h-5" style={{ color: '#fdab3d' }} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900">Boîte de réception</h1>
              {stats.non_lus > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full text-white" style={{ background: '#e44258' }}>
                  {stats.non_lus} non lu{stats.non_lus > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">Tâches et notifications</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-all hover:opacity-90"
          style={{ background: '#0073ea' }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle tâche
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="En attente" value={stats.en_attente} valueColor="#fdab3d" />
        <MiniStat label="En cours" value={stats.en_cours} valueColor="#0073ea" />
        <MiniStat label="Complétées" value={stats.completee} valueColor="#00c875" />
        <MiniStat label="RDV Visite" value={stats.rdv_visite_medicale} />
        <MiniStat label="A&R" value={stats.ar_fin_absence} highlight />
      </div>

      {/* List container */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Filter tabs */}
        <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>Toutes ({stats.total})</FilterPill>
          <FilterPill active={filter === 'en_attente'} onClick={() => setFilter('en_attente')}>En attente ({stats.en_attente})</FilterPill>
          <FilterPill active={filter === 'en_cours'} onClick={() => setFilter('en_cours')}>En cours ({stats.en_cours})</FilterPill>
          <FilterPill active={filter === 'completee'} onClick={() => setFilter('completee')}>Complétées ({stats.completee})</FilterPill>
          <FilterPill active={filter === 'rdv_visite_medicale'} onClick={() => setFilter('rdv_visite_medicale')} accent>RDV ({stats.rdv_visite_medicale})</FilterPill>
          <FilterPill active={filter === 'ar_fin_absence'} onClick={() => setFilter('ar_fin_absence')} accent>A&R ({stats.ar_fin_absence})</FilterPill>
        </div>

        {/* Items */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Aucun message</div>
          ) : (
            paginatedItems.map(item => {
              const accent = getItemAccent(item);
              const typeLabel = getItemTypeLabel(item);
              const statusBadge = getStatusBadge(item);
              const unread = isItemUnread(item);

              const handleClick = () => {
                if (item.itemType === 'tache') handleOpenTask(item as Tache);
                else handleOpenDemandeExterne(item as DemandeExterne);
              };

              return (
                <div
                  key={`${item.itemType}-${item.id}`}
                  onClick={handleClick}
                  className={`mx-2 my-1.5 rounded-lg cursor-pointer transition-all border-l-[3px] flex items-start gap-3 px-4 py-3.5 ${
                    unread ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'
                  }`}
                  style={{ borderLeftColor: accent }}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${accent}15` }}>
                    {item.itemType === 'tache'
                      ? <MessageSquare className="w-4 h-4" style={{ color: accent }} />
                      : <FileText className="w-4 h-4" style={{ color: accent }} />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: typeLabel.bg, color: typeLabel.color }}>
                        {typeLabel.text}
                      </span>
                    </div>
                    <p className={`text-sm truncate mb-0.5 ${unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {item.itemType === 'tache' ? (item as Tache).titre : (item as DemandeExterne).titre}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.itemType === 'tache'
                        ? `Par ${(item as Tache).expediteur_prenom} ${(item as Tache).expediteur_nom}`
                        : (item as DemandeExterne).description
                      }
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 mt-1"
                    style={{ background: statusBadge.bg, color: statusBadge.color }}
                  >
                    {statusBadge.text}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {filteredItems.length > 0 && (
          <Pagination currentPage={currentPage} totalItems={filteredItems.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
        )}
      </div>

      {/* Modals */}
      {selectedTask && (<TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} />)}
      {selectedDemandeExterne && (<DemandeExterneModal demande={selectedDemandeExterne} onClose={() => setSelectedDemandeExterne(null)} onUpdateStatus={updateDemandeExterneStatus} onViewProfile={onViewProfile} />)}
      {showCreateModal && (<CreateModal onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); fetchTaches(); }} />)}
    </div>
  );
}

// ── Sub-components ──

function MiniStat({ label, value, valueColor, highlight }: { label: string; value: number; valueColor?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${highlight ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: valueColor || (highlight ? '#854F0B' : undefined) }}>{value}</p>
    </div>
  );
}

function FilterPill({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
      active ? 'text-white' : accent ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`} style={active ? { background: '#0073ea' } : undefined}>
      {children}
    </button>
  );
}

// ── Task Modal (logique identique, design nettoyé) ──

function TaskModal({ task, onClose, onUpdateStatus, onDelete }: { task: Tache; onClose: () => void; onUpdateStatus: (id: string, status: any) => void; onDelete: (id: string) => void }) {
  const { appUserId } = useAuth();
  const [messages, setMessages] = useState<TacheMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`taches_messages:${task.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'taches_messages', filter: `tache_id=eq.${task.id}` }, () => { fetchMessages(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [task.id]);

  const fetchMessages = async () => {
    try { const { data, error } = await supabase.from('taches_messages').select(`*, auteur:auteur_id(nom, prenom, email)`).eq('tache_id', task.id).order('created_at', { ascending: true }); if (error) throw error; setMessages(data.map((m: any) => ({ ...m, auteur_nom: m.auteur?.nom || '', auteur_prenom: m.auteur?.prenom || '', auteur_email: m.auteur?.email || '' }))); } catch (error) { console.error('Erreur chargement messages:', error); } finally { setLoadingMessages(false); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !appUserId) return;
    setSending(true);
    try { const { error } = await supabase.from('taches_messages').insert({ tache_id: task.id, auteur_id: appUserId, contenu: replyText }); if (error) throw error; setReplyText(''); setShowReply(false); } catch (error) { console.error('Erreur envoi message:', error); alert('Erreur lors de l\'envoi du message'); } finally { setSending(false); }
  };

  const getInitials = (prenom: string, nom: string) => `${prenom?.charAt(0) || '?'}${nom?.charAt(0) || '?'}`.toUpperCase();
  const formatDate = (dateString: string) => { const d = new Date(dateString); const h = Math.floor((Date.now() - d.getTime()) / 3600000); return h < 24 ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); };

  const priorityStyle: Record<string, { bg: string; color: string }> = {
    haute: { bg: '#e4425815', color: '#A32D2D' },
    normal: { bg: '#fdab3d15', color: '#854F0B' },
    basse: { bg: '#f1f1f1', color: '#666' },
  };
  const statusStyle: Record<string, { bg: string; color: string }> = {
    en_attente: { bg: '#fdab3d20', color: '#854F0B' },
    en_cours: { bg: '#0073ea15', color: '#185FA5' },
    completee: { bg: '#00c87520', color: '#0F6E56' },
  };

  const ps = priorityStyle[task.priorite] || priorityStyle.normal;
  const ss = statusStyle[task.statut] || statusStyle.en_attente;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{task.titre}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: ps.bg, color: ps.color }}>{task.priorite}</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: ss.bg, color: ss.color }}>{task.statut.replace('_', ' ')}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#0073ea' }}>{getInitials(task.expediteur_prenom, task.expediteur_nom)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-gray-900">{task.expediteur_prenom} {task.expediteur_nom}</p>
                  <p className="text-xs text-gray-400">{formatDate(task.created_at)}</p>
                </div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{task.contenu || <span className="italic text-gray-400">Aucun contenu</span>}</div>
              </div>
            </div>
          </div>

          {loadingMessages ? (<div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>) : messages.map((m) => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#00c875' }}>{getInitials(m.auteur_prenom, m.auteur_nom)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-gray-900">{m.auteur_prenom} {m.auteur_nom}</p>
                    <p className="text-xs text-gray-400">{formatDate(m.created_at)}</p>
                  </div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">{m.contenu}</div>
                </div>
              </div>
            </div>
          ))}

          {showReply && (
            <div className="border border-gray-200 rounded-lg p-4">
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Écrivez votre réponse..." className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm" rows={3} autoFocus />
              <div className="flex items-center gap-2 mt-3">
                <button onClick={sendReply} disabled={sending || !replyText.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: '#00c875' }}>
                  <Send className="w-3 h-3" />{sending ? 'Envoi...' : 'Envoyer'}
                </button>
                <button onClick={() => { setShowReply(false); setReplyText(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            {!showReply && (<button onClick={() => setShowReply(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium" style={{ background: '#0073ea' }}><Reply className="w-3 h-3" />Répondre</button>)}
            {task.statut === 'en_attente' && (<button onClick={() => onUpdateStatus(task.id, 'en_cours')} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: '#fdab3d20', color: '#854F0B' }}>En cours</button>)}
            {task.statut === 'en_cours' && (<button onClick={() => onUpdateStatus(task.id, 'completee')} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: '#00c87520', color: '#0F6E56' }}>Complétée</button>)}
          </div>
          <button onClick={() => { if (confirm('Supprimer cette tâche ?')) { onDelete(task.id); onClose(); } }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" />Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── DemandeExterne Modal (logique identique, design nettoyé) ──

function DemandeExterneModal({ demande, onClose, onUpdateStatus, onViewProfile }: { demande: DemandeExterne; onClose: () => void; onUpdateStatus: (id: string, status: 'nouveau' | 'consulte' | 'traite') => void; onViewProfile?: (profilId: string) => void }) {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatFileSize = (bytes: number): string => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';

  const parseContenu = () => { if (typeof demande.contenu === 'object') return demande.contenu; try { return JSON.parse(demande.contenu); } catch { return null; } };
  const contenuData = parseContenu();
  const isRdv = demande.type === 'rdv_visite_medicale';
  const accentColor = isRdv ? '#fdab3d' : '#00c875';

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try { const { data, error } = await supabase.storage.from('demandes-externes').download(filePath); if (error) throw error; const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } catch (error) { console.error('Erreur téléchargement fichier:', error); alert('Erreur lors du téléchargement du fichier'); }
  };

  const statusStyle: Record<string, { bg: string; color: string }> = {
    nouveau: { bg: '#0073ea', color: '#fff' },
    consulte: { bg: '#0073ea15', color: '#185FA5' },
    traite: { bg: '#00c87520', color: '#0F6E56' },
  };
  const ss = statusStyle[demande.statut] || statusStyle.nouveau;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start justify-between" style={{ borderBottomColor: accentColor, borderBottomWidth: '3px' }}>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{demande.titre}</h2>
            <p className="text-sm text-gray-500 mt-1">{demande.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {demande.profil && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2"><User className="w-4 h-4" />{isRdv ? 'Informations du salarié' : 'Informations du chauffeur'}</p>
                {demande.profil_id && onViewProfile && (
                  <button onClick={() => { onViewProfile(demande.profil_id!); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium" style={{ background: '#0073ea' }}><User className="w-3 h-3" />Voir le profil</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs">Nom complet</span><p className="font-medium text-gray-800">{demande.profil?.prenom} {demande.profil?.nom}</p></div>
                <div><span className="text-gray-400 text-xs">Matricule</span><p className="font-medium text-gray-800">{demande.profil?.matricule_tca || contenuData?.matricule || '-'}</p></div>
                <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-gray-800">{demande.profil?.email || '-'}</p></div>
                <div><span className="text-gray-400 text-xs">Poste</span><p className="font-medium text-gray-800">{demande.profil?.poste || '-'}</p></div>
              </div>
            </div>
          )}

          {isRdv && contenuData && (
            <div className="rounded-lg p-4 border" style={{ background: '#fdab3d08', borderColor: '#fdab3d40' }}>
              <p className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#854F0B' }}><Calendar className="w-4 h-4" />Détails du rendez-vous</p>
              {contenuData.rdv_date && (<div className="bg-white rounded-lg p-3 border border-amber-200 mb-2"><span className="text-xs text-gray-400">Date du RDV</span><p className="font-bold text-lg" style={{ color: '#854F0B' }}>{new Date(contenuData.rdv_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>)}
              {contenuData.rdv_heure && (<div className="bg-white rounded-lg p-3 border border-amber-200 mb-2"><span className="text-xs text-gray-400">Heure du RDV</span><p className="font-bold text-lg flex items-center gap-2" style={{ color: '#854F0B' }}><Clock className="w-4 h-4" />{contenuData.rdv_heure}</p></div>)}
              {contenuData.urgence && (<div className="rounded-lg p-3 text-white text-sm font-bold" style={{ background: '#e44258' }}><AlertCircle className="w-4 h-4 inline mr-2" />{contenuData.urgence}</div>)}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />{isRdv ? 'Détails de la notification' : 'Détails de la demande'}</p>
            <div className="space-y-2 text-sm">
              {demande.pole?.nom && (<div className="flex justify-between"><span className="text-gray-400">Pôle</span><span className="font-medium">{demande.pole.nom}</span></div>)}
              <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-medium">{formatDate(demande.created_at)}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-400">Statut</span><span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{demande.statut}</span></div>
              {isRdv && demande.description && (<div className="mt-3 p-3 rounded-lg border text-gray-600" style={{ background: '#fdab3d08', borderColor: '#fdab3d40' }}>{demande.description}</div>)}
              {!isRdv && typeof demande.contenu === 'string' && demande.contenu && (<div className="mt-3 p-3 bg-gray-50 rounded-lg text-gray-600 whitespace-pre-wrap">{demande.contenu}</div>)}
            </div>
          </div>

          {demande.fichiers && demande.fichiers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><Download className="w-4 h-4" />Fichiers joints ({demande.fichiers.length})</p>
              <div className="space-y-2">
                {demande.fichiers.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#0073ea' }} />
                      <div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{file.name}</p><p className="text-xs text-gray-400">{formatFileSize(file.size)}</p></div>
                    </div>
                    <button onClick={() => handleDownloadFile(file.path, file.name)} className="flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-xs font-medium flex-shrink-0" style={{ background: '#0073ea' }}><Download className="w-3 h-3" />Télécharger</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            {demande.statut === 'nouveau' && (<button onClick={() => onUpdateStatus(demande.id, 'consulte')} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: '#0073ea15', color: '#185FA5' }}>Consulté</button>)}
            {demande.statut === 'consulte' && (<button onClick={() => onUpdateStatus(demande.id, 'traite')} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: '#00c87520', color: '#0F6E56' }}>Traité</button>)}
          </div>
          <button onClick={onClose} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ── CreateModal (logique identique, design nettoyé) ──

interface Pole { id: string; nom: string; description: string | null; actif: boolean; }
interface AppUser { id: string; nom: string; prenom: string; pole_id: string | null; pole_nom?: string; }

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { appUserId } = useAuth();
  const [poles, setPoles] = useState<Pole[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [selectedPole, setSelectedPole] = useState<string>('all');
  const [form, setForm] = useState({ assignee_id: '', titre: '', contenu: '', priorite: 'normal' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [polesResult, usersResult] = await Promise.all([supabase.from('poles').select('*').eq('actif', true).order('nom'), supabase.from('app_utilisateur').select('id, nom, prenom, pole_id').eq('actif', true).order('nom')]);
      const polesData = polesResult.data || []; const usersData = usersResult.data || [];
      setPoles(polesData);
      const usersWithPole = usersData.map((user: any) => ({ ...user, pole_nom: polesData.find((p: Pole) => p.id === user.pole_id)?.nom || 'Admin' }));
      setAllUsers(usersWithPole); setFilteredUsers(usersWithPole);
    };
    fetchData();
    const h = () => { fetchData(); }; window.addEventListener('poles-updated', h); return () => { window.removeEventListener('poles-updated', h); };
  }, []);

  useEffect(() => {
    setFilteredUsers(selectedPole === 'all' ? allUsers : allUsers.filter(u => u.pole_id === selectedPole));
    setForm(prev => ({ ...prev, assignee_id: '' }));
  }, [selectedPole, allUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assignee_id || !form.titre) { alert('Remplissez les champs'); return; }
    setSending(true);
    try { await supabase.from('taches').insert({ expediteur_id: appUserId, assignee_id: form.assignee_id, titre: form.titre, contenu: form.contenu, priorite: form.priorite, statut: 'en_attente' }); onSuccess(); } catch (error) { alert('Erreur'); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-xl border border-gray-200">
        <div className="px-6 py-4 border-b" style={{ borderBottomColor: '#0073ea', borderBottomWidth: '3px' }}>
          <h2 className="text-lg font-bold text-gray-900">Nouvelle tâche</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Pôle</label>
            <select value={selectedPole} onChange={(e) => setSelectedPole(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm">
              <option value="all">Tous les pôles</option>
              {poles.map(pole => (<option key={pole.id} value={pole.id}>{pole.nom}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Assigner à *</label>
            <select value={form.assignee_id} onChange={(e) => setForm({...form, assignee_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm" required>
              <option value="">Sélectionner un utilisateur...</option>
              {filteredUsers.map(user => (<option key={user.id} value={user.id}>{user.prenom} {user.nom} ({user.pole_nom})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Titre *</label>
            <input type="text" value={form.titre} onChange={(e) => setForm({...form, titre: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Contenu</label>
            <textarea value={form.contenu} onChange={(e) => setForm({...form, contenu: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Priorité</label>
            <select value={form.priorite} onChange={(e) => setForm({...form, priorite: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm">
              <option value="basse">Basse</option><option value="normal">Normale</option><option value="haute">Haute</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={sending} className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#00c875' }}>{sending ? 'Création...' : 'Créer'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}