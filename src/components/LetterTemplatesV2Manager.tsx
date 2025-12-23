import { useState } from 'react';
import { FileText, Plus, Download, Trash2 } from 'lucide-react';
import { useLetterTemplatesV2 } from '../hooks/useLetterTemplatesV2';
import { LetterVariablesExtractor } from '../lib/LetterVariablesExtractor';
import { LoadingSpinner } from './LoadingSpinner';
import { ConfirmModal } from './ConfirmModal';

export function LetterTemplatesV2Manager() {
  const { templates, loading, error, createTemplate, toggleTemplate, deleteTemplate, downloadTemplate } =
    useLetterTemplatesV2();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    template: any | null;
  }>({ show: false, template: null });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActif, setFilterActif] = useState<string>('all');

  const [formData, setFormData] = useState({
    nom: '',
    type_courrier: 'Attestation',
    description: '',
    file: null as File | null,
    variables: [] as string[]
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setUploadError('Veuillez sélectionner un fichier .docx');
      return;
    }

    setUploadError(null);

    try {
      const variables = await LetterVariablesExtractor.extractVariablesFromWordFile(file);
      const { requises, optionnelles } = LetterVariablesExtractor.analyzeVariables(variables);
      const suggestedName = LetterVariablesExtractor.suggestTemplateName(variables);
      const detectedType = LetterVariablesExtractor.detectLetterType(variables);

      setFormData(prev => ({
        ...prev,
        file,
        nom: suggestedName,
        type_courrier: detectedType,
        variables: variables.map(v => v.name)
      }));

      console.log('Variables detectees:', variables);
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors de la lecture du fichier');
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);

    try {
      if (!formData.file) throw new Error('Aucun fichier selectionne');
      if (!formData.nom.trim()) throw new Error('Veuillez entrer un nom');

      const variables = await LetterVariablesExtractor.extractVariablesFromWordFile(formData.file);
      const { requises, optionnelles } = LetterVariablesExtractor.analyzeVariables(variables);

      await createTemplate({
        nom: formData.nom.trim(),
        type_courrier: formData.type_courrier,
        description: formData.description.trim() || undefined,
        file: formData.file,
        variables_detectees: formData.variables,
        variables_requises: requises,
        variables_optionnelles: optionnelles
      });

      setFormData({
        nom: '',
        type_courrier: 'Attestation',
        description: '',
        file: null,
        variables: []
      });
      setShowUploadForm(false);
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors de la creation');
    } finally {
      setUploading(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchSearch =
      t.nom.toLowerCase().includes(search.toLowerCase()) ||
      t.type_courrier.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type_courrier === filterType;
    const matchActif =
      filterActif === 'all' ||
      (filterActif === 'actif' && t.actif) ||
      (filterActif === 'inactif' && !t.actif);

    return matchSearch && matchType && matchActif;
  });

  const getUniqueTypes = () => {
    const types = templates.map(t => t.type_courrier);
    return [...new Set(types)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des modeles..." />
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
            <h1 className="text-3xl font-bold text-gray-900">Modeles de Courriers V2</h1>
            <p className="text-gray-600 mt-1">Gestion des modeles Word avec auto-detection des variables</p>
          </div>
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un modele
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total de modeles</div>
            <div className="text-2xl font-bold text-gray-900">{templates.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Modeles actifs</div>
            <div className="text-2xl font-bold text-green-600">{templates.filter(t => t.actif).length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Types de courriers</div>
            <div className="text-2xl font-bold text-blue-600">{getUniqueTypes().length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Rechercher un modele..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            {getUniqueTypes().map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={filterActif}
            onChange={e => setFilterActif(e.target.value)}
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
          <p className="text-gray-600 text-lg mb-2">Aucun modele trouve</p>
          <p className="text-gray-500 text-sm mb-4">Importez votre premier fichier Word</p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Importer un modele
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom du modele
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTemplates.map(template => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.nom}</div>
                        <div className="text-xs text-gray-500">{template.description || 'Pas de description'}</div>
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
                        Detectees: {template.variables_detectees?.length || 0}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-600">
                        Requises: {template.variables_requises?.length || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleTemplate(template.id, !template.actif)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        template.actif
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {template.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => downloadTemplate(template.fichier_word_url, template.nom + '.docx')}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="Telecharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ show: true, template })}
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

      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">Importer un modele Word</h2>
            </div>

            <form onSubmit={handleSubmitUpload} className="p-6 space-y-4">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fichier Word (.docx) *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {formData.file ? formData.file.name : 'Cliquez ou glissez votre fichier .docx'}
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du modele *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ex: Avertissement Disciplinaire"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de courrier *</label>
                <select
                  value={formData.type_courrier}
                  onChange={e => setFormData(prev => ({ ...prev, type_courrier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Attestation">Attestation</option>
                  <option value="Avertissement">Avertissement</option>
                  <option value="Convocation">Convocation</option>
                  <option value="Felicitations">Felicitations</option>
                  <option value="Rappel">Rappel</option>
                  <option value="Sanction">Sanction</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Decrivez ce modele..."
                />
              </div>

              {formData.variables.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    {formData.variables.length} variable(s) detectee(s)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map(v => (
                      <span key={v} className="px-2 py-1 text-xs font-mono bg-white text-blue-700 rounded border border-blue-200">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.file}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Import en cours...' : 'Importer le modele'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.show && deleteConfirm.template && (
        <ConfirmModal
          isOpen={deleteConfirm.show}
          title="Supprimer le modele"
          message={`Etes-vous sur de vouloir supprimer le modele "${deleteConfirm.template.nom}" ? Cette action est irreversible.`}
          confirmText="Supprimer"
          type="danger"
          onConfirm={async () => {
            setDeleteError(null);
            try {
              await deleteTemplate(deleteConfirm.template.id, deleteConfirm.template.fichier_word_url);
              setDeleteConfirm({ show: false, template: null });
            } catch (err: any) {
              console.error('Erreur suppression:', err);
              setDeleteError(err.message || 'Erreur lors de la suppression du modele');
              setDeleteConfirm({ show: false, template: null });
            }
          }}
          onCancel={() => setDeleteConfirm({ show: false, template: null })}
        />
      )}
    </div>
  );
}
