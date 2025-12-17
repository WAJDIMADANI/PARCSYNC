import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Plus, Clock, CheckCircle, AlertCircle, User, Calendar, Trash2, Send, Mail } from 'lucide-react';
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
  unread_count?: number;
}

interface Message {
  id: string;
  tache_id: string;
  auteur_id: string;
  contenu: string;
  is_read: boolean;
  created_at: string;
  auteur_nom?: string;
  auteur_prenom?: string;
  auteur_email?: string;
}

interface TaskStats {
  en_attente: number;
  en_cours: number;
  completee: number;
  total: number;
}

export function InboxPage() {
  const { user, appUserId } = useAuth();
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({ en_attente: 0, en_cours: 0, completee: 0, total: 0 });
  const [selectedTask, setSelectedTask] = useState<Tache | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'en_cours' | 'completee'>('all');

  useEffect(() => {
    fetchTaches();

    const channel = supabase
      .channel('taches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => {
        fetchTaches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTaches = data.map((t: any) => ({
        ...t,
        expediteur_nom: t.expediteur?.nom || '',
        expediteur_prenom: t.expediteur?.prenom || '',
        expediteur_email: t.expediteur?.email || ''
      }));

      setTaches(formattedTaches);

      const newStats = {
        en_attente: formattedTaches.filter((t: Tache) => t.statut === 'en_attente').length,
        en_cours: formattedTaches.filter((t: Tache) => t.statut === 'en_cours').length,
        completee: formattedTaches.filter((t: Tache) => t.statut === 'completee').length,
        total: formattedTaches.length
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
      console.error('Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette tâche ?')) return;

    try {
      const { error } = await supabase
        .from('taches')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTaches(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'haute': return 'bg-red-100 text-red-800 border-red-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'basse': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'en_attente': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'en_cours': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'completee': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'completee': return 'Complétée';
      default: return statut;
    }
  };

  const filteredTaches = filter === 'all'
    ? taches
    : taches.filter(t => t.statut === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des tâches..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Inbox className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Boîte de Réception</h1>
            <p className="text-gray-600 mt-1">Gérez vos tâches assignées</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          Nouvelle tâche
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Inbox className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">En attente</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.en_attente}</p>
            </div>
            <Clock className="w-10 h-10 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">En cours</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.en_cours}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Complétées</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.completee}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Toutes ({stats.total})
            </button>
            <button
              onClick={() => setFilter('en_attente')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'en_attente'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              En attente ({stats.en_attente})
            </button>
            <button
              onClick={() => setFilter('en_cours')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'en_cours'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              En cours ({stats.en_cours})
            </button>
            <button
              onClick={() => setFilter('completee')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'completee'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Complétées ({stats.completee})
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredTaches.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune tâche</p>
            </div>
          ) : (
            filteredTaches.map((tache) => (
              <div
                key={tache.id}
                onClick={() => setSelectedTask(tache)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {tache.expediteur_prenom} {tache.expediteur_nom}
                      </p>
                      <p className="text-gray-500 text-xs">{tache.expediteur_email}</p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tache.titre}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{tache.contenu}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(tache.priorite)}`}>
                      {tache.priorite.charAt(0).toUpperCase() + tache.priorite.slice(1)}
                    </span>

                    <div className="flex items-center gap-2">
                      {getStatusIcon(tache.statut)}
                      <span className="text-sm text-gray-600 font-medium">
                        {getStatusLabel(tache.statut)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {new Date(tache.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          appUserId={appUserId}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={updateTaskStatus}
          onDelete={deleteTask}
        />
      )}

      {showCreateModal && (
        <CreateTaskModal
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

interface TaskDetailModalProps {
  task: Tache;
  appUserId: string | null;
  onClose: () => void;
  onUpdateStatus: (taskId: string, status: 'en_attente' | 'en_cours' | 'completee') => void;
  onDelete: (taskId: string) => void;
}

function TaskDetailModal({ task, appUserId, onClose, onUpdateStatus, onDelete }: TaskDetailModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!task) return;
    
    setLoadingMessages(true);
    loadMessages();

    // Subscription temps réel
    const channel = supabase
      .channel(`messages-${task.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages_tache', filter: `tache_id=eq.${task.id}` },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages_tache')
        .select('*')
        .eq('tache_id', task.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Join avec app_utilisateur pour les noms
      const { data: usersData } = await supabase
        .from('app_utilisateur')
        .select('id, nom, prenom, email');

      const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

      const formattedMessages = (data || []).map(m => ({
        ...m,
        auteur_nom: userMap.get(m.auteur_id)?.nom || 'Inconnu',
        auteur_prenom: userMap.get(m.auteur_id)?.prenom || '',
        auteur_email: userMap.get(m.auteur_id)?.email || ''
      }));

      setMessages(formattedMessages);
      setLoadingMessages(false);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !appUserId) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages_tache')
        .insert({
          tache_id: task.id,
          auteur_id: appUserId,
          contenu: newMessage.trim(),
          is_read: true
        });

      if (error) throw error;

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Supprimer ce message ?')) return;

    try {
      const { error } = await supabase
        .from('messages_tache')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'haute': return 'bg-red-100 text-red-800 border-red-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'basse': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Détails de la tâche</h2>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:opacity-80"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{task.titre}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(task.priorite)}`}>
                  {task.priorite}
                </span>
                <span className="text-sm text-gray-500">
                  Créé le {new Date(task.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">De : {task.expediteur_prenom} {task.expediteur_nom}</p>
              <p className="text-sm text-gray-600">{task.expediteur_email}</p>
            </div>

            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-900 whitespace-pre-wrap">{task.contenu}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-6 space-y-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900">Conversation ({messages.length})</h4>

            {loadingMessages ? (
              <LoadingSpinner size="sm" text="Chargement..." />
            ) : messages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun message</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {messages.map(msg => (
                  <div key={msg.id} className="bg-white rounded p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {msg.auteur_prenom} {msg.auteur_nom}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{msg.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ajouter un message..."
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </form>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 flex gap-2">
          {task.statut === 'en_attente' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'en_cours')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Marquer en cours
            </button>
          )}
          {task.statut === 'en_cours' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'completee')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
            >
              Marquer complétée
            </button>
          )}
          <button
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium ml-auto"
          >
            Supprimer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTaskModal({ onClose, onSuccess }: CreateTaskModalProps) {
  const { appUserId } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    assignee_id: '',
    titre: '',
    contenu: '',
    priorite: 'normal'
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from('app_utilisateur')
          .select('id, nom, prenom, email')
          .order('nom');
        setUtilisateurs(data || []);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assignee_id || !formData.titre) {
      alert('Remplissez les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('taches')
        .insert({
          expediteur_id: appUserId,
          assignee_id: formData.assignee_id,
          titre: formData.titre,
          contenu: formData.contenu,
          priorite: formData.priorite,
          statut: 'en_attente'
        });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <LoadingSpinner size="lg" text="Chargement..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Nouvelle tâche</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigner à <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner...</option>
              {utilisateurs.map(u => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenu
            </label>
            <textarea
              value={formData.contenu}
              onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
            <select
              value={formData.priorite}
              onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="basse">Basse</option>
              <option value="normal">Normale</option>
              <option value="haute">Haute</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {submitting ? 'Création...' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}