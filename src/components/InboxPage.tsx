import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Plus, Clock, CheckCircle, AlertCircle, User, Calendar, Send, Reply } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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
  lu_par_assignee: boolean;
  date_derniere_reponse: string | null;
}

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({ en_attente: 0, en_cours: 0, completee: 0, total: 0, non_lus: 0 });
  const [selectedTask, setSelectedTask] = useState<Tache | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'en_cours' | 'completee'>('all');

  useEffect(() => {
    fetchTaches();

    // Abonnement temps réel pour les mises à jour de tâches
    const subscription = supabase
      .channel('taches_changes')
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
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, appUserId]);

  const fetchTaches = async () => {
    if (!user || !appUserId) return;

    try {
      const { data, error } = await supabase
        .from('taches')
        .select(`
          *,
          expediteur:expediteur_id(nom, prenom, email),
          assignee:assignee_id(nom, prenom, email)
        `)
        .or(`assignee_id.eq.${appUserId},expediteur_id.eq.${appUserId}`)
        .order('date_derniere_reponse', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const formattedTaches = data.map((t: any) => ({
        ...t,
        expediteur_nom: t.expediteur?.nom || '',
        expediteur_prenom: t.expediteur?.prenom || '',
        expediteur_email: t.expediteur?.email || '',
        lu_par_assignee: t.lu_par_assignee ?? false
      }));

      setTaches(formattedTaches);

      // Compter uniquement les tâches non lues où je suis assignee
      const nonLus = formattedTaches.filter((t: Tache) =>
        t.assignee_id === appUserId && !t.lu_par_assignee
      ).length;

      const newStats = {
        en_attente: formattedTaches.filter((t: Tache) => t.statut === 'en_attente').length,
        en_cours: formattedTaches.filter((t: Tache) => t.statut === 'en_cours').length,
        completee: formattedTaches.filter((t: Tache) => t.statut === 'completee').length,
        total: formattedTaches.length,
        non_lus: nonLus
      };
      setStats(newStats);
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
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
    // Marquer comme lu seulement si je suis l'assignee et que ce n'est pas déjà lu
    if (tache.assignee_id === appUserId && !tache.lu_par_assignee) {
      try {
        const { error } = await supabase.rpc('mark_task_as_read', { task_uuid: tache.id });

        if (!error) {
          // Mettre à jour l'état local
          setTaches(prev => prev.map(t =>
            t.id === tache.id ? { ...t, lu_par_assignee: true } : t
          ));

          // Mettre à jour les stats
          setStats(prev => ({ ...prev, non_lus: Math.max(0, prev.non_lus - 1) }));
        }
      } catch (error) {
        console.error('Erreur marquage lu:', error);
      }
    }
  };

  const handleOpenTask = (tache: Tache) => {
    setSelectedTask(tache);
    markAsRead(tache);
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'haute': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'basse': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'en_attente': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'en_cours': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'completee': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const filteredTaches = filter === 'all' ? taches : taches.filter(t => t.statut === filter);

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
          <div className="p-3 bg-blue-600 rounded-xl relative">
            <Inbox className="w-8 h-8 text-white" />
            {stats.non_lus > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {stats.non_lus}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              Boîte de Réception
              {stats.non_lus > 0 && (
                <span className="ml-2 text-lg text-blue-600">
                  ({stats.non_lus} non {stats.non_lus === 1 ? 'lu' : 'lus'})
                </span>
              )}
            </h1>
            <p className="text-gray-600">Tâches assignées</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nouvelle tâche
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Inbox className="w-10 h-10 text-gray-400" />} />
        <StatCard label="En attente" value={stats.en_attente} icon={<Clock className="w-10 h-10 text-orange-400" />} />
        <StatCard label="En cours" value={stats.en_cours} icon={<AlertCircle className="w-10 h-10 text-blue-400" />} />
        <StatCard label="Complétées" value={stats.completee} icon={<CheckCircle className="w-10 h-10 text-green-400" />} />
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="border-b p-4 flex gap-2">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Toutes ({stats.total})</FilterButton>
          <FilterButton active={filter === 'en_attente'} onClick={() => setFilter('en_attente')}>En attente ({stats.en_attente})</FilterButton>
          <FilterButton active={filter === 'en_cours'} onClick={() => setFilter('en_cours')}>En cours ({stats.en_cours})</FilterButton>
          <FilterButton active={filter === 'completee'} onClick={() => setFilter('completee')}>Complétées ({stats.completee})</FilterButton>
        </div>

        <div className="divide-y">
          {filteredTaches.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Aucune tâche</div>
          ) : (
            filteredTaches.map(tache => {
              const isUnread = tache.assignee_id === appUserId && !tache.lu_par_assignee;
              return (
                <div
                  key={tache.id}
                  onClick={() => handleOpenTask(tache)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${isUnread ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {isUnread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" title="Non lu" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-gray-900 truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>
                          {tache.titre}
                        </p>
                        <p className={`text-sm text-gray-500 ${isUnread ? 'font-semibold' : ''}`}>
                          {tache.expediteur_prenom} {tache.expediteur_nom}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-3 py-1 text-xs font-medium rounded ${getPriorityColor(tache.priorite)}`}>
                        {tache.priorite}
                      </span>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(tache.statut)}
                        <span className="text-sm text-gray-600">{tache.statut}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={updateTaskStatus}
          onDelete={deleteTask}
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
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded font-medium ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded ${task.priorite === 'haute' ? 'bg-red-100 text-red-800' : task.priorite === 'normal' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                {task.priorite}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${task.statut === 'completee' ? 'bg-green-100 text-green-800' : task.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
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
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setReplyText('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-gray-50 p-4 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {!showReply && (
                <button
                  onClick={() => setShowReply(true)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium"
                >
                  <Reply className="w-4 h-4" />
                  Répondre
                </button>
              )}
              {task.statut === 'en_attente' && (
                <button onClick={() => onUpdateStatus(task.id, 'en_cours')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Marquer en cours
                </button>
              )}
              {task.statut === 'en_cours' && (
                <button onClick={() => onUpdateStatus(task.id, 'completee')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  Marquer complétée
                </button>
              )}
            </div>
            <button onClick={() => { if (confirm('Supprimer cette tâche ?')) { onDelete(task.id); onClose(); } }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
              Supprimer
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

function CreateModal({ onClose, onSuccess }: CreateModalProps) {
  const { appUserId } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ assignee_id: '', titre: '', contenu: '', priorite: 'normal' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('app_utilisateur').select('id, nom, prenom').order('nom');
      setUsers(data || []);
    };
    fetch();
  }, []);

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
      <div className="bg-white rounded-xl w-full max-w-2xl">
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-bold">Nouvelle tâche</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assigner à *</label>
            <select value={form.assignee_id} onChange={(e) => setForm({...form, assignee_id: e.target.value})} className="w-full px-3 py-2 border rounded" required>
              <option value="">Sélectionner...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Titre *</label>
            <input type="text" value={form.titre} onChange={(e) => setForm({...form, titre: e.target.value})} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contenu</label>
            <textarea value={form.contenu} onChange={(e) => setForm({...form, contenu: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priorité</label>
            <select value={form.priorite} onChange={(e) => setForm({...form, priorite: e.target.value})} className="w-full px-3 py-2 border rounded">
              <option value="basse">Basse</option>
              <option value="normal">Normale</option>
              <option value="haute">Haute</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {sending ? 'Création...' : 'Créer'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}