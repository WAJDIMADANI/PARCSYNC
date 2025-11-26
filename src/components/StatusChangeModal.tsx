import { useState } from 'react';
import { X, Calendar, Check } from 'lucide-react';

interface StatusChangeModalProps {
  isOpen: boolean;
  currentStatus: string;
  onConfirm: (newStatus: string, dateEnvoi?: Date) => Promise<void>;
  onCancel: () => void;
  letterSubject: string;
}

export function StatusChangeModal({ isOpen, currentStatus, onConfirm, onCancel, letterSubject }: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [dateEnvoi, setDateEnvoi] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (selectedStatus === 'envoye') {
        await onConfirm(selectedStatus, new Date(dateEnvoi));
      } else {
        await onConfirm(selectedStatus);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'generated', label: 'Généré', color: 'bg-blue-100 text-blue-700' },
    { value: 'envoye', label: 'Envoyé', color: 'bg-green-100 text-green-700' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all scale-100 animate-fadeIn">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Changer le statut</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-2 text-sm">{letterSubject}</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nouveau statut
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    selectedStatus === option.value
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  </div>
                  {selectedStatus === option.value && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedStatus === 'envoye' && (
            <div className="animate-slideDown">
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
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-medium"
          >
            {loading ? 'Modification...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
