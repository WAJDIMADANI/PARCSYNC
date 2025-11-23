import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, Calendar, AlertCircle, Loader2 } from 'lucide-react';

interface ResolveIncidentModalProps {
  incident: {
    id: string;
    type: 'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd';
    profil_id: string;
    date_expiration_originale: string;
    profil?: {
      prenom: string;
      nom: string;
      email: string;
    };
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function ResolveIncidentModal({ incident, onClose, onUpdate }: ResolveIncidentModalProps) {
  const [resolving, setResolving] = useState(false);
  const [nouvelleDate, setNouvelleDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const getDocumentLabel = () => {
    switch (incident.type) {
      case 'titre_sejour': return 'Titre de séjour';
      case 'visite_medicale': return 'Visite médicale';
      case 'permis_conduire': return 'Permis de conduire';
      case 'contrat_cdd': return 'Contrat CDD';
      default: return incident.type;
    }
  };

  const validateDate = () => {
    if (!nouvelleDate) {
      setError('Veuillez saisir une date de validité');
      return false;
    }

    const selectedDate = new Date(nouvelleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      setError('La nouvelle date doit être dans le futur');
      return false;
    }

    setError('');
    return true;
  };

  const handleResolve = async () => {
    if (!validateDate()) return;

    setResolving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: rpcError } = await supabase.rpc('resolve_incident', {
        p_incident_id: incident.id,
        p_nouvelle_date_validite: nouvelleDate,
        p_notes: notes || null,
        p_user_id: user?.id
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error(data.error || 'Erreur lors de la résolution');
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Error resolving incident:', err);
      setError(err.message || 'Erreur lors de la résolution de l\'incident');
    } finally {
      setResolving(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Résoudre l'incident</h2>
              <p className="text-sm text-gray-600">
                {getDocumentLabel()} - {incident.profil?.prenom} {incident.profil?.nom}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Information importante</h3>
                <p className="text-sm text-blue-800">
                  La résolution de cet incident mettra automatiquement à jour la date de validité du document dans le profil de l'employé.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Détails de l'incident</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Employé:</span>
                <p className="font-medium text-gray-900">
                  {incident.profil?.prenom} {incident.profil?.nom}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium text-gray-900">{incident.profil?.email}</p>
              </div>
              <div>
                <span className="text-gray-600">Type de document:</span>
                <p className="font-medium text-gray-900">{getDocumentLabel()}</p>
              </div>
              <div>
                <span className="text-gray-600">Date d'expiration:</span>
                <p className="font-medium text-red-600">
                  {new Date(incident.date_expiration_originale).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nouvelle date de validité *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={nouvelleDate}
                  onChange={(e) => {
                    setNouvelleDate(e.target.value);
                    setError('');
                  }}
                  min={getMinDate()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                La date doit être dans le futur
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Ajoutez des notes sur la résolution de cet incident..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Par exemple: "Document renouvelé et vérifié" ou "Nouvelle carte reçue"
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {nouvelleDate && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-sm">
                  <span className="text-gray-700">Le document sera valide jusqu'au: </span>
                  <span className="font-bold text-green-700">
                    {new Date(nouvelleDate).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={resolving}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving || !nouvelleDate}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {resolving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Résolution en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Résoudre et mettre à jour
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
