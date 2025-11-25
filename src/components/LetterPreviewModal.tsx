import { X, Download } from 'lucide-react';

interface LetterPreviewModalProps {
  letter: {
    id: string;
    modele_nom: string;
    sujet: string;
    contenu_genere: string;
    variables_remplies: Record<string, any>;
    created_at: string;
    profil?: {
      prenom: string;
      nom: string;
      matricule_tca: string;
    };
  };
  onClose: () => void;
  onDownload: () => void;
}

export function LetterPreviewModal({ letter, onClose, onDownload }: LetterPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Prévisualisation du courrier</h2>
              <p className="text-sm text-gray-600 mt-1">
                {letter.profil ? `${letter.profil.prenom} ${letter.profil.nom}` : '-'}
                {letter.profil?.matricule_tca && ` • ${letter.profil.matricule_tca}`}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Modèle utilisé:</span>
                <span className="ml-2 font-medium text-gray-900">{letter.modele_nom}</span>
              </div>
              <div>
                <span className="text-gray-600">Généré le:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(letter.created_at).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(letter.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {Object.keys(letter.variables_remplies).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Variables utilisées :</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(letter.variables_remplies).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded px-3 py-2">
                    <div className="text-xs text-gray-600 font-mono">{key}</div>
                    <div className="text-sm text-gray-900 mt-1">
                      {value === null || value === undefined || value === ''
                        ? '[Non renseigné]'
                        : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-white border border-gray-300 rounded-lg p-8 shadow-sm">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-1">Objet :</div>
                <div className="text-lg font-medium text-gray-900">{letter.sujet}</div>
              </div>

              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                  {letter.contenu_genere}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Fermer
          </button>
          <button
            onClick={onDownload}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Télécharger PDF
          </button>
        </div>
      </div>
    </div>
  );
}
