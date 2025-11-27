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
      setAppUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      console.log('Loading permissions for user:', user.id);
      const { data, error } = await supabase
        .from('utilisateur_avec_permissions')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      console.log('Permissions data:', data);
      console.log('Permissions error:', error);

      if (error) {
        console.error('Error loading permissions:', error);
        setAppUser(null);
        setPermissions([]);
      } else if (data) {
        console.log('Setting appUser with permissions:', data.permissions);
        setAppUser(data as AppUser);
        setPermissions(data.permissions || []);
      } else {
        console.log('No data found for user');
        setAppUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setAppUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [user]);

  const hasPermission = (sectionId: string): boolean => {
    return permissions.includes(sectionId);
  };

  const refreshPermissions = async () => {
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
