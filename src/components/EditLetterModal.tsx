import { useState } from 'react';
import { X, Eye, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface EditLetterModalProps {
  letter: {
    id: string;
    sujet: string;
    contenu_genere: string;
    fichier_pdf_url: string | null;
  };
  onClose: () => void;
  onSave: () => void;
}

export function EditLetterModal({ letter, onClose, onSave }: EditLetterModalProps) {
  const [sujet, setSujet] = useState(letter.sujet);
  const [contenu, setContenu] = useState(letter.contenu_genere);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!sujet.trim()) {
      setError('Le sujet est requis');
      return;
    }

    if (!contenu.trim()) {
      setError('Le contenu est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('courrier_genere')
        .update({
          sujet: sujet.trim(),
          contenu_genere: contenu.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', letter.id);

      if (updateError) throw updateError;

      onSave();
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = sujet !== letter.sujet || contenu !== letter.contenu_genere;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Modifier le courrier</h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {letter.fichier_pdf_url && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm font-medium text-yellow-900 mb-1">
                  Note importante
                </div>
                <div className="text-sm text-yellow-700">
                  Un PDF existe déjà pour ce courrier. Après modification, vous devrez régénérer le PDF pour qu'il reflète les changements.
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objet du courrier <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Convocation à un entretien"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu du courrier <span className="text-red-600">*</span>
              </label>
              <textarea
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Rédigez le contenu du courrier..."
                disabled={saving}
              />
              <div className="mt-2 text-xs text-gray-500">
                {contenu.length} caractères • {contenu.split('\n').length} lignes
              </div>
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Masquer l\'aperçu' : 'Voir l\'aperçu'}
            </button>

            {showPreview && (
              <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50">
                <div className="text-sm font-medium text-blue-900 mb-4">Aperçu du courrier</div>
                <div className="bg-white rounded p-6 shadow-sm">
                  <div className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                    {sujet || '[Objet non défini]'}
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {contenu || '[Contenu vide]'}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {hasChanges && <span className="text-orange-600 font-medium">● Modifications non sauvegardées</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || !sujet.trim() || !contenu.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
