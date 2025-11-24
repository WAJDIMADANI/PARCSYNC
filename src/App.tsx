import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Apply } from './components/Apply';
import { OnboardingForm } from './components/OnboardingForm';
import ContractSignature from './components/ContractSignature';
import UploadMedicalCertificate from './components/UploadMedicalCertificate';
import { FirstAdminSetup } from './components/FirstAdminSetup';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const path = window.location.pathname;
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkAdminSetup = async () => {
      if (!user) {
        setCheckingSetup(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_utilisateur')
          .select('id')
          .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
          setNeedsAdminSetup(true);
        } else {
          setNeedsAdminSetup(false);
        }
      } catch (err) {
        console.error('Error checking admin setup:', err);
        setNeedsAdminSetup(false);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkAdminSetup();
  }, [user]);

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
