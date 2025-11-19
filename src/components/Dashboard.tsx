import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { Sidebar, View } from './Sidebar';
import { EmployeeList } from './EmployeeList';
import { CandidateList } from './CandidateList';
import { VehicleList } from './VehicleList';
import { FuelList } from './FuelList';
import { FinesList } from './FinesList';
import { ContractsList } from './ContractsList';
import { LettersList } from './LettersList';
import { AlertsList } from './AlertsList';
import { SetupCheck } from './SetupCheck';
import { CTAssuranceList } from './CTAssuranceList';
import { MaintenanceList } from './MaintenanceList';
import { ParcDashboard } from './ParcDashboard';
import { ParcExports } from './ParcExports';
import { DocumentsManager } from './DocumentsManager';
import { RHDashboard } from './RHDashboard';
import { ContractTemplates } from './ContractTemplates';
import { PostesList } from './PostesList';
import { VivierList } from './VivierList';

export function Dashboard() {
  const [view, setView] = useState<View>('rh/candidats');
  const { signOut, user } = useAuth();

  const renderView = () => {
    switch (view) {
      case 'setup':
        return <SetupCheck />;
      case 'rh/candidats':
        return <CandidateList />;
      case 'rh/salaries':
        return <EmployeeList />;
      case 'rh/documents':
        return <DocumentsManager />;
      case 'rh/contrats':
        return <ContractsList />;
      case 'rh/courriers':
        return <LettersList />;
      case 'rh/alertes':
        return <AlertsList onVivierClick={() => setView('rh/vivier')} />;
      case 'rh/vivier':
        return <VivierList />;
      case 'parc/vehicules':
        return <VehicleList />;
      case 'parc/ct-assurance':
        return <CTAssuranceList />;
      case 'parc/maintenance':
        return <MaintenanceList />;
      case 'parc/carburant':
        return <FuelList />;
      case 'parc/amendes':
        return <FinesList />;
      case 'dashboards/rh':
        return <RHDashboard />;
      case 'dashboards/parc':
        return <ParcDashboard />;
      case 'exports/rh':
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Exports RH</h2>
            <p className="text-gray-600">Export des données RH vers Excel/CSV à venir</p>
          </div>
        );
      case 'exports/parc':
        return <ParcExports />;
      case 'admin/sites':
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gestion des Sites</h2>
            <p className="text-gray-600">Configuration des sites à venir</p>
          </div>
        );
      case 'admin/secteurs':
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gestion des Secteurs</h2>
            <p className="text-gray-600">Configuration des secteurs à venir</p>
          </div>
        );
      case 'admin/postes':
        return <PostesList />;
      case 'admin/modeles':
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gestion des Modèles</h2>
            <p className="text-gray-600">Configuration des modèles de documents à venir</p>
          </div>
        );
      case 'admin/modeles-contrats':
        return <ContractTemplates />;
      default:
        return <CandidateList />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar currentView={view} onViewChange={setView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {view === 'setup' && 'Setup Check'}
                {view === 'rh/candidats' && 'Candidats'}
                {view === 'rh/salaries' && 'Salariés'}
                {view === 'rh/documents' && 'Documents'}
                {view === 'rh/contrats' && 'Contrats'}
                {view === 'rh/courriers' && 'Courriers'}
                {view === 'rh/alertes' && 'Alertes'}
                {view === 'rh/vivier' && 'Vivier'}
                {view === 'parc/vehicules' && 'Véhicules'}
                {view === 'parc/ct-assurance' && 'CT & Assurance'}
                {view === 'parc/maintenance' && 'Maintenance & Garage'}
                {view === 'parc/carburant' && 'Carburant'}
                {view === 'parc/amendes' && 'Amendes'}
                {view === 'dashboards/rh' && 'Tableau de bord RH'}
                {view === 'dashboards/parc' && 'Tableau de bord Parc'}
                {view === 'exports/rh' && 'Exports RH'}
                {view === 'exports/parc' && 'Exports Parc'}
                {view === 'admin/sites' && 'Sites'}
                {view === 'admin/secteurs' && 'Secteurs'}
                {view === 'admin/postes' && 'Postes'}
                {view === 'admin/modeles' && 'Modèles'}
                {view === 'admin/modeles-contrats' && 'Modèles de Contrats'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{user?.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
