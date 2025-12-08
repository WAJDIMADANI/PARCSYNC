import { X, User, FileText, MapPin, File, Calendar, AlertTriangle } from 'lucide-react';
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
    avenant_2_date_debut?: string;
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

  const calculateDaysRemaining = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const endDate = new Date(dateStr);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyLevel = (daysRemaining: number | null): 'expired' | 'critical' | 'urgent' | 'warning' | 'normal' => {
    if (daysRemaining === null) return 'normal';
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= 15) return 'critical';
    if (daysRemaining <= 30) return 'urgent';
    if (daysRemaining <= 90) return 'warning';
    return 'normal';
  };

  const getUrgencyColors = (level: 'expired' | 'critical' | 'urgent' | 'warning' | 'normal') => {
    switch (level) {
      case 'expired':
        return {
          bg: 'bg-red-900',
          border: 'border-red-900',
          text: 'text-white',
          badgeBg: 'bg-white',
          badgeText: 'text-red-900'
        };
      case 'critical':
        return {
          bg: 'bg-red-100',
          border: 'border-red-400',
          text: 'text-red-900',
          badgeBg: 'bg-red-600',
          badgeText: 'text-white'
        };
      case 'urgent':
        return {
          bg: 'bg-orange-100',
          border: 'border-orange-400',
          text: 'text-orange-900',
          badgeBg: 'bg-orange-600',
          badgeText: 'text-white'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-400',
          text: 'text-yellow-900',
          badgeBg: 'bg-yellow-600',
          badgeText: 'text-white'
        };
      default:
        return {
          bg: 'bg-green-100',
          border: 'border-green-400',
          text: 'text-green-900',
          badgeBg: 'bg-green-600',
          badgeText: 'text-white'
        };
    }
  };

  const isCDD = employee.data.modele_contrat?.toUpperCase().includes('CDD');
  const daysRemaining = calculateDaysRemaining(employee.data.date_fin_contrat);
  const urgencyLevel = getUrgencyLevel(daysRemaining);
  const urgencyColors = getUrgencyColors(urgencyLevel);

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
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Contrat Principal</h3>
            </div>

            {employee.data.modele_contrat && (
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 uppercase">Modèle de contrat</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full font-medium">
                        Prévisualisation
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ContractBadge type="type" value={employee.data.modele_contrat} />
                      <span className="text-sm font-medium text-gray-900">
                        {employee.data.modele_contrat}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isCDD && employee.data.date_fin_contrat && daysRemaining !== null && (
              <div className={`mb-4 border-2 rounded-lg p-4 shadow-md ${urgencyColors.bg} ${urgencyColors.border}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${urgencyLevel === 'expired' ? 'bg-white' : urgencyColors.badgeBg}`}>
                    <AlertTriangle className={`w-6 h-6 ${urgencyLevel === 'expired' ? 'text-red-900' : 'text-white'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-bold text-base ${urgencyColors.text}`}>
                        Contrat à durée déterminée
                      </h4>
                      {urgencyLevel === 'expired' ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${urgencyColors.badgeBg} ${urgencyColors.badgeText}`}>
                          EXPIRÉ
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${urgencyColors.badgeBg} ${urgencyColors.badgeText}`}>
                          {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${urgencyColors.text}`}>
                      {urgencyLevel === 'expired' ? (
                        <>Contrat expiré depuis le <span className="font-bold">{formatDate(employee.data.date_fin_contrat)}</span></>
                      ) : (
                        <>Fin prévue le <span className="font-bold">{formatDate(employee.data.date_fin_contrat)}</span></>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Statut</label>
                <div className="mt-1">
                  <ContractBadge type="status" value={employee.data.statut_contrat} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Période d'essai</label>
                <p className="text-sm text-gray-900">{employee.data.periode_essai || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                <p className="text-sm text-gray-900">{formatDate(employee.data.date_debut_contrat)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  Date de fin
                  {employee.data.date_fin_contrat && daysRemaining !== null && urgencyLevel !== 'normal' && (
                    <AlertTriangle className={`w-3.5 h-3.5 ${
                      urgencyLevel === 'expired' ? 'text-red-700' :
                      urgencyLevel === 'critical' ? 'text-red-600' :
                      urgencyLevel === 'urgent' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`} />
                  )}
                </label>
                {employee.data.date_fin_contrat && daysRemaining !== null ? (
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-sm font-semibold ${
                      urgencyLevel === 'expired' ? 'text-red-900' :
                      urgencyLevel === 'critical' ? 'text-red-700' :
                      urgencyLevel === 'urgent' ? 'text-orange-700' :
                      urgencyLevel === 'warning' ? 'text-yellow-700' :
                      'text-gray-900'
                    }`}>
                      {formatDate(employee.data.date_fin_contrat)}
                    </p>
                    {urgencyLevel !== 'normal' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        urgencyLevel === 'expired' ? 'bg-red-200 text-red-900' :
                        urgencyLevel === 'critical' ? 'bg-red-200 text-red-800' :
                        urgencyLevel === 'urgent' ? 'bg-orange-200 text-orange-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {urgencyLevel === 'expired' ? 'Expiré' : `${daysRemaining}j`}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-900 mt-1">{formatDate(employee.data.date_fin_contrat)}</p>
                )}
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

            {(employee.data.avenant_1_date_debut || employee.data.avenant_1_date_fin) && (
              <div className="mt-4">
                <div className="bg-amber-50 border border-amber-300 border-l-4 border-l-orange-500 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-amber-900">Avenant 1</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                      <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_1_date_debut)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de fin</label>
                      <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_1_date_fin)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(employee.data.avenant_2_date_debut || employee.data.avenant_2_date_fin) && (
              <div className="mt-3">
                <div className="bg-amber-50 border border-amber-300 border-l-4 border-l-orange-500 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-amber-900">Avenant 2</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                      <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_2_date_debut)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de fin</label>
                      <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_2_date_fin)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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

          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Documents et dates importantes</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-900">Contrat</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.date_debut_contrat)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-xs font-medium text-gray-500 uppercase">Date de fin</label>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.date_fin_contrat)}</p>
                  </div>
                </div>
              </div>

              {(employee.data.avenant_1_date_debut || employee.data.avenant_1_date_fin ||
                employee.data.avenant_2_date_debut || employee.data.avenant_2_date_fin) && (
                <div className="bg-orange-50 border border-orange-200 border-l-4 border-l-orange-500 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <h4 className="text-sm font-semibold text-orange-900">Avenants</h4>
                  </div>
                  <div className="space-y-3">
                    {(employee.data.avenant_1_date_debut || employee.data.avenant_1_date_fin) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Avenant 1</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                            </div>
                            <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_1_date_debut)}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <label className="text-xs font-medium text-gray-500 uppercase">Date de fin</label>
                            </div>
                            <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_1_date_fin)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {(employee.data.avenant_2_date_debut || employee.data.avenant_2_date_fin) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Avenant 2</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <label className="text-xs font-medium text-gray-500 uppercase">Date de début</label>
                            </div>
                            <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_2_date_debut)}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <label className="text-xs font-medium text-gray-500 uppercase">Date de fin</label>
                            </div>
                            <p className="text-sm text-gray-900">{formatDate(employee.data.avenant_2_date_fin)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 border-l-4 border-l-yellow-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <File className="w-4 h-4 text-yellow-600" />
                  <h4 className="text-sm font-semibold text-yellow-900">Documents administratifs</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <File className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-xs font-medium text-gray-500 uppercase">Type de pièce d'identité</label>
                    </div>
                    <p className="text-sm text-gray-900">{employee.data.type_piece_identite || '-'}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-xs font-medium text-gray-500 uppercase">Titre de séjour - Fin de validité</label>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.titre_sejour_fin_validite)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-xs font-medium text-gray-500 uppercase">Visite médicale - Date de début</label>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.date_visite_medicale)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-xs font-medium text-gray-500 uppercase">Visite médicale - Date de fin</label>
                    </div>
                    <p className="text-sm text-gray-900">{formatDate(employee.data.date_fin_visite_medicale)}</p>
                  </div>
                </div>
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
