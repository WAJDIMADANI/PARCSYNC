import { CheckCircle, AlertTriangle, AlertCircle, Eye, Calendar } from 'lucide-react';
import { ContractBadge } from './ContractBadge';

interface ParsedEmployee {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  selected: boolean;
  data: {
    nom?: string;
    prenom?: string;
    email?: string;
    date_debut_contrat?: string;
    date_fin_contrat?: string;
    modele_contrat?: string;
    statut_contrat?: string;
    secteur_nom?: string;
  };
}

interface EmployeeCardProps {
  employee: ParsedEmployee;
  onSelect: (rowNumber: number, selected: boolean) => void;
  onViewDetails: (employee: ParsedEmployee) => void;
}

export function EmployeeCard({ employee, onSelect, onViewDetails }: EmployeeCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow border-2 p-4 mb-3 ${
        employee.status === 'error'
          ? 'border-red-300 bg-red-50'
          : employee.status === 'warning'
          ? 'border-orange-300 bg-orange-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={employee.selected}
            disabled={employee.status === 'error'}
            onChange={(e) => onSelect(employee.rowNumber, e.target.checked)}
            className="rounded border-gray-300 mt-1"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {employee.data.prenom} {employee.data.nom}
            </h3>
            <p className="text-xs text-gray-500">Ligne {employee.rowNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {employee.status === 'valid' && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          {employee.status === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          )}
          {employee.status === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {employee.data.email && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {employee.data.email}
          </div>
        )}

        {employee.data.secteur_nom && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Secteur:</span> {employee.data.secteur_nom}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {employee.data.modele_contrat && (
            <ContractBadge type="type" value={employee.data.modele_contrat} />
          )}
          {employee.data.statut_contrat && (
            <ContractBadge type="status" value={employee.data.statut_contrat} />
          )}
        </div>

        {employee.data.date_debut_contrat && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(employee.data.date_debut_contrat)}
              {employee.data.date_fin_contrat && ` → ${formatDate(employee.data.date_fin_contrat)}`}
            </span>
          </div>
        )}
      </div>

      {employee.statusMessage && (
        <div
          className={`text-xs p-2 rounded mb-3 ${
            employee.status === 'error'
              ? 'bg-red-100 text-red-900'
              : employee.status === 'warning'
              ? 'bg-orange-100 text-orange-900'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {employee.statusMessage}
        </div>
      )}

      <button
        onClick={() => onViewDetails(employee)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg transition-colors"
      >
        <Eye className="w-4 h-4" />
        <span>Voir tous les détails</span>
      </button>
    </div>
  );
}
