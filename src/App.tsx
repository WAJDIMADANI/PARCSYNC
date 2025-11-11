import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Apply } from './components/Apply';
import { OnboardingForm } from './components/OnboardingForm';
import ContractSignature from './components/ContractSignature';
import UploadMedicalCertificate from './components/UploadMedicalCertificate';

function AppContent() {
  const { user, loading } = useAuth();
  const path = window.location.pathname;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
