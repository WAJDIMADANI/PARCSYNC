import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  appUserId: string | null;
  appUserNom: string | null;
  appUserPrenom: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [appUserNom, setAppUserNom] = useState<string | null>(null);
  const [appUserPrenom, setAppUserPrenom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAppUserId = async (authUser: User | null) => {
    if (!authUser) {
      setAppUserId(null);
      setAppUserNom(null);
      setAppUserPrenom(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('app_utilisateur')
        .select('id, nom, prenom')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement app_utilisateur:', error);
        return;
      }

      setAppUserId(data?.id ?? null);
      setAppUserNom(data?.nom ?? null);
      setAppUserPrenom(data?.prenom ?? null);
    } catch (error) {
      console.error('Erreur loadAppUserId:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadAppUserId(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        await loadAppUserId(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setUser(null);
      setAppUserId(null);
      setAppUserNom(null);
      setAppUserPrenom(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, appUserId, appUserNom, appUserPrenom, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
