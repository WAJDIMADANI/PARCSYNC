import { useState } from 'react';
import { X, Download, Calendar, CheckSquare } from 'lucide-react';

interface DownloadWithDateModalProps {
  isOpen: boolean;
  onConfirm: (markAsSent: boolean, dateEnvoi?: Date) => Promise<void>;
  onCancel: () => void;
  letterSubject: string;
  fileType?: string;
}

export function DownloadWithDateModal({ isOpen, onConfirm, onCancel, letterSubject, fileType = 'PDF' }: DownloadWithDateModalProps) {
  const [markAsSent, setMarkAsSent] = useState(false);
  const [dateEnvoi, setDateEnvoi] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(markAsSent, markAsSent ? new Date(dateEnvoi) : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all scale-100 animate-fadeIn">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Télécharger le {fileType}</h2>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-3 text-sm">{letterSubject}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Vous êtes sur le point de télécharger ce courrier. Souhaitez-vous enregistrer la date d'envoi postal ?
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={markAsSent}
                  onChange={(e) => setMarkAsSent(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Marquer comme envoyé</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Le statut du courrier sera changé en "Envoyé"
                </p>
              </div>
            </label>

            {markAsSent && (
              <div className="ml-8 animate-slideDown">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date d'envoi postal
                </label>
                <input
                  type="date"
                  value={dateEnvoi}
                  onChange={(e) => setDateEnvoi(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Cette date sera enregistrée dans l'historique du courrier
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Téléchargement...' : 'Télécharger'}
          </button>
        </div>
      </div>
    </div>
  );
}
