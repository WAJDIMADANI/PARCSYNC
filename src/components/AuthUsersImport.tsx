import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertCircle, User, Shield } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  exists_in_app: boolean;
}

export function AuthUsersImport() {
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAuthUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        throw new Error('Impossible de charger les utilisateurs Auth. Vérifiez que vous avez les droits admin.');
      }

      const { data: appUsers, error: appError } = await supabase
        .from('app_utilisateur')
        .select('auth_user_id');

      if (appError) throw appError;

      const appUserIds = new Set(appUsers?.map(u => u.auth_user_id) || []);

      const users = authData.users.map(user => ({
        id: user.id,
        email: user.email || 'Email non disponible',
        created_at: user.created_at,
        exists_in_app: appUserIds.has(user.id),
      }));

      setAuthUsers(users);
    } catch (err: any) {
      console.error('Error loading auth users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const importUser = async (authUserId: string, email: string, isFirstUser: boolean) => {
    try {
      const emailParts = email.split('@')[0];
      let prenom = 'User';
      let nom = 'Import';

      if (emailParts.includes('.')) {
        const parts = emailParts.split('.');
        prenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        nom = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      } else {
        prenom = emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
      }

      const { data: newUser, error: userError } = await supabase
        .from('app_utilisateur')
        .insert({
          auth_user_id: authUserId,
          email: email,
          nom: nom,
          prenom: prenom,
          actif: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      const allPermissions = [
        'rh/candidats',
        'rh/salaries',
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

      const basicPermissions = [
        'rh/candidats',
        'rh/salaries',
        'rh/demandes',
      ];

      const permissionsToAssign = isFirstUser ? allPermissions : basicPermissions;

      const permissionsData = permissionsToAssign.map(section_id => ({
        utilisateur_id: newUser.id,
        section_id,
        actif: true,
      }));

      const { error: permError } = await supabase
        .from('utilisateur_permissions')
        .insert(permissionsData);

      if (permError) throw permError;

      return true;
    } catch (err: any) {
      console.error('Error importing user:', err);
      throw err;
    }
  };

  const importAllUsers = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const usersToImport = authUsers.filter(u => !u.exists_in_app);

      if (usersToImport.length === 0) {
        setError('Aucun utilisateur à importer');
        return;
      }

      const { data: existingUsers } = await supabase
        .from('app_utilisateur')
        .select('id')
        .limit(1);

      const isFirstBatch = !existingUsers || existingUsers.length === 0;

      let imported = 0;
      for (let i = 0; i < usersToImport.length; i++) {
        const user = usersToImport[i];
        const isFirstUser = isFirstBatch && i === 0;

        try {
          await importUser(user.id, user.email, isFirstUser);
          imported++;
        } catch (err) {
          console.error(`Failed to import ${user.email}:`, err);
        }
      }

      setSuccess(`${imported} utilisateur(s) importé(s) avec succès`);
      await loadAuthUsers();
    } catch (err: any) {
      console.error('Error importing users:', err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const importSingleUser = async (user: AuthUser) => {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: existingUsers } = await supabase
        .from('app_utilisateur')
        .select('id')
        .limit(1);

      const isFirstUser = !existingUsers || existingUsers.length === 0;

      await importUser(user.id, user.email, isFirstUser);
      setSuccess(`Utilisateur ${user.email} importé avec succès`);
      await loadAuthUsers();
    } catch (err: any) {
      console.error('Error importing user:', err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Import des utilisateurs Supabase Auth</h2>
          <p className="text-slate-600 mt-1">
            Importez les utilisateurs existants de Supabase Auth dans le système de permissions
          </p>
        </div>
        <button
          onClick={loadAuthUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
              Chargement...
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              Charger les utilisateurs
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {authUsers.length > 0 && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Permissions attribuées :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Premier utilisateur importé :</strong> Reçoit TOUTES les permissions (administrateur complet)</li>
                  <li><strong>Autres utilisateurs :</strong> Reçoivent uniquement les permissions de base (Candidats, Salariés, Demandes)</li>
                </ul>
              </div>
            </div>
          </div>

          {authUsers.filter(u => !u.exists_in_app).length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={importAllUsers}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importer tous les utilisateurs
                  </>
                )}
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Créé le</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {authUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {user.exists_in_app ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Déjà importé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          À importer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!user.exists_in_app && (
                        <button
                          onClick={() => importSingleUser(user)}
                          disabled={importing}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm disabled:opacity-50"
                        >
                          Importer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {authUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">
            Cliquez sur "Charger les utilisateurs" pour voir les utilisateurs disponibles
          </p>
        </div>
      )}
    </div>
  );
}
