import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  nom: string;
  prenom: string;
  actif: boolean;
  permissions: string[];
}

interface PermissionsContextType {
  appUser: AppUser | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (sectionId: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    if (!user) {
      console.warn('⚠️ No user found in AuthContext - user is null/undefined');
      setAppUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Step 1: User exists');
      console.log('  - user.id:', user.id);
      console.log('  - user.email:', user.email);
      console.log('  - user.email type:', typeof user.email);

      // Ajouter du padding pour voir les espaces
      const emailToSearch = user.email?.trim().toLowerCase();
      console.log('  - email to search (trimmed, lowercase):', `"${emailToSearch}"`);

      if (!emailToSearch) {
        console.error('❌ Email is empty after trim!');
        setAppUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Step 2: Querying utilisateur_avec_permissions');
      const { data, error } = await supabase
        .from('utilisateur_avec_permissions')
        .select('*')
        .eq('email', emailToSearch)
        .maybeSingle();

      console.log('🔍 Step 3: Query result');
      console.log('  - data:', data);
      console.log('  - error:', error);

      if (error) {
        console.error('❌ Database error:', error.message);
        setAppUser(null);
        setPermissions([]);
      } else if (data) {
        console.log('✅ User data found!');
        console.log('  - User ID:', data.id);
        console.log('  - User email:', data.email);
        console.log('  - Permissions array:', data.permissions);
        console.log('  - Permissions count:', data.permissions?.length || 0);

        setAppUser(data as AppUser);
        setPermissions(data.permissions || []);
      } else {
        console.warn('⚠️ No user data found for email:', emailToSearch);
        console.log('  - This means utilisateur_avec_permissions returned null');
        console.log('  - Possible causes:');
        console.log('    1. User does not exist in app_utilisateur');
        console.log('    2. Email does not match exactly (case sensitive?)');
        console.log('    3. User has no permissions in utilisateur_permissions');

        setAppUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error('❌ Exception during loadPermissions:', error);
      setAppUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
      console.log('✅ Permission loading complete');
    }
  };

  useEffect(() => {
    console.log('⏰ useEffect triggered - loading permissions...');
    loadPermissions();
  }, [user]);

  const hasPermission = (sectionId: string): boolean => {
    const has = permissions.includes(sectionId);
    console.log(`🔐 Checking permission "${sectionId}":`, has ? '✅ ALLOWED' : '❌ DENIED');
    return has;
  };

  const refreshPermissions = async () => {
    console.log('🔄 Manually refreshing permissions...');
    await loadPermissions();
  };

  return (
    <PermissionsContext.Provider
      value={{
        appUser,
        permissions,
        loading,
        hasPermission,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}