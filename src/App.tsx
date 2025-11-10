import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Apply } from './components/Apply';
import { OnboardingForm } from './components/OnboardingForm';
import ContractSignature from './components/ContractSignature';

function AppContent() {
  const { user, loading } = useAuth();
  const path = window.location.pathname;

  if (path === '/apply') {
    return <Apply />;
  }

  if (path === '/onboarding') {
    return <OnboardingForm />;
  }

  if (path === '/contract-signature') {
    return <ContractSignature />;
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
