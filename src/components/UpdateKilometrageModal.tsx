import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Gauge } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface UpdateKilometrageModalProps {
  vehicleId: string;
  currentKm: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateKilometrageModal({ vehicleId, currentKm, onClose, onSuccess }: UpdateKilometrageModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    kilometrage: currentKm || 0,
    date_releve: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentKm && formData.kilometrage < currentKm) {
      if (!confirm('Le kilométrage saisi est inférieur au dernier kilométrage enregistré. Voulez-vous continuer?')) {
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: historyError } = await supabase
        .from('historique_kilometrage')
        .insert([{
          vehicule_id: vehicleId,
          date_releve: formData.date_releve,
          kilometrage: formData.kilometrage,
          source: 'manuel',
          saisi_par: user?.id,
          notes: formData.notes || null,
        }]);

      if (historyError) throw historyError;

      const { error: updateError } = await supabase
        .from('vehicule')
        .update({
          kilometrage_actuel: formData.kilometrage,
          derniere_maj_kilometrage: formData.date_releve,
        })
        .eq('id', vehicleId);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur mise à jour kilométrage:', error);
      alert('Erreur lors de la mise à jour du kilométrage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h3 className="text-xl font-bold flex items-center">
            <Gauge className="w-6 h-6 mr-2" />
            Mettre à jour le kilométrage
          </h3>
          <button onClick={onClose} className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date du relevé <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date_releve}
              onChange={(e) => setFormData({ ...formData, date_releve: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kilométrage <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.kilometrage}
                onChange={(e) => setFormData({ ...formData, kilometrage: parseInt(e.target.value) || 0 })}
                min="0"
                required
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                km
              </span>
            </div>
            {currentKm && (
              <p className="text-sm text-gray-500 mt-1">
                Kilométrage actuel: {currentKm.toLocaleString()} km
                {formData.kilometrage > currentKm && (
                  <span className="text-green-600 ml-2">
                    (+{(formData.kilometrage - currentKm).toLocaleString()} km)
                  </span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
