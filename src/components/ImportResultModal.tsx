import { X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

interface ImportResultModalProps {
  isOpen: boolean;
  fileName: string;
  systemVariables: number;
  customVariables: number;
  onClose: () => void;
}

export function ImportResultModal({
  isOpen,
  fileName,
  systemVariables,
  customVariables,
  onClose
}: ImportResultModalProps) {
  if (!isOpen) return null;

  const totalVariables = systemVariables + customVariables;
  const hasNoVariables = totalVariables === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-fade-in">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {hasNoVariables ? (
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {hasNoVariables ? 'Import partiel' : 'Import réussi'}
                </h3>
                <p className="text-sm text-gray-600">Modèle Word importé</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">{fileName}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Variables système détectées</span>
                <span className={`font-bold ${systemVariables > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {systemVariables}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Variables personnalisées détectées</span>
                <span className={`font-bold ${customVariables > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {customVariables}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className={totalVariables > 0 ? 'text-green-600' : 'text-red-600'}>
                    {totalVariables}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {hasNoVariables && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800 font-medium mb-2">
                Aucune variable détectée
              </p>
              <p className="text-xs text-orange-700">
                Le fichier a été importé avec succès, mais aucune variable n'a été trouvée.
                Vous pouvez utiliser le bouton "Re-scanner" dans la liste des modèles pour
                forcer une nouvelle détection des variables.
              </p>
            </div>
          )}

          {!hasNoVariables && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Le fichier Word a été sauvegardé avec sa mise en forme complète.
                Les variables ont été détectées et classifiées automatiquement.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
