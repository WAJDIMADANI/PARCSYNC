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
import { SitesList } from './SitesList';
import { SecteursList } from './SecteursList';
import { ImportSalarieTest } from './ImportSalarieTest';
import { ImportSalariesBulk } from './ImportSalariesBulk';
import { NotificationsList } from './NotificationsList';
import { IncidentsList } from './IncidentsList';
import { IncidentHistory } from './IncidentHistory';
import { UserManagement } from './UserManagement';
import { DemandesPage } from './DemandesPage';
import { ValidationsPage } from './ValidationsPage';
import { LetterTemplatesManager } from './LetterTemplatesManager';
import { GeneratedLettersList } from './GeneratedLettersList';
import { MissingDocuments } from './MissingDocuments';
import { GenerateLetterPage } from './GenerateLetterPage';
import { GenerateLetterV2Page } from './GenerateLetterV2Page';
import { LetterTemplatesV2Manager } from './LetterTemplatesV2Manager';
import { InboxPage } from './InboxPage';
import { DemandesExternesManager } from './DemandesExternesManager';
import AccountingDashboard from './AccountingDashboard';

export function Dashboard() {
  const [view, setView] = useState<View>('dashboards/rh');
  const [viewParams, setViewParams] = useState<any>(null);
  const { signOut, user, appUserNom, appUserPrenom } = useAuth();

  const handleViewChange = (newView: View, params?: any) => {
    setView(newView);
    setViewParams(params || null);
  };

  const renderView = () => {
    switch (view) {
      case 'setup':
        return <SetupCheck />;
      case 'inbox':
        return <InboxPage />;
      case 'rh/candidats':
        return <CandidateList />;
      case 'rh/salaries':
        return <EmployeeList initialProfilId={viewParams?.profilId} />;
      case 'rh/documents':
        return <DocumentsManager />;
      case 'rh/courriers':
        return <GeneratedLettersList />;
      case 'rh/notifications':
        return <NotificationsList
          initialTab={viewParams?.tab}
          onViewProfile={(profilId) => handleViewChange('rh/salaries', { profilId })}
        />;
      case 'rh/documents-manquants':
        return <MissingDocuments onNavigate={handleViewChange} />;
      case 'rh/incidents':
        return <IncidentsList onViewProfile={(profilId) => handleViewChange('rh/salaries', { profilId })} />;
      case 'rh/incidents-historique':
        return <IncidentHistory onViewProfile={(profilId) => handleViewChange('rh/salaries', { profilId })} />;
      case 'rh/vivier':
        return <VivierList />;
      case 'rh/demandes':
        return <DemandesPage />;
      case 'rh/validations':
        return <ValidationsPage />;
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
      case 'compta/entrees':
      case 'compta/sorties':
      case 'compta/rib':
      case 'compta/adresse':
      case 'compta/avenants':
      case 'compta/mutuelle':
      case 'compta/ar':
      case 'compta/avance-frais':
        return <AccountingDashboard currentView={view} onViewChange={handleViewChange} />;
      case 'dashboards/rh':
        return <RHDashboard onNavigate={handleViewChange} />;
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
        return <SitesList />;
      case 'admin/secteurs':
        return <SecteursList />;
      case 'admin/postes':
        return <PostesList />;
      case 'admin/modeles':
        return <LetterTemplatesManager />;
        case 'admin/modeles-courriers-v2':
  return <LetterTemplatesV2Manager />;
      case 'admin/generer-courrier':
        return <GenerateLetterPage />;
      case 'admin/generer-courrier-v2':
        return <GenerateLetterV2Page />;
      case 'admin/modeles-contrats':
        return <ContractTemplates />;
      case 'admin/import-salarie':
        return <ImportSalarieTest />;
      case 'admin/import-bulk':
        return <ImportSalariesBulk />;
      case 'admin/utilisateurs':
        return <UserManagement />;
      case 'admin/demandes-externes':
        return <DemandesExternesManager />;
      default:
        return <CandidateList />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar currentView={view} onViewChange={(v) => handleViewChange(v)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {view === 'setup' && 'Setup Check'}
                {view === 'inbox' && 'Inbox'}
                {view === 'rh/candidats' && 'Candidats'}
                {view === 'rh/salaries' && 'Salariés'}
                {view === 'rh/documents' && 'Documents'}
                {view === 'rh/courriers' && 'Courriers Générés'}
                {view === 'rh/courriers-generes' && 'Courriers Générés'}
                {view === 'rh/notifications' && 'Notifications'}
                {view === 'rh/documents-manquants' && 'Documents Manquants'}
                {view === 'rh/incidents' && 'Incidents'}
                {view === 'rh/incidents-historique' && 'Historique des Incidents'}
                {view === 'rh/vivier' && 'Vivier'}
                {view === 'rh/demandes' && 'Demandes Standardistes'}
                {view === 'rh/validations' && 'Validations'}
                {view === 'parc/vehicules' && 'Véhicules'}
                {view === 'parc/ct-assurance' && 'CT & Assurance'}
                {view === 'parc/maintenance' && 'Maintenance & Garage'}
                {view === 'parc/carburant' && 'Carburant'}
                {view === 'parc/amendes' && 'Amendes'}
                {(view === 'compta/entrees' || view === 'compta/sorties' || view === 'compta/rib' || view === 'compta/adresse' || view === 'compta/avenants' || view === 'compta/mutuelle' || view === 'compta/ar' || view === 'compta/avance-frais') && 'Comptabilité'}
                {view === 'dashboards/rh' && 'Tableau de bord RH'}
                {view === 'dashboards/parc' && 'Tableau de bord Parc'}
                {view === 'exports/rh' && 'Exports RH'}
                {view === 'exports/parc' && 'Exports Parc'}
                {view === 'admin/sites' && 'Sites'}
                {view === 'admin/secteurs' && 'Secteurs'}
                {view === 'admin/postes' && 'Postes'}
                {view === 'admin/modeles' && 'Modèles de Courriers'}
                {view === 'admin/modeles-courriers-v2' && 'Modèles de Courriers V2'}
                {view === 'admin/generer-courrier' && 'Générer un Courrier'}
                {view === 'admin/generer-courrier-v2' && 'Générer un Courrier (V2)'}
                {view === 'admin/modeles-contrats' && 'Modèles de Contrats'}
                {view === 'admin/import-salarie' && 'Import Salarié Test'}
                {view === 'admin/import-bulk' && 'Import en Masse'}
                {view === 'admin/utilisateurs' && 'Gestion des Utilisateurs'}
                {view === 'admin/demandes-externes' && 'Demandes Externes'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">
                  {appUserPrenom && appUserNom
                    ? `${appUserPrenom} ${appUserNom}`
                    : user?.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-lg transition-all duration-200 shadow-soft hover:shadow-glow font-medium text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-4">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
