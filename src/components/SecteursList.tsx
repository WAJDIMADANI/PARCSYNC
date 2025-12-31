import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, X, Tag } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { Pagination } from './Pagination';

interface Secteur {
  id: string;
  nom: string;
  created_at: string;
}

export function SecteursList() {
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSecteur, setEditingSecteur] = useState<Secteur | null>(null);
  const [formData, setFormData] = useState({ nom: '' });
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadSecteurs();
  }, []);

  const loadSecteurs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secteur')
        .select('*')
        .order('nom', { ascending: true });

      if (error) throw error;
      setSecteurs(data || []);
    } catch (error) {
      console.error('Erreur chargement secteurs:', error);
      alert('Erreur lors du chargement des secteurs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (secteur?: Secteur) => {
    if (secteur) {
      setEditingSecteur(secteur);
      setFormData({ nom: secteur.nom });
    } else {
      setEditingSecteur(null);
      setFormData({ nom: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSecteur(null);
    setFormData({ nom: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      alert('Le nom du secteur est obligatoire');
      return;
    }

    try {
      setSaving(true);

      if (editingSecteur) {
        const { error } = await supabase
          .from('secteur')
          .update({ nom: formData.nom.trim() })
          .eq('id', editingSecteur.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('secteur')
          .insert([{ nom: formData.nom.trim() }]);

        if (error) throw error;
      }

      await loadSecteurs();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur sauvegarde secteur:', error);
      alert('Erreur lors de la sauvegarde du secteur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (secteur: Secteur) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le secteur "${secteur.nom}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('secteur')
        .delete()
        .eq('id', secteur.id);

      if (error) throw error;
      await loadSecteurs();
    } catch (error) {
      console.error('Erreur suppression secteur:', error);
      alert('Erreur lors de la suppression. Le secteur est peut-être utilisé par des candidats ou salariés.');
    }
  };

  const filteredSecteurs = secteurs.filter(secteur =>
    secteur.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSecteurs = filteredSecteurs.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Secteurs</h1>
            <p className="text-sm text-gray-600">{secteurs.length} secteur{secteurs.length > 1 ? 's' : ''} configuré{secteurs.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter un secteur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un secteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nom du secteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSecteurs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Aucun secteur trouvé' : 'Aucun secteur configuré'}
                  </td>
                </tr>
              ) : (
                paginatedSecteurs.map((secteur) => (
                  <tr key={secteur.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-gray-900">{secteur.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(secteur.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(secteur)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(secteur)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredSecteurs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredSecteurs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSecteur ? 'Modifier le secteur' : 'Nouveau secteur'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du secteur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ nom: e.target.value })}
                  placeholder="Ex: Administration, Commercial, Technique..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Enregistrement...' : (editingSecteur ? 'Modifier' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
