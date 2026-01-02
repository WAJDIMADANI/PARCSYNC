import { X, Send, Eye } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ContractPreviewBeforeSendModalProps {
  pdfUrl: string;
  employeeName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export default function ContractPreviewBeforeSendModal({
  pdfUrl,
  employeeName,
  onClose,
  onConfirm,
  loading
}: ContractPreviewBeforeSendModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Aperçu du contrat</h2>
              <p className="text-blue-100 text-sm mt-1">{employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
            {!pdfUrl ? (
              <div className="h-full w-full flex items-center justify-center">
                <LoadingSpinner size="md" text="Génération de l'aperçu..." />
              </div>
            ) : (
              <iframe
                key={pdfUrl}
                src={pdfUrl}
                className="w-full h-full"
                title="Aperçu du contrat"
              />
            )}
          </div>

          {pdfUrl && (
            <div className="mt-2 text-right">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
          >
            {loading ? (
              <LoadingSpinner size="sm" text="Envoi à Yousign..." />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Valider et envoyer à Yousign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
