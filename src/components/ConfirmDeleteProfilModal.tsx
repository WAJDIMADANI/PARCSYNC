import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteProfilModalProps {
  isOpen: boolean;
  profilName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function ConfirmDeleteProfilModal({
  isOpen,
  profilName,
  onConfirm,
  onCancel,
  isDeleting = false
}: ConfirmDeleteProfilModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Supprimer ce profil ?
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-700">
            Vous êtes sur le point d'archiver le profil de <strong>{profilName}</strong>.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Ce qui sera conservé :
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Historique des emails envoyés</li>
              <li>• Données d'historique liées au profil</li>
              <li>• Possibilité de recréer un profil avec le même email</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">
              Ce qui changera :
            </h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Le profil n'apparaîtra plus dans les listes</li>
              <li>• Le profil ne pourra plus recevoir d'emails</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Suppression...</span>
              </>
            ) : (
              <span>Supprimer</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
