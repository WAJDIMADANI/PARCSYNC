import { ReactNode } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { Shield, AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <Shield className="w-16 h-16 text-red-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Accès refusé</h2>
          <p className="text-slate-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette section.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 text-left">
              Si vous pensez que c'est une erreur, contactez votre administrateur pour obtenir la permission : <span className="font-mono font-semibold">{permission}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
