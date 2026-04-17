import { AuthProvider, useAuth } from './contexts/AuthContext';
import UploadAbsenceJustificatif from './components/UploadAbsenceJustificatif';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { View } from './components/Sidebar'; // 🆕 ÉTAPE C : import du type View
import { Apply } from './components/Apply';
import { OnboardingForm } from './components/OnboardingForm';
import ContractSignature from './components/ContractSignature';
import UploadMedicalCertificate from './components/UploadMedicalCertificate';
import UploadAllMissingDocuments from './components/UploadAllMissingDocuments';
import { FirstAdminSetup } from './components/FirstAdminSetup';
import { DemandeExterne } from './components/DemandeExterne';
import { SetPassword } from './components/SetPassword';
import { usePermissions } from './contexts/PermissionsContext';
import { ChooseModeModal, DisplayMode } from './components/ChooseModeModal';
import { MobileFlotteHome } from './components/MobileFlotteHome';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// 🆕 ÉTAPE C : détermine la page d'accueil d'un utilisateur selon son pôle principal.
// Règles métier (validées avec l'utilisateur) :
//   1. Si l'user a au moins une perm rh/*    → dashboard RH    (priorité 1, ex: Misba)
//   2. Sinon si une perm parc/*              → dashboard Parc  (ex: houzaifa)
//   3. Sinon si une perm compta/*            → compta/entrees  (pas de dashboards/compta dans l'app)
//   4. Fallback                              → dashboard RH    (user admin-only / exports-only)
// Note : admin et exports ne sont PAS des pôles, ce sont des permissions transverses.
function getDefaultView(permissions: string[]): View {
  if (permissions.some((p) => p.startsWith('rh/'))) return 'dashboards/rh';
  if (permissions.some((p) => p.startsWith('parc/'))) return 'dashboards/parc';
  if (permissions.some((p) => p.startsWith('compta/'))) return 'compta/entrees';
  return 'dashboards/rh';
}

function AppContent() {
  const { user, loading } = useAuth();
  // 🆕 ÉTAPE C : on récupère aussi `permissions` pour calculer la vue initiale.
  const { isFlotteAutoOnly, permissions, loading: permLoading } = usePermissions();
  const [displayMode, setDisplayMode] = useState<DisplayMode | null>(null);
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

  useEffect(() => {
    setDisplayMode(null);
  }, [user?.id]);

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

  if (permLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isFlotteAutoOnly && displayMode === null) {
    return <ChooseModeModal onSelect={(mode) => setDisplayMode(mode)} />;
  }

  if (isFlotteAutoOnly && displayMode === 'mobile') {
    return <MobileFlotteHome onSwitchToDesktop={() => setDisplayMode('desktop')} />;
  }

  // 🆕 ÉTAPE C : on passe la vue initiale calculée à partir des permissions.
  // Misba (rh/*) → dashboards/rh | houzaifa (parc/* only, mode desktop) → dashboards/parc
  return <Dashboard initialView={getDefaultView(permissions)} />;
}

function App() {
  const path = window.location.pathname;

  // Routes publiques - rendu AVANT les providers pour éviter les effets de bord
  if (path === '/apply' || path.startsWith('/apply/')) {
    return <Apply source="apply" />;
  }

  if (path === '/applysite' || path.startsWith('/applysite/')) {
    return <Apply source="applysite" />;
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
  if (path === '/upload-absence-justificatif' || path.startsWith('/upload-absence-justificatif')) {
    return <UploadAbsenceJustificatif />;
  }

  if (path === '/demande-externe' || path.startsWith('/demande-externe')) {
    return <DemandeExterne />;
  }

  if (path === '/set-password' || path.startsWith('/set-password')) {
    return <SetPassword />;
  }

  // Routes authentifiées - enveloppées par les providers
  return (
    <AuthProvider>
      <PermissionsProvider>
        <AppContent />
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;