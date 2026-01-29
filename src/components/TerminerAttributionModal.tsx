import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TerminerAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attribution: {
    id: string;
    date_debut: string;
    nom?: string;
    prenom?: string;
    matricule?: string;
  };
  onSuccess: () => void;
}

export default function TerminerAttributionModal({
  isOpen,
  onClose,
  attribution,
  onSuccess
}: TerminerAttributionModalProps) {
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (new Date(dateFin) < new Date(attribution.date_debut)) {
      setError('La date de fin doit être postérieure à la date de début');
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('attribution_vehicule')
        .update({ date_fin: dateFin })
        .eq('id', attribution.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError('Erreur lors de la terminaison de l\'attribution');
    } finally {
      setLoading(false);
    }
  };

  const displayName = attribution.prenom
    ? `${attribution.prenom} ${attribution.nom}`
    : attribution.nom;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Terminer l'attribution</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-900">
            <div className="font-medium mb-1">Locataire actuel</div>
            <div>{displayName}</div>
            {attribution.matricule && (
              <div className="text-blue-700">Matricule: {attribution.matricule}</div>
            )}
            <div className="mt-2 text-blue-700">
              Début: {new Date(attribution.date_debut).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                min={attribution.date_debut}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? 'Enregistrement...' : 'Terminer l\'attribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
