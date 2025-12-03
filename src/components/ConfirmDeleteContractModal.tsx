import { AlertTriangle, Trash2, X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ConfirmDeleteContractModalProps {
  contractId: string;
  contractName: string;
  contractType: string;
  signatureDate: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isDeleting: boolean;
}

export default function ConfirmDeleteContractModal({
  contractName,
  contractType,
  signatureDate,
  onConfirm,
  onClose,
  isDeleting
}: ConfirmDeleteContractModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-white">Supprimer ce contrat ?</h2>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-gray-700 mb-3">
              Vous êtes sur le point de supprimer le contrat suivant :
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[80px]">Contrat:</span>
                <span className="text-gray-900 font-bold">{contractName}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[80px]">Type:</span>
                <span className="text-gray-900">{contractType}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[80px]">Signé le:</span>
                <span className="text-gray-900">{new Date(signatureDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">
                Cette action est irréversible
              </p>
              <p className="text-sm text-amber-800">
                Le fichier PDF sera définitivement supprimé du système ainsi que toutes les données associées.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" variant="white" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Supprimer définitivement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
