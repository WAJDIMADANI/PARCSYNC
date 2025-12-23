import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Search, Edit, Copy, Trash2, Eye } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { LetterTemplateModal } from './LetterTemplateModal';
import { ConfirmModal } from './ConfirmModal';

interface LetterTemplate {
  id: string;
  nom: string;
  type_courrier: string;
  sujet: string;
  contenu: string;
  variables_systeme: string[];
  variables_personnalisees: Record<string, any>;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export function LetterTemplatesManager() {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActif, setFilterActif] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean, template: LetterTemplate | null }>({ show: false, template: null });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('modele_courrier')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleEdit = (template: LetterTemplate) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleDuplicate = async (template: LetterTemplate) => {
    try {
      const { error } = await supabase
        .from('modele_courrier')
        .insert({
          nom: `${template.nom} (Copie)`,
          type_courrier: template.type_courrier,
          sujet: template.sujet,
          contenu: template.contenu,
          variables_systeme: template.variables_systeme,
          variables_personnalisees: template.variables_personnalisees,
          actif: false,
          created_by: user?.id
        });

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('Erreur duplication modèle:', error);
    }
  };

  const handleDelete = async (template: LetterTemplate) => {
    setDeleteConfirm({ show: true, template });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.template) return;

    setDeleteError(null);
    try {
      const { error } = await supabase
        .from('modele_courrier')
        .delete()
        .eq('id', deleteConfirm.template.id);

      if (error) throw error;
      fetchTemplates();
      setDeleteConfirm({ show: false, template: null });
    } catch (error: any) {
      console.error('Erreur suppression modèle:', error);
      setDeleteError(error.message || 'Erreur lors de la suppression du modèle');
      setDeleteConfirm({ show: false, template: null });
    }
  };

  const handleToggleActif = async (template: LetterTemplate) => {
    try {
      const { error } = await supabase
        .from('modele_courrier')
        .update({ actif: !template.actif })
        .eq('id', template.id);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('Erreur modification statut:', error);
    }
  };


  const getUniqueTypes = () => {
    const types = templates.map(t => t.type_courrier);
    return [...new Set(types)];
  };

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.nom.toLowerCase().includes(search.toLowerCase()) ||
      t.type_courrier.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type_courrier === filterType;
    const matchActif = filterActif === 'all' ||
      (filterActif === 'actif' && t.actif) ||
      (filterActif === 'inactif' && !t.actif);

    return matchSearch && matchType && matchActif;
  });

  const stats = {
    total: templates.length,
    actifs: templates.filter(t => t.actif).length,
    types: getUniqueTypes().length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des modèles..." />
      </div>
    );
  }

  return (
    <div>
      {deleteError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-red-600">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-900">Erreur de suppression</p>
              <p className="text-sm text-red-700 mt-1">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modèles de Courriers</h1>
            <p className="text-gray-600 mt-1">Créez et gérez vos modèles de courriers personnalisables</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau modèle
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total de modèles</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Modèles actifs</div>
            <div className="text-2xl font-bold text-green-600">{stats.actifs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Types de courriers</div>
            <div className="text-2xl font-bold text-blue-600">{stats.types}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un modèle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            {getUniqueTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterActif}
            onChange={(e) => setFilterActif(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">Actifs uniquement</option>
            <option value="inactif">Inactifs uniquement</option>
          </select>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Aucun modèle trouvé</p>
          <p className="text-gray-500 text-sm mb-4">Créez votre premier modèle de courrier</p>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Créer un modèle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom du modèle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variables
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date création
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTemplates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.nom}</div>
                        <div className="text-xs text-gray-500">{template.sujet}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {template.type_courrier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                        🔵 {template.variables_systeme?.length || 0}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-600">
                        🟠 {Object.keys(template.variables_personnalisees || {}).length}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActif(template)}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${template.actif
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } transition-colors`}
                    >
                      {template.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(template.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <LetterTemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingTemplate(null);
            fetchTemplates();
          }}
        />
      )}

      {deleteConfirm.show && deleteConfirm.template && (
        <ConfirmModal
          isOpen={deleteConfirm.show}
          title="Supprimer le modèle"
          message={`Êtes-vous sûr de vouloir supprimer le modèle "${deleteConfirm.template.nom}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          type="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ show: false, template: null })}
        />
      )}
    </div>
  );
}
