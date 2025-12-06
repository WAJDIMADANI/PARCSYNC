import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Edit, Trash2, Eye, Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { extractVariables, classifyVariables } from '../lib/letterTemplateGenerator';
import { VariableInsertButtons } from './VariableInsertButtons';
import { CustomVariableForm } from './CustomVariableForm';

interface LetterTemplate {
  id: string;
  nom: string;
  type_courrier: string;
  sujet: string;
  contenu: string;
  variables_systeme: string[];
  variables_personnalisees: Record<string, any>;
  actif: boolean;
}

interface LetterTemplateModalProps {
  template: LetterTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

const TYPES_COURRIER = [
  'Attestation',
  'Avertissement',
  'Convocation',
  'Félicitations',
  'Rappel',
  'Sanction',
  'Autre'
];

export function LetterTemplateModal({ template, onClose, onSave }: LetterTemplateModalProps) {
  const [nom, setNom] = useState(template?.nom || '');
  const [typeCourrier, setTypeCourrier] = useState(template?.type_courrier || 'Attestation');
  const [sujet, setSujet] = useState(template?.sujet || '');
  const [contenu, setContenu] = useState(template?.contenu || '');
  const [actif, setActif] = useState(template?.actif ?? true);
  const [customVariables, setCustomVariables] = useState<Record<string, any>>(template?.variables_personnalisees || {});
  const [showCustomVarForm, setShowCustomVarForm] = useState(false);
  const [editingCustomVar, setEditingCustomVar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'contenu' | 'variables'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const contenuRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const detectedVariables = extractVariables(`${sujet} ${contenu}`);
  const classified = classifyVariables(detectedVariables, Object.keys(customVariables));

  const insertVariable = (variable: string) => {
    const textarea = contenuRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const varText = `{{${variable}}}`;

    setContenu(before + varText + after);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + varText.length;
    }, 0);
  };

  const insertHtmlTag = (tag: string, openTag: string, closeTag: string) => {
    const textarea = contenuRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = selectedText.length > 0
      ? `${before}${openTag}${selectedText}${closeTag}${after}`
      : `${before}${openTag}${closeTag}${after}`;

    setContenu(newText);

    setTimeout(() => {
      textarea.focus();
      const cursorPos = selectedText.length > 0
        ? start + openTag.length + selectedText.length + closeTag.length
        : start + openTag.length;
      textarea.selectionStart = textarea.selectionEnd = cursorPos;
    }, 0);
  };

  const addCustomVariable = (variable: any) => {
    setCustomVariables({
      ...customVariables,
      [variable.name]: {
        label: variable.label,
        type: variable.type,
        required: variable.required,
        options: variable.options,
        ordre: variable.ordre
      }
    });
    setShowCustomVarForm(false);
    setEditingCustomVar(null);
  };

  const removeCustomVariable = (name: string) => {
    const newVars = { ...customVariables };
    delete newVars[name];
    setCustomVariables(newVars);
  };

  const editCustomVariable = (originalName: string) => {
    setEditingCustomVar(originalName);
    setShowCustomVarForm(true);
  };

  const updateCustomVariable = (variable: any) => {
    const newVars = { ...customVariables };

    // If name changed, remove the old one
    if (editingCustomVar && editingCustomVar !== variable.name) {
      delete newVars[editingCustomVar];
    }

    // Add or update the variable
    newVars[variable.name] = {
      label: variable.label,
      type: variable.type,
      required: variable.required,
      options: variable.options,
      ordre: variable.ordre
    };

    setCustomVariables(newVars);
    setShowCustomVarForm(false);
    setEditingCustomVar(null);
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      setError('Le nom du modèle est requis');
      return;
    }
    if (!sujet.trim()) {
      setError('Le sujet du courrier est requis');
      return;
    }
    if (!contenu.trim()) {
      setError('Le contenu du courrier est requis');
      return;
    }

