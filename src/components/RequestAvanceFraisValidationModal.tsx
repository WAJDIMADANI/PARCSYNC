import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckSquare, Users, Send, Euro } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../contexts/PermissionsContext';

interface AppUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
}

interface RequestAvanceFraisValidationModalProps {
  avanceFraisId: string;
  avanceInfo: {
    matricule: string;
    nom: string;
    prenom: string;
    motif: string;
    montant: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestAvanceFraisValidationModal({
  avanceFraisId,
  avanceInfo,
  onClose,
  onSuccess
}: RequestAvanceFraisValidationModalProps) {
  const { appUser } = usePermissions();
  const [validateurs, setValidateurs] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    validateur_id: '',
    priorite: 'normale' as 'normale' | 'urgente',
    message_demande: '',
  });

  useEffect(() => {
    fetchValidateurs();
  }, []);

  const fetchValidateurs = async () => {
    try {
      const { data, error } = await supabase
        .from('utilisateur_avec_permissions')
        .select('id, email, nom, prenom, permissions')
        .eq('actif', true);

      if (error) throw error;

      // Filtrer les utilisateurs ayant la permission rh/validations
      const validateurs = (data || []).filter(u =>
        u.permissions.includes('rh/validations')
      );

      // Exclure l'utilisateur connecté de la liste des validateurs
      const filteredValidateurs = validateurs.filter(v =>
        v.id !== appUser?.id
      );

      // Trier par ordre alphabétique (prénom puis nom)
      const sortedValidateurs = filteredValidateurs.sort((a, b) => {
        const nameA = `${a.prenom} ${a.nom}`.toLowerCase();
        const nameB = `${b.prenom} ${b.nom}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setValidateurs(sortedValidateurs);
    } catch (err: any) {
      console.error('Error fetching validateurs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.validateur_id) {
      setError('Veuillez sélectionner un validateur');
      return;
    }

    if (!formData.message_demande.trim()) {
      setError('Veuillez saisir un message');
      return;
    }

    if (!appUser) {
      setError('Utilisateur non identifié');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Mettre à jour l'avance de frais avec statut en_attente et date_demande
      const { error: updateError } = await supabase
        .from('compta_avance_frais')
        .update({
          statut: 'en_attente',
          date_demande: new Date().toISOString()
        })
        .eq('id', avanceFraisId);

      if (updateError) throw updateError;

      // 2. Créer la demande de validation
      const { error: insertError } = await supabase
        .from('demande_validation')
        .insert({
          avance_frais_id: avanceFraisId,
          demande_id: null,
          demandeur_id: appUser.id,
          validateur_id: formData.validateur_id,
          type_action: 'autre',
          priorite: formData.priorite,
          message_demande: formData.message_demande,
          statut: 'en_attente',
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating validation:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Euro className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Demander une validation</h2>
                <p className="text-blue-100 text-sm mt-1">Avance de frais</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Informations de l'avance */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Détails de l'avance de frais</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Employé :</span>
                <p className="text-blue-900">{avanceInfo.prenom} {avanceInfo.nom}</p>
                {avanceInfo.matricule && (
                  <p className="text-blue-700 text-xs">{avanceInfo.matricule}</p>
                )}
              </div>
              <div>
                <span className="text-blue-600 font-medium">Montant :</span>
                <p className="text-blue-900 font-semibold flex items-center gap-1">
                  <Euro className="w-4 h-4" />
                  {avanceInfo.montant.toFixed(2)} €
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-blue-600 font-medium">Motif :</span>
                <p className="text-blue-900">{avanceInfo.motif}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Erreur</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Users className="w-4 h-4" />
                Validateur
              </label>
              {loading ? (
                <div className="text-sm text-slate-600">Chargement des validateurs...</div>
              ) : validateurs.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Aucun validateur disponible avec la permission "rh/validations". Contactez un administrateur.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.validateur_id}
                  onChange={(e) => setFormData({ ...formData, validateur_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un validateur</option>
                  {validateurs.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.prenom} {v.nom} ({v.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priorité
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="normale"
                    checked={formData.priorite === 'normale'}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value as 'normale' | 'urgente' })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Normale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="urgente"
                    checked={formData.priorite === 'urgente'}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value as 'normale' | 'urgente' })}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">Urgente</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message de la demande
              </label>
              <textarea
                value={formData.message_demande}
                onChange={(e) => setFormData({ ...formData, message_demande: e.target.value })}
                rows={5}
                placeholder="Expliquez pourquoi vous avez besoin de cette validation d'avance de frais..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                Soyez précis et détaillé pour faciliter la décision du validateur
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || validateurs.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer la demande
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
