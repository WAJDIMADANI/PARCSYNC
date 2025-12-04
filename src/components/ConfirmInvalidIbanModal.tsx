import { X, AlertTriangle } from 'lucide-react';

interface ConfirmInvalidIbanModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  iban: string;
}

export function ConfirmInvalidIbanModal({ isOpen, onConfirm, onCancel, iban }: ConfirmInvalidIbanModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">IBAN invalide détecté</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              L'IBAN saisi semble invalide :
            </p>
            <p className="text-sm font-mono text-yellow-900 bg-white px-3 py-2 rounded border border-yellow-300">
              {iban}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            La validation automatique a détecté que cet IBAN pourrait être incorrect.
            Voulez-vous vraiment forcer la sauvegarde ?
          </p>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">
              <strong>Note :</strong> Un IBAN invalide peut empêcher les virements de salaire.
              Vérifiez attentivement avant de continuer.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Forcer la sauvegarde
          </button>
        </div>
      </div>
    </div>
  );
}
