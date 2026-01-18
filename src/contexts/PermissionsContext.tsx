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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    console.log('PermissionsContext effect triggered, user:', user?.id);
    let timeoutId: NodeJS.Timeout;

    const loadPermissions = async () => {
      if (!user) {
        console.log('No user in PermissionsContext, setting loading to false');
        setAppUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      console.log('Loading permissions for user:', user.email);

      try {
        const emailToSearch = user.email?.trim().toLowerCase();

        if (!emailToSearch) {
          setAppUser(null);
          setPermissions([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('utilisateur_avec_permissions')
          .select('*')
          .eq('email', emailToSearch)
          .maybeSingle();

        if (error) {
          console.error('Error loading permissions:', error);
          setAppUser(null);
          setPermissions([]);
        } else if (data) {
          console.log('Permissions loaded successfully:', data.permissions?.length || 0);
          setAppUser(data as AppUser);
          setPermissions(data.permissions || []);
        } else {
          console.warn('No data found for user');
          setAppUser(null);
          setPermissions([]);
        }
      } catch (error) {
        console.error('Exception loading permissions:', error);
        setAppUser(null);
        setPermissions([]);
      } finally {
        console.log('PermissionsContext loading complete, setting loading to false');
        setLoading(false);
      }
    };

    // Timeout de sécurité : après 5 secondes, forcer le déverrouillage
    timeoutId = setTimeout(() => {
      console.warn('Permission loading timeout - forcing unlock');
      setLoading(false);
    }, 5000);

    loadPermissions();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.id, refreshTrigger]);

  const hasPermission = (sectionId: string): boolean => {
    return permissions.includes(sectionId);
  };

  const refreshPermissions = async () => {
    setRefreshTrigger(prev => prev + 1);
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