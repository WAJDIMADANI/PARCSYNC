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
    console.log('⏰ useEffect triggered - loading permissions...');

    const loadPermissions = async () => {
      if (!user) {
        console.warn('⚠️ No user found in AuthContext - user is null/undefined');
        setAppUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const timestamp = new Date().toISOString();
        console.log('🔍 ============================================');
        console.log('🔍 PERMISSIONS LOADING - ' + timestamp);
        console.log('🔍 ============================================');
        console.log('🔍 Step 1: User exists');
        console.log('  - user.id:', user.id);
        console.log('  - user.email:', user.email);
        console.log('  - user.email type:', typeof user.email);

        const emailToSearch = user.email?.trim().toLowerCase();
        console.log('  - email to search (trimmed, lowercase):', `"${emailToSearch}"`);

        if (!emailToSearch) {
          console.error('❌ Email is empty after trim!');
          setAppUser(null);
          setPermissions([]);
          setLoading(false);
          return;
        }

        console.log('🔍 Step 2: Querying utilisateur_avec_permissions VIEW');
        console.log('  - Query: SELECT * FROM utilisateur_avec_permissions');
        console.log('  - Filter: .eq("email", "' + emailToSearch + '")');

        const { data, error } = await supabase
          .from('utilisateur_avec_permissions')
          .select('*')
          .eq('email', emailToSearch)
          .maybeSingle();

        console.log('🔍 Step 3: Query result received');
        console.log('  - data:', data);
        console.log('  - error:', error);

        if (error) {
          console.error('❌ Database error:', error);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error code:', error.code);
          setAppUser(null);
          setPermissions([]);
        } else if (data) {
          console.log('✅ ============================================');
          console.log('✅ USER DATA FOUND!');
          console.log('✅ ============================================');
          console.log('  - User ID:', data.id);
          console.log('  - User email:', data.email);
          console.log('  - User name:', data.prenom + ' ' + data.nom);
          console.log('  - User active:', data.actif);
          console.log('📋 PERMISSIONS ARRAY:', JSON.stringify(data.permissions, null, 2));
          console.log('📊 PERMISSIONS COUNT:', data.permissions?.length || 0);

          if (data.permissions && data.permissions.length > 0) {
            console.log('📋 PERMISSIONS BY CATEGORY:');
            const categorized: Record<string, string[]> = {};
            data.permissions.forEach((perm: string) => {
              const category = perm.split('/')[0];
              if (!categorized[category]) categorized[category] = [];
              categorized[category].push(perm);
            });
            Object.keys(categorized).sort().forEach(category => {
              console.log(`  - ${category}: ${categorized[category].length} permissions`);
              categorized[category].forEach(perm => {
                console.log(`    • ${perm}`);
              });
            });
          }

          setAppUser(data as AppUser);
          setPermissions(data.permissions || []);

          console.log('✅ STATE UPDATED - Permissions set in context');
        } else {
          console.warn('⚠️ ============================================');
          console.warn('⚠️ NO USER DATA FOUND');
          console.warn('⚠️ ============================================');
          console.warn('  - Searched email:', emailToSearch);
          console.warn('  - View returned: NULL');
          console.warn('  - Possible causes:');
          console.warn('    1. User does not exist in app_utilisateur');
          console.warn('    2. Email does not match (case-sensitive issue)');
          console.warn('    3. User exists but has no permissions');
          console.warn('  - Please verify with SQL:');
          console.warn('    SELECT * FROM utilisateur_avec_permissions WHERE email = \'' + emailToSearch + '\';');

          setAppUser(null);
          setPermissions([]);
        }
      } catch (error) {
        console.error('❌ ============================================');
        console.error('❌ EXCEPTION DURING PERMISSIONS LOADING');
        console.error('❌ ============================================');
        console.error('❌ Error:', error);
        setAppUser(null);
        setPermissions([]);
      } finally {
        setLoading(false);
        console.log('✅ Permission loading complete - timestamp:', new Date().toISOString());
        console.log('🔍 ============================================');
      }
    };

    loadPermissions();
  }, [user?.id, refreshTrigger]); // Re-run when user ID changes or manual refresh triggered

  const hasPermission = (sectionId: string): boolean => {
    const has = permissions.includes(sectionId);
    console.log(`🔐 Checking permission "${sectionId}":`, has ? '✅ ALLOWED' : '❌ DENIED');

    if (!has && permissions.length > 0) {
      console.log(`   Available permissions (${permissions.length}):`, permissions);
    } else if (!has && permissions.length === 0) {
      console.log('   ⚠️ No permissions loaded - user may need to refresh or permissions are empty');
    }

    return has;
  };

  const refreshPermissions = async () => {
    console.log('🔄 Manually refreshing permissions...');
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