import { useState } from 'react';
import {
  Users, UserPlus, FileText, Bell, Mail, CheckCircle,
  BarChart3, Download, Settings, ChevronDown, ChevronRight,
  Building, Tag, FileCode, Car, Fuel, AlertTriangle, Shield, Wrench, Sparkles, FolderOpen, Briefcase, Archive, Upload, AlertCircle, History, Phone, FileCheck, FileWarning
} from 'lucide-react';
import { usePermissions } from '../contexts/PermissionsContext';

export type View =
  | 'setup'
  | 'rh/candidats'
  | 'rh/salaries'
  | 'rh/courriers'
  | 'rh/courriers-generes'
  | 'rh/alertes'
  | 'rh/notifications'
  | 'rh/documents-manquants'
  | 'rh/incidents'
  | 'rh/incidents-historique'
  | 'rh/vivier'
  | 'rh/documents'
  | 'rh/demandes'
  | 'parc/vehicules'
  | 'parc/ct-assurance'
  | 'parc/maintenance'
  | 'parc/carburant'
  | 'parc/amendes'
  | 'dashboards/rh'
  | 'dashboards/parc'
  | 'exports/rh'
  | 'exports/parc'
  | 'admin/sites'
  | 'admin/secteurs'
  | 'admin/postes'
  | 'admin/modeles'
  | 'admin/generer-courrier'
  | 'admin/modeles-contrats'
  | 'admin/import-salarie'
  | 'admin/import-bulk'
  | 'admin/utilisateurs';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

interface NavSection {
  id: string;
  label: string;
  icon: any;
  enabled: boolean;
  children?: NavItem[];
}

