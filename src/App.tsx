import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Apply } from './components/Apply';
import { OnboardingForm } from './components/OnboardingForm';
import ContractSignature from './components/ContractSignature';
import UploadMedicalCertificate from './components/UploadMedicalCertificate';
import UploadAllMissingDocuments from './components/UploadAllMissingDocuments';
import { FirstAdminSetup } from './components/FirstAdminSetup';
import { DemandeExterne } from './components/DemandeExterne';
import { SetPassword } from './components/SetPassword';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const path = window.location.pathname;
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdminSetup = async () => {
      try {
        if (!user) {
          if (isMounted) {
            setCheckingSetup(false);
          }
          return;
        }

        const { data: allUsers, error: allUsersError } = await supabase
          .from('app_utilisateur')
          .select('id')
          .limit(1);

        if (allUsersError && allUsersError.code !== 'PGRST116') {
          throw allUsersError;
        }

        if (!isMounted) return;

        if (!allUsers || allUsers.length === 0) {
          console.log('Aucun utilisateur en base - afficher FirstAdminSetup');
          setNeedsAdminSetup(true);
          setCheckingSetup(false);
          return;
        }

        const { data: currentUserData, error: currentUserError } = await supabase
          .from('app_utilisateur')
          .select('id, email, nom, prenom')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (currentUserError && currentUserError.code !== 'PGRST116') {
          throw currentUserError;
        }

        if (!isMounted) return;

        if (!currentUserData) {
          console.log('Utilisateur connecté non trouvé - création');
          const { error: createError } = await supabase
            .from('app_utilisateur')
            .insert({
              auth_user_id: user.id,
              email: user.email,
              nom: user.email?.split('@')[0] || 'Utilisateur',
              prenom: '',
              actif: true,
            });

          if (createError) throw createError;

          console.log('Utilisateur créé avec succès');
        } else {
          console.log('Utilisateur connecté trouvé:', currentUserData.email);
        }

        if (isMounted) {
          setNeedsAdminSetup(false);
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du setup admin:', err);
        if (isMounted) {
          setNeedsAdminSetup(true);
        }
      } finally {
        if (isMounted) {
          setCheckingSetup(false);
        }
      }
    };

    checkAdminSetup();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Routes publiques accessibles sans authentification
  if (path === '/apply' || path.startsWith('/apply/')) {
    return <Apply />;
  }

  if (path === '/onboarding' || path.startsWith('/onboarding/')) {
    return <OnboardingForm />;
  }

  if (path === '/contract-signature' || path.startsWith('/contract-signature/')) {
    return <ContractSignature />;
  }

  if (path === '/upload-medical-certificate' || path.startsWith('/upload-medical-certificate/')) {
    return <UploadMedicalCertificate />;
  }

  if (path === '/upload-all-documents' || path.startsWith('/upload-all-documents')) {
    return <UploadAllMissingDocuments />;
  }

  if (path === '/demande-externe' || path.startsWith('/demande-externe')) {
    return <DemandeExterne />;
  }

  if (path === '/set-password' || path.startsWith('/set-password')) {
    return <SetPassword />;
  }

  if (loading || checkingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (needsAdminSetup) {
    return <FirstAdminSetup onComplete={() => setNeedsAdminSetup(false)} />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <AppContent />
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;
