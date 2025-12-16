import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Plus, Clock, CheckCircle, AlertCircle, User, Calendar, Trash2 } from 'lucide-react';
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
        .eq('assignee_id', appUserId)
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
  onClose: () => void;
  onUpdateStatus: (taskId: string, status: 'en_attente' | 'en_cours' | 'completee') => void;
  onDelete: (taskId: string) => void;
}

function TaskDetailModal({ task, onClose, onUpdateStatus, onDelete }: TaskDetailModalProps) {
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
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Inbox className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Détails de la tâche</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <span className="text-white text-2xl">&times;</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{task.titre}</h3>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(task.priorite)}`}>
                Priorité : {task.priorite.charAt(0).toUpperCase() + task.priorite.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Créé le {new Date(task.created_at).toLocaleDateString('fr-FR')} à{' '}
                {new Date(task.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-medium text-gray-700">De :</p>
            </div>
            <p className="text-gray-900 font-medium">
              {task.expediteur_prenom} {task.expediteur_nom}
            </p>
            <p className="text-gray-600 text-sm">{task.expediteur_email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Contenu :</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-900 whitespace-pre-wrap">{task.contenu}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Actions :</p>
            <div className="flex flex-wrap gap-3">
              {task.statut === 'en_attente' && (
                <button
                  onClick={() => onUpdateStatus(task.id, 'en_cours')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <AlertCircle className="w-4 h-4" />
                  Marquer comme en cours
                </button>
              )}

              {task.statut === 'en_cours' && (
                <button
                  onClick={() => onUpdateStatus(task.id, 'completee')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marquer comme complétée
                </button>
              )}

              {task.statut === 'completee' && (
                <button
                  onClick={() => onUpdateStatus(task.id, 'en_attente')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  <Clock className="w-4 h-4" />
                  Remettre en attente
                </button>
              )}

              <button
                onClick={() => {
                  onDelete(task.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
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
  const { user } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    assignee_id: '',
    titre: '',
    contenu: '',
    priorite: 'normal' as 'haute' | 'normal' | 'basse'
  });

  useEffect(() => {
    fetchUtilisateurs();
  }, []);

  const fetchUtilisateurs = async () => {
    try {
      const { data, error } = await supabase
        .from('app_utilisateur')
        .select('id, nom, prenom, email')
        .order('nom');

      if (error) throw error;
      setUtilisateurs(data || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assignee_id || !formData.titre) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('taches')
        .insert({
          expediteur_id: user?.id,
          assignee_id: formData.assignee_id,
          titre: formData.titre,
          contenu: formData.contenu,
          priorite: formData.priorite,
          statut: 'en_attente'
        });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Erreur création tâche:', error);
      alert('Erreur lors de la création de la tâche');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <LoadingSpinner size="lg" text="Chargement..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Plus className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Nouvelle tâche</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <span className="text-white text-2xl">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigner à <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner un utilisateur</option>
              {utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.email})
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Vérifier les contrats de décembre"
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
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Décrivez la tâche en détail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorité
            </label>
            <select
              value={formData.priorite}
              onChange={(e) => setFormData({ ...formData, priorite: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="basse">Basse</option>
              <option value="normal">Normale</option>
              <option value="haute">Haute</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {submitting ? (
                <LoadingSpinner size="sm" variant="white" text="Création..." />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Créer la tâche
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