    if (classified.unknown.length > 0) {
      setError(`Variables non définies: ${classified.unknown.join(', ')}. Ajoutez-les dans les variables personnalisées ou corrigez-les.`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        nom: nom.trim(),
        type_courrier: typeCourrier,
        sujet: sujet.trim(),
        contenu: contenu.trim(),
        variables_systeme: classified.system,
        variables_personnalisees: customVariables,
        actif,
        created_by: template ? undefined : user?.id
      };

      if (template) {
        const { error } = await supabase
          .from('modele_courrier')
          .update(data)
          .eq('id', template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('modele_courrier')
          .insert(data);

        if (error) throw error;
      }

      onSave();
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {template ? 'Modifier le modèle' : 'Nouveau modèle de courrier'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'general'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              1. Informations
            </button>
            <button
              onClick={() => setActiveTab('contenu')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'contenu'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              2. Contenu
            </button>
            <button
              onClick={() => setActiveTab('variables')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'variables'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              3. Variables
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du modèle *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: Avertissement Disciplinaire"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de courrier *
                </label>
                <select
                  value={typeCourrier}
                  onChange={(e) => setTypeCourrier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TYPES_COURRIER.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="actif"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="actif" className="ml-2 text-sm text-gray-700">
                  Modèle actif (visible pour génération)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'contenu' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet du courrier *
                </label>
                <input
                  type="text"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  placeholder="ex: Avertissement disciplinaire"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <VariableInsertButtons onInsert={insertVariable} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenu du courrier *
                </label>

                <div className="bg-gray-50 border border-gray-300 rounded-t-lg p-2 flex flex-wrap gap-2">
                  <div className="text-xs text-gray-600 font-medium w-full mb-1">Formatage HTML basique:</div>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('bold', '<b>', '</b>')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 text-sm"
                    title="Gras"
                  >
                    <Bold className="w-4 h-4" />
                    Gras
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('italic', '<i>', '</i>')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 text-sm"
                    title="Italique"
                  >
                    <Italic className="w-4 h-4" />
                    Italique
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('underline', '<u>', '</u>')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 text-sm"
                    title="Souligné"
                  >
                    <Underline className="w-4 h-4" />
                    Souligné
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('h', '<h>', '</h>')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                    title="Titre"
                  >
                    Titre
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('ul', '<ul><li>', '</li></ul>')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 text-sm"
                    title="Liste à puces"
                  >
                    <List className="w-4 h-4" />
                    Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('ol', '<ol><li>', '</li></ol>')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 text-sm"
                    title="Liste numérotée"
                  >
                    <ListOrdered className="w-4 h-4" />
                    Liste numérotée
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('br', '<br/>', '')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                    title="Saut de ligne"
                  >
                    Saut de ligne
                  </button>
                </div>

                <textarea
                  ref={contenuRef}
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  placeholder="Écrivez le contenu de votre courrier ici. Vous pouvez utiliser les balises HTML pour le formatage (ex: <b>texte en gras</b>)"
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <div className="mt-2 text-xs text-gray-500 flex justify-between">
                  <span>{contenu.length} caractères</span>
                  <span className="text-blue-600">Supports HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;h&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;br/&gt;</span>
                </div>
              </div>

              {detectedVariables.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Variables détectées :</div>
                  <div className="flex flex-wrap gap-2">
                    {classified.system.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {classified.system.map(v => (
                          <span key={v} className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-700 rounded">
                            🔵 {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {classified.custom.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {classified.custom.map(v => (
                          <span key={v} className="px-2 py-1 text-xs font-mono bg-orange-100 text-orange-700 rounded">
                            🟠 {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {classified.unknown.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {classified.unknown.map(v => (
                          <span key={v} className="px-2 py-1 text-xs font-mono bg-red-100 text-red-700 rounded">
                            ❌ {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    🔵 Variables système (auto-remplies) • 🟠 Variables personnalisées • ❌ Non définies
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Variables personnalisées
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Les variables personnalisées sont des champs que vous devrez remplir lors de la génération du courrier.
                  Par exemple : date des faits, description, montant, etc.
                </p>
                <button
                  onClick={() => {
                    setEditingCustomVar(null);
                    setShowCustomVarForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une variable personnalisée
                </button>
              </div>

              {Object.keys(customVariables).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(customVariables)
                    .sort(([, a], [, b]) => (a.ordre || 0) - (b.ordre || 0))
                    .map(([name, config]) => (
                      <div key={name} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                {`{{${name}}}`}
                              </span>
                              {config.required && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Requis</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">{config.label}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Type: {config.type}
                              {config.options && ` (${config.options.length} options)`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => editCustomVariable(name)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeCustomVariable(name)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucune variable personnalisée définie
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : template ? 'Mettre à jour' : 'Créer le modèle'}
          </button>
        </div>
      </div>

      {showCustomVarForm && (
        <CustomVariableForm
          onAdd={editingCustomVar ? updateCustomVariable : addCustomVariable}
          onCancel={() => {
            setShowCustomVarForm(false);
            setEditingCustomVar(null);
          }}
          existingNames={Object.keys(customVariables)}
          editingVariable={editingCustomVar ? {
            name: editingCustomVar,
            config: customVariables[editingCustomVar]
          } : undefined}
          originalName={editingCustomVar || undefined}
        />
      )}
    </div>
  );
}
