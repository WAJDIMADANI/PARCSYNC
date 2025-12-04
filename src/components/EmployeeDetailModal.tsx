import { X, User, FileText, MapPin, File, Calendar } from 'lucide-react';
import { ContractBadge } from './ContractBadge';

interface ParsedEmployee {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  data: {
    matricule_tca?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    date_debut_contrat?: string;
    date_fin_contrat?: string;
    numero_securite_sociale?: string;
    poste?: string;
    date_naissance?: string;
    lieu_naissance?: string;
    nationalite?: string;
    genre?: string;
    nom_naissance?: string;
    adresse?: string;
    complement_adresse?: string;
    pays_naissance?: string;
    ville?: string;
    code_postal?: string;
    tel?: string;
    iban?: string;
    bic?: string;
    modele_contrat?: string;
    periode_essai?: string;
    statut_contrat?: string;
    avenant_1_date_debut?: string;
    avenant_1_date_fin?: string;
    avenant_2_date_fin?: string;
    secteur_nom?: string;
    type_piece_identite?: string;
    titre_sejour_fin_validite?: string;
    date_visite_medicale?: string;
    date_fin_visite_medicale?: string;
  };
}

interface EmployeeDetailModalProps {
  employee: ParsedEmployee;
  onClose: () => void;
}

export function EmployeeDetailModal({ employee, onClose }: EmployeeDetailModalProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {employee.data.prenom} {employee.data.nom}
            </h2>
            <p className="text-sm text-gray-600">Ligne {employee.rowNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Identité</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Matricule TCA</label>
                <p className="text-sm text-gray-900">{employee.data.matricule_tca || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                <p className="text-sm text-gray-900">{employee.data.email || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Genre</label>
                <p className="text-sm text-gray-900">{employee.data.genre || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date de naissance</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.date_naissance)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Lieu de naissance</label>
                <p className="text-sm text-gray-900">{employee.data.lieu_naissance || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Pays de naissance</label>
                <p className="text-sm text-gray-900">{employee.data.pays_naissance || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Nationalité</label>
                <p className="text-sm text-gray-900">{employee.data.nationalite || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Nom de naissance</label>
                <p className="text-sm text-gray-900">{employee.data.nom_naissance || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Numéro de sécurité sociale</label>
                <p className="text-sm text-gray-900">{employee.data.numero_securite_sociale || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Téléphone</label>
                <p className="text-sm text-gray-900">{employee.data.tel || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Contrat Principal</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Type de contrat</label>
                <div className="mt-1">
                  <ContractBadge type="type" value={employee.data.modele_contrat} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Statut</label>
                <div className="mt-1">
                  <ContractBadge type="status" value={employee.data.statut_contrat} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.date_debut_contrat)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date de fin</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.date_fin_contrat)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Période d'essai</label>
                <p className="text-sm text-gray-900">{employee.data.periode_essai || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Poste</label>
                <p className="text-sm text-gray-900">{employee.data.poste || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Secteur</label>
                <p className="text-sm text-gray-900">{employee.data.secteur_nom || '-'}</p>
              </div>
            </div>
          </div>

          {(employee.data.avenant_1_date_debut || employee.data.avenant_1_date_fin || employee.data.avenant_2_date_fin) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Avenants</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employee.data.avenant_1_date_debut && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Avenant 1 - Date de début</label>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_1_date_debut)}</p>
                  </div>
                )}
                {employee.data.avenant_1_date_fin && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Avenant 1 - Date de fin</label>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_1_date_fin)}</p>
                  </div>
                )}
                {employee.data.avenant_2_date_fin && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Avenant 2 - Date de fin</label>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_2_date_fin)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Coordonnées</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Adresse</label>
                <p className="text-sm text-gray-900">{employee.data.adresse || '-'}</p>
              </div>
              {employee.data.complement_adresse && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase">Complément d'adresse</label>
                  <p className="text-sm text-gray-900">{employee.data.complement_adresse}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Ville</label>
                <p className="text-sm text-gray-900">{employee.data.ville || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Code postal</label>
                <p className="text-sm text-gray-900">{employee.data.code_postal || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">IBAN</label>
                <p className="text-sm text-gray-900 font-mono">{employee.data.iban || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">BIC</label>
                <p className="text-sm text-gray-900 font-mono">{employee.data.bic || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <File className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Type de pièce d'identité</label>
                <p className="text-sm text-gray-900">{employee.data.type_piece_identite || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Titre de séjour - Fin de validité</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.titre_sejour_fin_validite)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Visite médicale - Date de début</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.date_visite_medicale)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Visite médicale - Date de fin</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.date_fin_visite_medicale)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
