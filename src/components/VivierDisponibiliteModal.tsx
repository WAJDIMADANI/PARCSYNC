import { useState } from 'react';
import { X } from 'lucide-react';

interface VivierDisponibiliteModalProps {
  candidateName: string;
  onClose: () => void;
  onConfirm: (dateDisponibilite: string | null, moisDisponibilite: string | null) => Promise<void>;
}

export function VivierDisponibiliteModal({
  candidateName,
  onClose,
  onConfirm,
}: VivierDisponibiliteModalProps) {
  const [typeSelection, setTypeSelection] = useState<'date' | 'mois'>('date');
  const [dateDisponibilite, setDateDisponibilite] = useState('');
  const [moisDisponibilite, setMoisDisponibilite] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (typeSelection === 'date' && dateDisponibilite) {
        await onConfirm(dateDisponibilite, null);
      } else if (typeSelection === 'mois' && moisDisponibilite) {
        await onConfirm(null, moisDisponibilite);
      } else {
        alert('Veuillez sélectionner une date ou un mois de disponibilité');
        setLoading(false);
        return;
      }
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout au vivier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Ajouter au Vivier</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{candidateName}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Ce candidat sera ajouté au vivier avec sa date de disponibilité
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de disponibilité
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="typeSelection"
                  value="date"
                  checked={typeSelection === 'date'}
                  onChange={() => setTypeSelection('date')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">Date complète (ex: 15 mars 2025)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="typeSelection"
                  value="mois"
                  checked={typeSelection === 'mois'}
                  onChange={() => setTypeSelection('mois')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">Mois uniquement (ex: Mars 2025)</span>
              </label>
            </div>
          </div>

          {typeSelection === 'date' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de disponibilité *
              </label>
              <input
                type="date"
                required
                value={dateDisponibilite}
                onChange={(e) => setDateDisponibilite(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {typeSelection === 'mois' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois de disponibilité *
              </label>
              <input
                type="month"
                required
                value={moisDisponibilite}
                onChange={(e) => setMoisDisponibilite(e.target.value)}
                min={new Date().toISOString().slice(0, 7)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Ajout en cours...' : 'Ajouter au vivier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