interface NavItem {
  id: View;
  label: string;
  icon: any;
  enabled: boolean;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['rh', 'parc', 'exports', 'admin'])
  );
  const { hasPermission, permissions } = usePermissions();

  console.log('Sidebar - Current permissions:', permissions);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionClick = (sectionId: string) => {
    if (sectionId === 'rh') {
      onViewChange('dashboards/rh');
    } else if (sectionId === 'parc') {
      onViewChange('dashboards/parc');
    }
    toggleSection(sectionId);
  };

  const navigation: (NavItem | NavSection)[] = [
    {
      id: 'setup',
      label: 'Setup Check',
      icon: CheckCircle,
      enabled: true,
    },
    {
      id: 'rh',
      label: 'RH',
      icon: Users,
      enabled: true,
      children: [
        { id: 'rh/candidats', label: 'Candidats', icon: UserPlus, enabled: true },
        { id: 'rh/salaries', label: 'Salariés', icon: Users, enabled: true },
        { id: 'rh/courriers', label: 'Courriers', icon: Mail, enabled: true },
        { id: 'rh/courriers-generes', label: 'Courriers Générés', icon: FileCheck, enabled: true },
        { id: 'rh/alertes', label: 'Alertes', icon: Bell, enabled: true },
        { id: 'rh/notifications', label: 'Notifications', icon: Sparkles, enabled: true },
        { id: 'rh/documents-manquants', label: 'Documents Manquants', icon: FileWarning, enabled: true },
        { id: 'rh/incidents', label: 'Incidents', icon: AlertCircle, enabled: true },
        { id: 'rh/incidents-historique', label: 'Historique incidents', icon: History, enabled: true },
        { id: 'rh/vivier', label: 'Vivier', icon: Archive, enabled: true },
        { id: 'rh/demandes', label: 'Demandes', icon: Phone, enabled: true },
      ]
    },
    {
      id: 'parc',
      label: 'Parc',
      icon: Car,
      enabled: true,
      children: [
        { id: 'parc/vehicules', label: 'Véhicules', icon: Car, enabled: true },
        { id: 'parc/ct-assurance', label: 'CT & Assurance', icon: Shield, enabled: true },
        { id: 'parc/maintenance', label: 'Maintenance/Garage', icon: Wrench, enabled: true },
        { id: 'parc/carburant', label: 'Carburant', icon: Fuel, enabled: false },
        { id: 'parc/amendes', label: 'Amendes', icon: AlertTriangle, enabled: false },
      ]
    },
    {
      id: 'exports',
      label: 'Exports',
      icon: Download,
      enabled: true,
      children: [
        { id: 'exports/rh', label: 'Exports RH', icon: Download, enabled: true },
        { id: 'exports/parc', label: 'Exports Parc', icon: Download, enabled: true },
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: Settings,
      enabled: true,
      children: [
        { id: 'admin/sites', label: 'Sites', icon: Building, enabled: true },
        { id: 'admin/secteurs', label: 'Secteurs', icon: Tag, enabled: true },
        { id: 'admin/postes', label: 'Postes', icon: Briefcase, enabled: true },
        { id: 'admin/modeles', label: 'Modèles de Courriers', icon: FileCode, enabled: true },
        { id: 'admin/generer-courrier', label: 'Générer Courrier Word', icon: FileCheck, enabled: true },
        { id: 'admin/modeles-contrats', label: 'Modèles Contrats', icon: FileText, enabled: true },
        { id: 'admin/import-salarie', label: 'Import Salarié Test', icon: UserPlus, enabled: true },
        { id: 'admin/import-bulk', label: 'Import en Masse', icon: Upload, enabled: true },
        { id: 'admin/utilisateurs', label: 'Utilisateurs', icon: Users, enabled: true },
      ]
    },
  ];

  const isSection = (item: NavItem | NavSection): item is NavSection => {
    return 'children' in item;
  };

  const filterNavigation = () => {
    return navigation
      .map(item => {
        if (isSection(item) && item.children) {
          const visibleChildren = item.children.filter(child => {
            const hasAccess = hasPermission(child.id);
            console.log(`Checking permission for ${child.id}:`, hasAccess);
            return hasAccess;
          });

          console.log(`Section ${item.id} - Visible children:`, visibleChildren.length);

          if (visibleChildren.length === 0) {
            return null;
          }

          return { ...item, children: visibleChildren };
        }

        return item;
      })
      .filter(Boolean) as (NavItem | NavSection)[];
  };

  return (
    <div className="w-72 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 h-screen overflow-y-auto flex-shrink-0 shadow-2xl">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-50"></div>
            <div className="relative bg-gradient-to-r from-primary-500 to-secondary-500 p-2.5 rounded-xl">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              MAD IMPACT
            </h1>
            <p className="text-xs font-medium text-accent-400">Vague 2 - Flotte</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1 pb-20">
        {filterNavigation().map((item) => {
          if (isSection(item)) {
            const isExpanded = expandedSections.has(item.id);
            const Icon = item.icon;

            return (
              <div key={item.id}>
                <button
                  onClick={() => item.enabled && handleSectionClick(item.id)}
                  disabled={!item.enabled}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    item.enabled
                      ? 'text-slate-200 hover:bg-slate-800/50 hover:shadow-soft'
                      : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  {item.enabled && (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )
                  )}
                </button>

                {isExpanded && item.children && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = currentView === child.id;

                      return (
                        <button
                          key={child.id}
                          onClick={() => child.enabled && onViewChange(child.id)}
                          disabled={!child.enabled}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm group ${
                            isActive
                              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-glow font-medium'
                              : child.enabled
                              ? 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                              : 'text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <ChildIcon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => item.enabled && onViewChange(item.id)}
                disabled={!item.enabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-500 to-accent-400 text-slate-900 shadow-glow font-semibold'
                    : item.enabled
                    ? 'text-slate-200 hover:bg-slate-800/50 hover:shadow-soft'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          }
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 to-transparent">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50">
          <p className="text-xs text-slate-400 text-center font-medium">
            Propulsé par MAD IMPACT
          </p>
        </div>
      </div>
    </div>
  );
}
