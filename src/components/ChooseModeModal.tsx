import { Monitor, Smartphone, LogOut } from 'lucide-react';
import { usePermissions } from '../contexts/PermissionsContext';
import { supabase } from '../lib/supabase';

export type DisplayMode = 'desktop' | 'mobile';

interface ChooseModeModalProps {
  onSelect: (mode: DisplayMode) => void;
}

/**
 * Modal de choix du mode d'affichage (Desktop ou Mobile).
 *
 * S'affiche uniquement pour les admins Flottes-Auto (détectés via isFlotteAutoOnly).
 * L'utilisateur doit obligatoirement choisir un mode pour continuer.
 * La popup s'affiche à chaque connexion (pas de mémorisation).
 */
export function ChooseModeModal({ onSelect }: ChooseModeModalProps) {
  const { appUser } = usePermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue {appUser?.prenom || ''}
          </h2>
          <p className="text-gray-600">
            Choisissez votre mode d'utilisation
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => onSelect('desktop')}
            className="group flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
          >
            <div className="w-16 h-16 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center mb-4 transition-colors">
              <Monitor className="w-8 h-8 text-gray-600 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Desktop</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Interface complète<br />
              Tous les modules Parc
            </p>
            <span className="inline-flex items-center px-4 py-2 bg-gray-100 group-hover:bg-blue-600 group-hover:text-white text-gray-700 rounded-lg font-medium text-sm transition-colors">
              Choisir Desktop
            </span>
          </button>

          <button
            onClick={() => onSelect('mobile')}
            className="group flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200"
          >
            <div className="w-16 h-16 bg-gray-100 group-hover:bg-emerald-100 rounded-full flex items-center justify-center mb-4 transition-colors">
              <Smartphone className="w-8 h-8 text-gray-600 group-hover:text-emerald-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Version simplifiée<br />
              Attribution · Restitution · EDL
            </p>
            <span className="inline-flex items-center px-4 py-2 bg-gray-100 group-hover:bg-emerald-600 group-hover:text-white text-gray-700 rounded-lg font-medium text-sm transition-colors">
              Choisir Mobile
            </span>
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {appUser?.email}
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}