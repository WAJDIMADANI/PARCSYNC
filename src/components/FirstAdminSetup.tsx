import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface FirstAdminSetupProps {
  onComplete: () => void;
}

export function FirstAdminSetup({ onComplete }: FirstAdminSetupProps) {
  const { user } = useAuth();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }

    if (!nom.trim() || !prenom.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const { data: newUser, error: userError } = await supabase
        .from('app_utilisateur')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          nom: nom.trim(),
          prenom: prenom.trim(),
          actif: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      const allPermissions = [
        'rh/candidats',
        'rh/salaries',
        'rh/contrats',
        'rh/courriers',
        'rh/alertes',
        'rh/notifications',
        'rh/incidents',
        'rh/incidents-historique',
        'rh/vivier',
        'rh/demandes',
        'parc/vehicules',
        'parc/ct-assurance',
        'parc/maintenance',
        'admin/sites',
        'admin/secteurs',
        'admin/postes',
        'admin/modeles',
        'admin/modeles-contrats',
        'admin/utilisateurs',
      ];

      const permissionsToInsert = allPermissions.map((section_id) => ({
        utilisateur_id: newUser.id,
        section_id,
        actif: true,
      }));

      const { error: permError } = await supabase
        .from('utilisateur_permissions')
        .insert(permissionsToInsert);

      if (permError) throw permError;

      onComplete();
    } catch (err: any) {
      console.error('Error creating admin:', err);
      setError(err.message || 'Erreur lors de la création de l\'administrateur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
            Configuration initiale
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Créez votre compte administrateur pour commencer
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Votre prénom"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Votre nom"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">
                Email de votre compte Supabase
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Créer mon compte administrateur
                </>
              )}
            </button>
          </form>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Première connexion :</span> Vous obtiendrez tous les droits administrateur et pourrez ensuite créer d'autres utilisateurs avec des permissions personnalisées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
