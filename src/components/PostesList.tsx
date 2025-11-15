import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Archive, Loader2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Poste {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  created_at: string;
}

export function PostesList() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoste, setEditingPoste] = useState<Poste | null>(null);
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const [error, setError] = useState('');
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [posteToArchive, setPosteToArchive] = useState<Poste | null>(null);

  useEffect(() => {
    fetchPostes();
  }, []);

  const fetchPostes = async () => {
    try {
      const { data, error } = await supabase
        .from('poste')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setPostes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (poste?: Poste) => {
    if (poste) {
      setEditingPoste(poste);
      setFormData({ nom: poste.nom, description: poste.description || '' });
    } else {
      setEditingPoste(null);
      setFormData({ nom: '', description: '' });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPoste(null);
    setFormData({ nom: '', description: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingPoste) {
        const { error } = await supabase
          .from('poste')
          .update({
            nom: formData.nom,
            description: formData.description || null,
          })
          .eq('id', editingPoste.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('poste')
          .insert([{
            nom: formData.nom,
            description: formData.description || null,
          }]);

        if (error) throw error;
      }

      await fetchPostes();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = (poste: Poste) => {
    setPosteToArchive(poste);
    setArchiveModalOpen(true);
  };

  const confirmArchive = async () => {
    if (!posteToArchive) return;

    try {
      const { error } = await supabase
        .from('poste')
        .update({ actif: false })
        .eq('id', posteToArchive.id);

      if (error) throw error;
      await fetchPostes();
      setArchiveModalOpen(false);
      setPosteToArchive(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Postes</h1>
          <p className="text-slate-600 mt-1">Gérer les postes disponibles</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter un poste
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nom du poste
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {postes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Aucun poste disponible. Cliquez sur "Ajouter un poste" pour commencer.
                  </td>
                </tr>
              ) : (
                postes.map((poste) => (
                  <tr key={poste.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{poste.nom}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">
                        {poste.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">
                        {new Date(poste.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(poste)}
                          className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(poste)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Archiver"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingPoste ? 'Modifier le poste' : 'Ajouter un poste'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="nom" className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom du poste *
                </label>
                <input
                  id="nom"
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder="Ex: Chauffeur VTC"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                  placeholder="Description du poste..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  {editingPoste ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={archiveModalOpen}
        onClose={() => {
          setArchiveModalOpen(false);
          setPosteToArchive(null);
        }}
        onConfirm={confirmArchive}
        title="Archiver le poste"
        message={`Êtes-vous sûr de vouloir archiver le poste "${posteToArchive?.nom}" ? Il ne sera plus visible dans le formulaire de candidature.`}
        confirmText="Archiver"
        confirmColor="red"
      />
    </div>
  );
}
