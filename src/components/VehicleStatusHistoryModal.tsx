import { X, Clock, ArrowRight, Check } from 'lucide-react';

interface StatusHistoryEntry {
  id: string;
  ancien_statut: string | null;
  nouveau_statut: string;
  date_modification: string;
  commentaire: string | null;
}

interface VehicleStatusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusHistory: StatusHistoryEntry[];
  vehicleName: string;
  loading?: boolean;
}

const getStatusEmoji = (status: string): string => {
  const statusMap: Record<string, string> = {
    'disponible': '✅',
    'en_service': '🚗',
    'en_pret': '🤝',
    'en_garage': '🛠️',
    'hors_service': '🚫',
    'sorti_flotte': '📦'
  };
  return statusMap[status] || '📋';
};

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    'disponible': 'Disponible',
    'en_service': 'En service',
    'en_pret': 'En prêt',
    'en_garage': 'En garage',
    'hors_service': 'Hors service',
    'sorti_flotte': 'Véhicule sorti / rendu de la flotte'
  };
  return labelMap[status] || status;
};

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'disponible': 'bg-green-100 text-green-800 border-green-200',
    'en_service': 'bg-blue-100 text-blue-800 border-blue-200',
    'en_pret': 'bg-purple-100 text-purple-800 border-purple-200',
    'en_garage': 'bg-orange-100 text-orange-800 border-orange-200',
    'hors_service': 'bg-red-100 text-red-800 border-red-200',
    'sorti_flotte': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export function VehicleStatusHistoryModal({
  isOpen,
  onClose,
  statusHistory,
  vehicleName,
  loading = false
}: VehicleStatusHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden transform transition-all">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Historique des statuts</h2>
              <p className="text-blue-100 text-sm mt-0.5">{vehicleName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 transition-colors rounded-lg p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Chargement de l'historique...</p>
            </div>
          ) : statusHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun historique</h3>
              <p className="text-gray-600">Aucun changement de statut n'a été enregistré pour ce véhicule.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-300 to-transparent"></div>

              <div className="space-y-6">
                {statusHistory.map((history, index) => (
                  <div key={history.id} className="relative pl-16">
                    <div className={`absolute left-4 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                      index === 0
                        ? 'bg-gradient-to-br from-green-400 to-green-600 ring-4 ring-green-100'
                        : 'bg-gradient-to-br from-blue-400 to-blue-600'
                    }`}>
                      {index === 0 ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Clock className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {history.ancien_statut && (
                            <>
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm ${getStatusColor(history.ancien_statut)}`}>
                                <span className="text-lg">{getStatusEmoji(history.ancien_statut)}</span>
                                {getStatusLabel(history.ancien_statut)}
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </>
                          )}
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm ${getStatusColor(history.nouveau_statut)}`}>
                            <span className="text-lg">{getStatusEmoji(history.nouveau_statut)}</span>
                            {getStatusLabel(history.nouveau_statut)}
                          </div>
                        </div>
                        {index === 0 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                            <Check className="w-3 h-3" />
                            Statut actuel
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {new Date(history.date_modification).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-gray-400">à</span>
                          <span className="font-medium">
                            {new Date(history.date_modification).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {history.commentaire && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-900 italic leading-relaxed">
                            "{history.commentaire}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {statusHistory.length > 0 && (
                <span className="font-medium text-gray-900">
                  {statusHistory.length} changement{statusHistory.length > 1 ? 's' : ''} enregistré{statusHistory.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
