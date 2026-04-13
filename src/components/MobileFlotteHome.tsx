import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, Wrench, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Vue mobile dédiée pour les admins Flottes-Auto.
 *
 * Accessible uniquement quand un utilisateur avec uniquement des permissions parc/*
 * choisit "Mobile" dans la popup de sélection du mode.
 *
 * ⚠️ Placeholder temporaire pour tester le flow popup → redirection.
 * Sera remplacé progressivement par la vraie interface mobile
 * (recherche, liste de cartes véhicules, modals attribution/restitution).
 */
export function MobileFlotteHome({ onSwitchToDesktop }: { onSwitchToDesktop: () => void }) {
  const { appUser } = usePermissions();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Flottes-Auto</p>
            <p className="text-sm font-semibold text-gray-900">
              {appUser?.prenom} {appUser?.nom}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Se déconnecter"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <Wrench className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Vue mobile en construction
        </h1>

        <p className="text-base text-gray-600 text-center mb-6 max-w-sm">
          L'interface mobile simplifiée pour les attributions, restitutions et états des lieux sera disponible très prochainement.
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-sm mb-6 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Informations de session</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Utilisateur</span>
              <span className="text-gray-900 font-medium">{appUser?.prenom} {appUser?.nom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="text-gray-900 font-medium text-xs">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mode</span>
              <span className="text-blue-600 font-semibold">Mobile</span>
            </div>
          </div>
        </div>

        <button
          onClick={onSwitchToDesktop}
          className="w-full max-w-sm px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          Basculer en mode Desktop
        </button>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">PARC SYNC · Mode Mobile · v0.1</p>
      </div>
    </div>
  );
}