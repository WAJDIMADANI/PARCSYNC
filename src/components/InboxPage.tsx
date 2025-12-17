import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Plus, Clock, CheckCircle, AlertCircle, User, Calendar } from 'lucide-react';
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
          <div className="p-3 bg-blue-600 rounded-xl">
            <Inbox className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Boîte de Réception</h1>
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
            filteredTaches.map(tache => (
              <div key={tache.id} onClick={() => setSelectedTask(tache)} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tache.titre}</p>
                    <p className="text-sm text-gray-500">{tache.expediteur_prenom} {tache.expediteur_nom}</p>
                  </div>
                  <div className="flex items-center gap-3">
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
            ))
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
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{task.titre}</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-80">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">De : {task.expediteur_prenom} {task.expediteur_nom}</p>
            <p className="text-sm text-gray-600">{task.expediteur_email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">Créé le :</p>
            <p className="text-sm text-gray-600">{new Date(task.created_at).toLocaleDateString('fr-FR')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Contenu :</p>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-900 whitespace-pre-wrap">{task.contenu}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {task.statut === 'en_attente' && (
              <button onClick={() => onUpdateStatus(task.id, 'en_cours')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                Marquer en cours
              </button>
            )}
            {task.statut === 'en_cours' && (
              <button onClick={() => onUpdateStatus(task.id, 'completee')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                Marquer complétée
              </button>
            )}
            <button onClick={() => { onDelete(task.id); onClose(); }} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Supprimer
            </button>
            <button onClick={onClose} className="px-4 py-2 border rounded text-sm ml-auto hover:bg-gray-100">
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