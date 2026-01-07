import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError } from "@supabase/supabase-js";
import { PermissionGuard } from './PermissionGuard';
import { Users, UserPlus, X, Save, Trash2, CheckCircle, XCircle, Edit2, Shield, Upload, FolderOpen, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { AuthUsersImport } from './AuthUsersImport';
import { ExternalDemandLink } from './ExternalDemandLink';

interface Pole {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  created_at: string;
}

interface AppUser {
  id: string;
  auth_user_id: string | null;
  email: string;
  nom: string;
  prenom: string;
  actif: boolean;
  pole_id: string | null;
  created_at: string;
}

interface UserPermission {
  id: string;
  utilisateur_id: string;
  section_id: string;
  actif: boolean;
}

const AVAILABLE_PERMISSIONS = [
  { section: 'RH', permissions: [
    { id: 'rh/candidats', label: 'Candidats' },
    { id: 'rh/salaries', label: 'Salariés' },
    { id: 'rh/courriers', label: 'Courriers' },
    { id: 'rh/alertes', label: 'Alertes' },
    { id: 'rh/notifications', label: 'Notifications' },
    { id: 'rh/incidents', label: 'Incidents' },
    { id: 'rh/incidents-historique', label: 'Historique incidents' },
    { id: 'rh/vivier', label: 'Vivier' },
    { id: 'rh/demandes', label: 'Demandes' },
    { id: 'rh/validations', label: 'Validations' },
  ]},
  { section: 'Parc', permissions: [
    { id: 'parc/vehicules', label: 'Véhicules' },
    { id: 'parc/ct-assurance', label: 'CT & Assurance' },
    { id: 'parc/maintenance', label: 'Maintenance' },
  ]},
  { section: 'Comptabilité', permissions: [
    { id: 'compta/entrees', label: 'Entrées' },
    { id: 'compta/sorties', label: 'Sorties' },
    { id: 'compta/rib', label: 'RIB' },
    { id: 'compta/adresse', label: 'Adresse' },
    { id: 'compta/avenants', label: 'Avenants' },
  ]},
  { section: 'Administration', permissions: [
    { id: 'admin/sites', label: 'Sites' },
    { id: 'admin/secteurs', label: 'Secteurs' },
    { id: 'admin/postes', label: 'Postes' },
    { id: 'admin/modeles', label: 'Modèles' },
    { id: 'admin/modeles-contrats', label: 'Modèles de contrats' },
    { id: 'admin/utilisateurs', label: 'Utilisateurs' },
  ]},
];

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPoleModal, setShowAddPoleModal] = useState(false);
  const [showRenamePoleModal, setShowRenamePoleModal] = useState(false);
  const [showDeletePoleModal, setShowDeletePoleModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);
  const [expandedPoles, setExpandedPoles] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [password, setPassword] = useState('');
  const [poleId, setPoleId] = useState<string | null>(null);
  const [poleNom, setPoleNom] = useState('');
  const [poleDescription, setPoleDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchPoles(), fetchPermissions()]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_utilisateur')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      throw err;
    }
  };

  const fetchPoles = async () => {
    try {
      const { data, error } = await supabase
        .from('poles')
        .select('*')
        .eq('actif', true)
        .order('nom', { ascending: true });

      if (error) throw error;
      setPoles(data || []);
    } catch (err: any) {
      console.error('Error fetching poles:', err);
      throw err;
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('utilisateur_permissions')
        .select('*');

      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      throw err;
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, nom, prenom, password, pole_id: poleId },
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || "Création échouée");
      }

      // ✅ succès
      setSuccess("Utilisateur créé avec succès ! Il peut maintenant se connecter.");

      // refresh listes + reset form + fermer modal
      await fetchAllData();
      setShowAddModal(false);
      setEmail("");
      setNom("");
      setPrenom("");
      setPassword("");
      setPoleId(null);

    } catch (err: any) {
      if (err instanceof FunctionsHttpError) {
        const res = err.context; // Response
        const text = await res.text();
        console.error("admin-create-user HTTP ERROR =>", res.status, text);

        // essaie de lire le JSON renvoyé par ta fonction
        try {
          const j = JSON.parse(text);
          setError(j?.error ? `${j.error}${j.details ? " — " + j.details : ""}` : text);
        } catch {
          setError(text || `Erreur serveur (${res.status})`);
        }
        return;
      }

      console.error("admin-create-user UNKNOWN ERROR =>", err);
      setError(err?.message || "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from('poles')
        .insert({
          nom: poleNom.trim(),
          description: poleDescription.trim() || null,
          actif: true,
        });

      if (insertError) throw insertError;

      setShowAddPoleModal(false);
      setPoleNom('');
      setPoleDescription('');
      await fetchPoles();

      window.dispatchEvent(new CustomEvent('poles-updated'));
    } catch (err: any) {
      console.error('Error adding pole:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRenamePole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPole) return;
    setError(null);
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('poles')
        .update({
          nom: poleNom.trim(),
          description: poleDescription.trim() || null,
        })
        .eq('id', selectedPole.id);

      if (updateError) throw updateError;

      setShowRenamePoleModal(false);
      setPoleNom('');
      setPoleDescription('');
      setSelectedPole(null);
      await fetchPoles();

      window.dispatchEvent(new CustomEvent('poles-updated'));
    } catch (err: any) {
      console.error('Error renaming pole:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePole = async () => {
    if (!selectedPole) return;
    setError(null);
    setSaving(true);

    try {
      await supabase
        .from('app_utilisateur')
        .update({ pole_id: null })
        .eq('pole_id', selectedPole.id);

      const { error: deleteError } = await supabase
        .from('poles')
        .update({ actif: false })
        .eq('id', selectedPole.id);

      if (deleteError) throw deleteError;

      setShowDeletePoleModal(false);
      setSelectedPole(null);
      await fetchAllData();

      window.dispatchEvent(new CustomEvent('poles-updated'));
    } catch (err: any) {
      console.error('Error deleting pole:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const assignUserToPole = async (userId: string, newPoleId: string | null) => {
    try {
      const { error } = await supabase
        .from('app_utilisateur')
        .update({ pole_id: newPoleId })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      console.error('Error assigning user to pole:', err);
      setError(err.message);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('app_utilisateur')
        .update({ actif: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      setError(err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setError(null);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('app_utilisateur')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      setSuccess(`Utilisateur ${selectedUser.prenom} ${selectedUser.nom} supprimé avec succès`);
      setShowDeleteUserModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePoleExpanded = (poleId: string) => {
    const newExpanded = new Set(expandedPoles);
    if (newExpanded.has(poleId)) {
      newExpanded.delete(poleId);
    } else {
      newExpanded.add(poleId);
    }
    setExpandedPoles(newExpanded);
  };

  const openPermissionsModal = (user: AppUser) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const getUserPermissions = (userId: string): string[] => {
    return permissions
      .filter(p => p.utilisateur_id === userId && p.actif)
      .map(p => p.section_id);
  };

  const hasPermission = (userId: string, permissionId: string): boolean => {
    return getUserPermissions(userId).includes(permissionId);
  };

  const togglePermission = async (userId: string, permissionId: string) => {
    try {
      const existing = permissions.find(
        p => p.utilisateur_id === userId && p.section_id === permissionId
      );

      if (existing) {
        const { error } = await supabase
          .from('utilisateur_permissions')
          .update({ actif: !existing.actif })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('utilisateur_permissions')
          .insert({
            utilisateur_id: userId,
            section_id: permissionId,
            actif: true,
          });

        if (error) throw error;
      }

      await fetchPermissions();
    } catch (err: any) {
      console.error('Error toggling permission:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Chargement des utilisateurs..." />
      </div>
    );
  }

  const adminUsers = users.filter(u => u.pole_id === null);
  const getUsersByPole = (poleId: string) => users.filter(u => u.pole_id === poleId);

  const renderUserRow = (user: AppUser) => (
    <tr key={user.id} className="hover:bg-slate-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {user.prenom} {user.nom}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm text-slate-600">{user.email}</p>
      </td>
      <td className="px-6 py-4">
        <select
          value={user.pole_id || ''}
          onChange={(e) => assignUserToPole(user.id, e.target.value || null)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Sans pôle (Admin)</option>
          {poles.map(pole => (
            <option key={pole.id} value={pole.id}>{pole.nom}</option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() => openPermissionsModal(user)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Shield className="w-4 h-4" />
          {getUserPermissions(user.id).length}
        </button>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() => toggleUserStatus(user.id, user.actif)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            user.actif
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {user.actif ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Actif
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Inactif
            </>
          )}
        </button>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPermissionsModal(user)}
            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            title="Modifier les permissions"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowDeleteUserModal(true);
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer l'utilisateur"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <PermissionGuard permission="admin/utilisateurs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestion des utilisateurs</h1>
            <p className="text-slate-600 mt-1">Gérez les utilisateurs et leurs permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              Importer depuis Auth
            </button>
            <button
              onClick={() => setShowAddPoleModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Créer un pôle
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Ajouter un utilisateur
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <ExternalDemandLink />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Administrateurs ({adminUsers.length})</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Pôle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Aucun administrateur
                    </td>
                  </tr>
                ) : (
                  adminUsers.map(renderUserRow)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {poles.map((pole) => {
            const poleUsers = getUsersByPole(pole.id);
            const isExpanded = expandedPoles.has(pole.id);

            return (
              <div key={pole.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
                  onClick={() => togglePoleExpanded(pole.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-white" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-white" />
                      )}
                      <FolderOpen className="w-6 h-6 text-white" />
                      <div>
                        <h2 className="text-xl font-bold text-white">{pole.nom} ({poleUsers.length})</h2>
                        {pole.description && (
                          <p className="text-sm text-blue-100 mt-1">{pole.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPole(pole);
                          setPoleNom(pole.nom);
                          setPoleDescription(pole.description || '');
                          setShowRenamePoleModal(true);
                        }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="Renommer"
                      >
                        <Edit2 className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPole(pole);
                          setShowDeletePoleModal(true);
                        }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Utilisateur
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Pôle
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Permissions
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {poleUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                              Aucun utilisateur dans ce pôle
                            </td>
                          </tr>
                        ) : (
                          poleUsers.map(renderUserRow)
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Ajouter un utilisateur</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setPoleId(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                    minLength={8}
                    placeholder="Minimum 8 caractères"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    L'utilisateur pourra se connecter immédiatement avec ce mot de passe
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pôle (optionnel)
                  </label>
                  <select
                    value={poleId || ''}
                    onChange={(e) => setPoleId(e.target.value || null)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">Sans pôle (Admin)</option>
                    {poles.map(pole => (
                      <option key={pole.id} value={pole.id}>{pole.nom}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Les utilisateurs sans pôle sont considérés comme administrateurs
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setPoleId(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium disabled:opacity-50"
                  >
                    {saving ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddPoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Créer un pôle</h3>
                <button
                  onClick={() => {
                    setShowAddPoleModal(false);
                    setPoleNom('');
                    setPoleDescription('');
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom du pôle *
                  </label>
                  <input
                    type="text"
                    value={poleNom}
                    onChange={(e) => setPoleNom(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: RH, Maintenance, Logistique..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (optionnelle)
                  </label>
                  <textarea
                    value={poleDescription}
                    onChange={(e) => setPoleDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brève description du pôle..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPoleModal(false);
                      setPoleNom('');
                      setPoleDescription('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-soft font-medium disabled:opacity-50"
                  >
                    {saving ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRenamePoleModal && selectedPole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Modifier le pôle</h3>
                <button
                  onClick={() => {
                    setShowRenamePoleModal(false);
                    setSelectedPole(null);
                    setPoleNom('');
                    setPoleDescription('');
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRenamePole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom du pôle *
                  </label>
                  <input
                    type="text"
                    value={poleNom}
                    onChange={(e) => setPoleNom(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (optionnelle)
                  </label>
                  <textarea
                    value={poleDescription}
                    onChange={(e) => setPoleDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenamePoleModal(false);
                      setSelectedPole(null);
                      setPoleNom('');
                      setPoleDescription('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-soft font-medium disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : 'Valider'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeletePoleModal && selectedPole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Supprimer le pôle</h3>
                <button
                  onClick={() => {
                    setShowDeletePoleModal(false);
                    setSelectedPole(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    Êtes-vous sûr de vouloir supprimer le pôle <strong>{selectedPole.nom}</strong> ?
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    Les utilisateurs de ce pôle seront mis en "Non assigné" (Administrateurs).
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeletePoleModal(false);
                      setSelectedPole(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeletePole}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Supprimer l'utilisateur</h3>
                <button
                  onClick={() => {
                    setShowDeleteUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur <strong>{selectedUser.prenom} {selectedUser.nom}</strong> ?
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Cette action est irréversible. Toutes les données associées à cet utilisateur seront supprimées.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-600">
                    <strong>Email :</strong> {selectedUser.email}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteUserModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Suppression...' : 'Supprimer définitivement'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPermissionsModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Permissions de {selectedUser.prenom} {selectedUser.nom}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {AVAILABLE_PERMISSIONS.map((group) => (
                    <div key={group.section}>
                      <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                        {group.section}
                      </h4>
                      <div className="space-y-2">
                        {group.permissions.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission(selectedUser.id, perm.id)}
                              onChange={() => togglePermission(selectedUser.id, perm.id)}
                              className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">
                  Importer les utilisateurs Supabase Auth
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    fetchUsers();
                    fetchPermissions();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <AuthUsersImport />
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
