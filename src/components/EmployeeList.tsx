import { useState, useEffect, useRef } from 'react';
import { supabase, getStorageUrl } from '../lib/supabase';
import { Search, X, Mail, Phone, Building, Briefcase, Calendar, User, MapPin, History, UserX, FileText, Send, Check, ChevronUp, ChevronDown, Filter, CheckCircle, RefreshCw, Edit2, Save, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, EyeOff, CreditCard, Home, Globe, Upload, Trash2, Download } from 'lucide-react';
import EmployeeHistory from './EmployeeHistory';
import EmployeeDeparture from './EmployeeDeparture';
import { LoadingSpinner } from './LoadingSpinner';
import ContractSendModal from './ContractSendModal';
import ContractValidationPanel from './ContractValidationPanel';
import { resolveDocUrl } from '../lib/documentStorage';
import ImportantDocumentUpload from './ImportantDocumentUpload';
import SendMissingDocumentsReminderModal from './SendMissingDocumentsReminderModal';
import { REQUIRED_DOCUMENT_TYPES, REQUIRED_DOCUMENTS_MAP } from '../constants/requiredDocuments';
import Toast from './Toast';
import ConfirmSendContractModal from './ConfirmSendContractModal';
import ManualContractUploadModal from './ManualContractUploadModal';
import ConfirmDeleteContractModal from './ConfirmDeleteContractModal';
import { ContractBadge } from './ContractBadge';

interface Document {
  id: string;
  type: string;
  file_name?: string;
  type_document?: string;
  fichier_url?: string;
  storage_path?: string;
  bucket?: string;
  date_emission?: string;
  date_expiration?: string;
  statut?: string;
  created_at: string;
}

interface Site {
  id: string;
  nom: string;
}

interface Secteur {
  id: string;
  nom: string;
}

interface Employee {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  tel: string | null;
  role: string | null;
  statut: string;
  date_entree: string | null;
  date_sortie: string | null;
  site_id: string | null;
  secteur_id: string | null;
  manager_id: string | null;
  candidat_id: string | null;
  date_fin_visite_medicale: string | null;
  type_piece_identite: string | null;
  titre_sejour_fin_validite: string | null;
  matricule_tca: string | null;
  created_at: string;
  site?: Site;
  secteur?: Secteur;
  manager?: { prenom: string; nom: string };
  date_naissance: string | null;
  lieu_naissance: string | null;
  pays_naissance: string | null;
  nationalite: string | null;
  genre: string | null;
  nom_naissance: string | null;
  numero_securite_sociale: string | null;
  adresse: string | null;
  complement_adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  iban: string | null;
  bic: string | null;
  modele_contrat: string | null;
}

interface Contract {
  id: string;
  profil_id: string;
  statut: string;
  date_signature: string | null;
  yousign_signed_at: string | null;
  created_at: string;
}

type SortField = 'matricule_tca' | 'nom' | 'prenom' | 'role' | 'statut' | 'secteur' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface EmployeeListProps {
  initialProfilId?: string;
}

export function EmployeeList({ initialProfilId }: EmployeeListProps = {}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterSecteur, setFilterSecteur] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const hasProcessedInitialProfile = useRef(false);

  useEffect(() => {
    fetchData();

    // S'abonner aux changements de contrats en temps réel
    // MAIS ne pas recharger si un modal est ouvert
    const contractsChannel = supabase
      .channel('contracts-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contrat'
        },
        (payload) => {
          console.log('🔔 Contrat mis à jour:', payload);
          // Ne rafraîchir QUE si aucun modal n'est ouvert
          if (!isModalOpen) {
            fetchData();
          } else {
            console.log('⏸️ Modal ouvert, refresh différé');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contractsChannel);
    };
  }, []);

  // Si un profilId initial est fourni, ouvrir automatiquement le profil
  useEffect(() => {
    if (initialProfilId && employees.length > 0 && !hasProcessedInitialProfile.current) {
      const employee = employees.find(e => e.id === initialProfilId);
      if (employee) {
        setSelectedEmployee(employee);
        setIsModalOpen(true);
        hasProcessedInitialProfile.current = true;
      }
    }
  }, [initialProfilId, employees]);

  // Auto-refresh toutes les 5 secondes si des contrats sont en attente de signature
  // MAIS seulement si aucun modal n'est ouvert
  useEffect(() => {
    const hasWaitingContract = employees.some(
      emp => emp.statut === 'contrat_envoye'
    );

    // Ne pas auto-refresh si un modal est ouvert
    if (hasWaitingContract && !isModalOpen) {
      console.log('🔄 Auto-refresh activé (contrats en attente)');
      const interval = setInterval(() => {
        fetchData(true); // true = silent refresh
      }, 5000); // 5 secondes

      return () => clearInterval(interval);
    }
  }, [employees, isModalOpen]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [employeesRes, contractsRes, sitesRes, secteursRes] = await Promise.all([
        supabase
          .from('profil')
          .select(`
            *,
            site:site_id(id, nom),
            secteur:secteur_id(id, nom),
            manager:manager_id(prenom, nom)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('contrat')
          .select('id, profil_id, statut, date_signature, yousign_signed_at, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('site').select('*').order('nom'),
        supabase.from('secteur').select('*').order('nom')
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (sitesRes.error) throw sitesRes.error;
      if (secteursRes.error) throw secteursRes.error;

      setEmployees(employeesRes.data || []);
      setContracts(contractsRes.data || []);
      setSites(sitesRes.data || []);
      setSecteurs(secteursRes.data || []);

      if (!silent) {
        console.log('✅ Données chargées:', {
          employees: employeesRes.data?.length,
          contracts: contractsRes.data?.length
        });
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const getEmployeeContractStatus = (employeeId: string): string | null => {
    const contract = contracts
      .filter(c => c.profil_id === employeeId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    return contract?.statut || null;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // Réinitialiser la page à 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatut, filterSecteur]);

  const filteredAndSortedEmployees = employees
    .filter(emp => {
      const matchesSearch = `${emp.prenom} ${emp.nom} ${emp.email} ${emp.role || ''} ${emp.matricule_tca || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatut = !filterStatut || emp.statut === filterStatut;
      const matchesSecteur = !filterSecteur || emp.secteur_id === filterSecteur;
      return matchesSearch && matchesStatut && matchesSecteur;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'matricule_tca':
          aValue = (a.matricule_tca || '').toLowerCase();
          bValue = (b.matricule_tca || '').toLowerCase();
          break;
        case 'nom':
          aValue = a.nom.toLowerCase();
          bValue = b.nom.toLowerCase();
          break;
        case 'prenom':
          aValue = a.prenom.toLowerCase();
          bValue = b.prenom.toLowerCase();
          break;
        case 'role':
          aValue = (a.role || '').toLowerCase();
          bValue = (b.role || '').toLowerCase();
          break;
        case 'statut':
          aValue = a.statut.toLowerCase();
          bValue = b.statut.toLowerCase();
          break;
        case 'secteur':
          aValue = (a.secteur?.nom || '').toLowerCase();
          bValue = (b.secteur?.nom || '').toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Calcul de la pagination
  const totalItems = filteredAndSortedEmployees.length;
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);
  const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === -1 ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedEmployees = itemsPerPage === -1 ? filteredAndSortedEmployees : filteredAndSortedEmployees.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatutBadge = (statut: string, employeeId: string) => {
    // Vérifier le statut réel du contrat
    const contractStatus = getEmployeeContractStatus(employeeId);

    if (contractStatus === 'signe') {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }

    if (contractStatus === 'en_attente_signature') {
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    }

    switch (statut) {
      case 'actif':
        return 'bg-teal-100 text-teal-800 border border-teal-300';
      case 'en_attente_contrat':
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'contrat_envoye':
        return 'bg-sky-100 text-sky-800 border border-sky-300';
      case 'inactif':
        return 'bg-rose-100 text-rose-800 border border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-300';
    }
  };

  const getStatutLabel = (statut: string, employeeId: string) => {
    // Vérifier le statut réel du contrat
    const contractStatus = getEmployeeContractStatus(employeeId);

    if (contractStatus === 'signe') {
      return '✓ Signé';
    }

    if (contractStatus === 'en_attente_signature') {
      return '⏳ En attente signature';
    }

    switch (statut) {
      case 'actif':
        return '✓ Actif';
      case 'en_attente_contrat':
        return '⏳ En attente contrat';
      case 'contrat_envoye':
        return '📧 Contrat envoyé';
      case 'inactif':
        return '✕ Inactif';
      default:
        return statut;
    }
  };

  const clearFilters = () => {
    setFilterStatut('');
    setFilterSecteur('');
  };

  const hasActiveFilters = filterStatut || filterSecteur;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des employés..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employés</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-600">
              {filteredAndSortedEmployees.length} employé(s) {hasActiveFilters && `(sur ${employees.length} au total)`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Affichage par page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={-1}>Tout</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualisation...' : 'Rafraîchir'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtres {hasActiveFilters && `(${[filterStatut, filterSecteur].filter(Boolean).length})`}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="en_attente_contrat">En attente contrat</option>
                <option value="contrat_envoye">Contrat envoyé</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secteur</label>
              <select
                value={filterSecteur}
                onChange={(e) => setFilterSecteur(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les secteurs</option>
                {secteurs.map(secteur => (
                  <option key={secteur.id} value={secteur.id}>{secteur.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredAndSortedEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun employé trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => handleSort('matricule_tca')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Matricule
                      {getSortIcon('matricule_tca')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('nom')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Nom
                      {getSortIcon('nom')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('prenom')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Prénom
                      {getSortIcon('prenom')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('role')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Poste
                      {getSortIcon('role')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('secteur')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Secteur
                      {getSortIcon('secteur')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th
                    onClick={() => handleSort('statut')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Statut
                      {getSortIcon('statut')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Date création
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{employee.matricule_tca || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{employee.nom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.prenom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{employee.role || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{employee.secteur?.nom || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      {employee.tel && (
                        <div className="text-sm text-gray-500">{employee.tel}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg shadow-sm ${getStatutBadge(employee.statut, employee.id)}`}>
                        {getStatutLabel(employee.statut, employee.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Affichage de {startIndex + 1} à {endIndex}</span>
                <span className="text-gray-400">sur</span>
                <span className="font-medium">{totalItems}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  title="Première page"
                >
                  <ChevronsLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 px-4">
                  <span className="text-sm font-medium text-gray-700">Page</span>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-sm">{currentPage}</span>
                  <span className="text-sm text-gray-500">sur</span>
                  <span className="text-sm font-medium text-gray-700">{totalPages}</span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  title="Page suivante"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  title="Dernière page"
                >
                  <ChevronsRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEmployee(null);
            // Rafraîchir les données APRÈS la fermeture du modal
            fetchData();
          }}
          onUpdate={fetchData}
          contractStatus={getEmployeeContractStatus(selectedEmployee.id)}
          onOpen={() => setIsModalOpen(true)}
        />
      )}
    </div>
  );
}

function EmployeeDetailModal({
  employee,
  onClose,
  onUpdate,
  contractStatus,
  onOpen
}: {
  employee: Employee;
  onClose: () => void;
  onUpdate: () => void;
  contractStatus: string | null;
  onOpen: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showDeparture, setShowDeparture] = useState(false);
  const [showContractSend, setShowContractSend] = useState(false);
  const [showContractValidation, setShowContractValidation] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [resending, setResending] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showSendDocumentsModal, setShowSendDocumentsModal] = useState(false);
  const [sendingDocuments, setSendingDocuments] = useState(false);
  const [sendDocumentsSuccess, setSendDocumentsSuccess] = useState(false);
  const [sendDocumentsError, setSendDocumentsError] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editedCertificatExpiration, setEditedCertificatExpiration] = useState(employee.date_fin_visite_medicale || '');
  const [editedTitreSejourExpiration, setEditedTitreSejourExpiration] = useState(employee.titre_sejour_fin_validite || '');
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(employee);
  const [currentContractStatus, setCurrentContractStatus] = useState<string | null>(contractStatus);
  const [savingDates, setSavingDates] = useState(false);
  const [candidatTypePiece, setCandidatTypePiece] = useState<string | null>(null);
  const [candidatDateFinValidite, setCandidatDateFinValidite] = useState<string | null>(null);

  // États pour documents manquants
  const [selectedMissingDocs, setSelectedMissingDocs] = useState<Set<string>>(new Set());
  const [showMissingDocsReminderModal, setShowMissingDocsReminderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // États pour l'envoi de contrat
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmSendModal, setConfirmSendModal] = useState<{ contractId: string; employeeName: string; employeeEmail: string; contractType: string } | null>(null);
  const [isSendingContract, setIsSendingContract] = useState(false);

  // Masking states
  const [showSecuriteSociale, setShowSecuriteSociale] = useState(false);
  const [showIBAN, setShowIBAN] = useState(false);

  // Contracts states
  const [employeeContracts, setEmployeeContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [showManualContractModal, setShowManualContractModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<any | null>(null);
  const [deletingContract, setDeletingContract] = useState(false);

  // Edit states for new tabs
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingBanking, setIsEditingBanking] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);

  // Edited fields for personal info
  const [editedDateNaissance, setEditedDateNaissance] = useState(currentEmployee.date_naissance || '');
  const [editedLieuNaissance, setEditedLieuNaissance] = useState(currentEmployee.lieu_naissance || '');
  const [editedPaysNaissance, setEditedPaysNaissance] = useState(currentEmployee.pays_naissance || '');
  const [editedNationalite, setEditedNationalite] = useState(currentEmployee.nationalite || '');
  const [editedGenre, setEditedGenre] = useState(currentEmployee.genre || '');
  const [editedNomNaissance, setEditedNomNaissance] = useState(currentEmployee.nom_naissance || '');
  const [editedNumeroSS, setEditedNumeroSS] = useState(currentEmployee.numero_securite_sociale || '');

  // Edited fields for address
  const [editedAdresse, setEditedAdresse] = useState(currentEmployee.adresse || '');
  const [editedComplementAdresse, setEditedComplementAdresse] = useState(currentEmployee.complement_adresse || '');
  const [editedVille, setEditedVille] = useState(currentEmployee.ville || '');
  const [editedCodePostal, setEditedCodePostal] = useState(currentEmployee.code_postal || '');

  // Edited fields for banking
  const [editedIBAN, setEditedIBAN] = useState(currentEmployee.iban || '');
  const [editedBIC, setEditedBIC] = useState(currentEmployee.bic || '');

  // NE PAS synchroniser automatiquement avec employee pour éviter les rechargements
  // Le modal garde son état local stable pendant toute sa durée de vie

  useEffect(() => {
    // Signaler que le modal est ouvert
    onOpen();
    fetchDocuments();
    fetchCandidatInfo();
    fetchEmployeeContracts(currentEmployee.id);
  }, []);

  const fetchCandidatInfo = async () => {
    if (!currentEmployee.candidat_id) return;

    try {
      const { data, error } = await supabase
        .from('candidat')
        .select('type_piece_identite, date_fin_validite_piece')
        .eq('id', currentEmployee.candidat_id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCandidatTypePiece(data.type_piece_identite);
        setCandidatDateFinValidite(data.date_fin_validite_piece);
      }
    } catch (error) {
      console.error('Erreur chargement infos candidat:', error);
    }
  };

  const refreshEmployee = async () => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('profil')
        .select('*')
        .eq('id', currentEmployee.id)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (employeeData) {
        setCurrentEmployee(employeeData);
      }

      const { data: contractData } = await supabase
        .from('contrat')
        .select('statut')
        .eq('profil_id', currentEmployee.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentContractStatus(contractData?.statut || null);
    } catch (error) {
      console.error('Erreur rafraîchissement employé:', error);
    }
  };

  const getSignedUrl = async (publicUrl: string): Promise<string> => {
    try {
      const match = publicUrl.match(/\/object\/public\/([^/]+)\/(.+)$/);
      if (!match) {
        console.error('URL format invalide:', publicUrl);
        return publicUrl;
      }

      const bucket = match[1];
      const filePath = match[2];

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Erreur génération URL signée:', error);
        return publicUrl;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Erreur:', error);
      return publicUrl;
    }
  };

  const fetchEmployeeContracts = async (profilId: string) => {
    try {
      setLoadingContracts(true);

      const { data, error } = await supabase
        .from('contrat')
        .select(`
          *,
          modele:modele_id (
            id,
            nom,
            type_contrat
          )
        `)
        .eq('profil_id', profilId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployeeContracts(data || []);
      console.log('✅ Contrats chargés pour le salarié:', data?.length);
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error);
      setEmployeeContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  };

  const deleteManualContract = async () => {
    if (!contractToDelete) return;

    try {
      setDeletingContract(true);

      if (contractToDelete.fichier_signe_url) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([contractToDelete.fichier_signe_url]);

        if (storageError) {
          console.warn('Erreur suppression fichier (peut-être déjà supprimé):', storageError);
        }
      }

      const { error: deleteError } = await supabase
        .from('contrat')
        .delete()
        .eq('id', contractToDelete.id);

      if (deleteError) {
        throw new Error('Erreur lors de la suppression du contrat');
      }

      setToast({ type: 'success', message: 'Contrat supprimé avec succès' });
      await fetchEmployeeContracts(currentEmployee.id);
      setContractToDelete(null);
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      setToast({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    } finally {
      setDeletingContract(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Charger les documents du profil
      const { data: profilDocs, error: profilError } = await supabase
        .from('document')
        .select('*')
        .eq('owner_id', currentEmployee.id)
        .eq('owner_type', 'profil');

      if (profilError) throw profilError;

      let allDocuments = profilDocs || [];

      // Charger les documents du candidat lié (si candidat_id existe)
      if (currentEmployee.candidat_id) {
        const { data: candidatDocs, error: candidatError } = await supabase
          .from('document')
          .select('*')
          .eq('owner_id', currentEmployee.candidat_id)
          .eq('owner_type', 'candidat');

        if (candidatError) throw candidatError;

        // Fusionner les deux tableaux
        allDocuments = [...allDocuments, ...(candidatDocs || [])];
      }

      // Trier par date (plus récent d'abord)
      allDocuments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  // Logique pour identifier les documents manquants
  const getMissingDocuments = () => {
    const existingDocTypes = documents.map(d => d.type_document?.toLowerCase()).filter(Boolean);
    return REQUIRED_DOCUMENT_TYPES.filter(req => {
      return !existingDocTypes.some(existing =>
        existing === req ||
        existing === req.replace('_recto', '') ||
        existing === req.replace('_verso', '')
      );
    });
  };

  const missingDocuments = getMissingDocuments();

  const toggleMissingDocSelection = (docType: string) => {
    setSelectedMissingDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docType)) {
        newSet.delete(docType);
      } else {
        newSet.add(docType);
      }
      return newSet;
    });
  };

  const toggleSelectAllMissing = () => {
    if (selectedMissingDocs.size === missingDocuments.length) {
      setSelectedMissingDocs(new Set());
    } else {
      setSelectedMissingDocs(new Set(missingDocuments));
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  const handleSendDocuments = async () => {
    if (selectedDocuments.size === 0) return;

    setSendingDocuments(true);
    try {
      const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));

      const documentsInfo = await Promise.all(selectedDocs.map(async (doc) => {
        try {
          const url = await resolveDocUrl(doc);
          return {
            type: doc.type,
            label: getDocumentLabel(doc.type),
            url
          };
        } catch (error) {
          console.error('Erreur résolution URL:', error);
          return {
            type: doc.type,
            label: getDocumentLabel(doc.type),
            url: getStorageUrl(doc.fichier_url || doc.storage_path || '')
          };
        }
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-documents-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            employeeEmail: currentEmployee.email,
            employeeName: `${currentEmployee.prenom} ${currentEmployee.nom}`,
            documents: documentsInfo
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi des documents');
      }

      setShowSendDocumentsModal(false);
      setSelectedDocuments(new Set());
      setSendDocumentsSuccess(true);
    } catch (error) {
      console.error('Erreur envoi documents:', error);
      setShowSendDocumentsModal(false);
      setSendDocumentsError(error instanceof Error ? error.message : 'Erreur lors de l\'envoi des documents');
    } finally {
      setSendingDocuments(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    setDeletingDocument(true);
    setDeleteError('');

    try {
      // Delete from storage if storage_path exists
      if (documentToDelete.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(documentToDelete.bucket || 'documents')
          .remove([documentToDelete.storage_path]);

        if (storageError) {
          console.error('Erreur suppression fichier storage:', storageError);
          // Continue anyway to delete database record
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('document')
        .delete()
        .eq('id', documentToDelete.id);

      if (dbError) throw dbError;

      // Refresh documents list
      await fetchDocuments();

      // Close modal and show success
      setDocumentToDelete(null);
      setDeleteSuccess(true);

      // Auto-close success notification after 2 seconds
      setTimeout(() => {
        setDeleteSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur suppression document:', error);
      setDeleteError(error instanceof Error ? error.message : 'Erreur lors de la suppression du document');
      setDocumentToDelete(null);
    } finally {
      setDeletingDocument(false);
    }
  };

  const handleDepartureSuccess = () => {
    onUpdate();
    onClose();
  };

  const handleContractSent = async () => {
    setShowContractSend(false);
    await refreshEmployee();
    onUpdate();
  };

  const handleContractActivated = async () => {
    setShowContractValidation(false);
    await refreshEmployee();
    onUpdate();
  };

  const handleResendContract = async () => {
    setShowResendConfirm(false);
    setResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { data: contrat, error: contratError } = await supabase
        .from('contrat')
        .select('*')
        .eq('profil_id', currentEmployee.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contratError) throw contratError;
      if (!contrat) {
        setResendError('Aucun contrat trouvé pour cet employé');
        return;
      }

      let yousignJustCreated = false;

      // Si le contrat n'a pas de demande Yousign, on en crée une
      if (!contrat.yousign_signature_request_id) {
        console.log('Pas de demande Yousign existante, création en cours...');
        console.log('Contract ID:', contrat.id);
        console.log('API URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-yousign-signature`);

        try {
          const yousignResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-yousign-signature`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ contractId: contrat.id })
            }
          );

          console.log('Yousign Response Status:', yousignResponse.status);

          if (!yousignResponse.ok) {
            const errorText = await yousignResponse.text();
            console.error('Erreur Yousign (status ' + yousignResponse.status + '):', errorText);
            throw new Error('Impossible de créer la demande de signature Yousign: ' + errorText.substring(0, 100));
          }

          const yousignData = await yousignResponse.json();
          console.log('Demande Yousign créée avec succès:', yousignData);
          yousignJustCreated = true;
        } catch (fetchError) {
          console.error('FETCH ERROR:', fetchError);
          throw new Error('Erreur réseau lors de la création Yousign: ' + (fetchError instanceof Error ? fetchError.message : 'Unknown'));
        }
      } else {
        console.log('Demande Yousign déjà existante, envoi d\'un email de rappel...');

        if (!contrat.yousign_signer_id) {
          throw new Error('ID du signataire Yousign manquant. Impossible de renvoyer l\'email.');
        }

        const reminderResponse = await fetch(
          `https://api-sandbox.yousign.app/v3/signature_requests/${contrat.yousign_signature_request_id}/signers/${contrat.yousign_signer_id}/send_reminder`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_YOUSIGN_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!reminderResponse.ok) {
          const errorText = await reminderResponse.text();
          console.error('Erreur lors de l\'envoi du rappel Yousign:', errorText);
          throw new Error('Impossible de renvoyer l\'email de rappel: ' + errorText.substring(0, 100));
        }

        console.log('Email de rappel envoyé avec succès par Yousign');
      }

      console.log('Email envoyé automatiquement par Yousign');

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur lors du renvoi:', error);
      setResendError(error instanceof Error ? error.message : 'Erreur lors du renvoi de l\'email');
    } finally {
      setResending(false);
    }
  };

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cni_recto': 'CNI Recto',
      'cni_verso': 'CNI Verso',
      'rib': 'RIB',
      'carte_vitale': 'Carte Vitale',
      'permis_recto': 'Permis (recto)',
      'permis_verso': 'Permis (verso)',
      'casier_judiciaire': 'Casier judiciaire',
      'attestation_points': 'Attestation de points',
      'cv': 'CV',
      'lettre_motivation': 'Lettre de motivation',
      'autres': 'Autres'
    };
    return labels[type] || type;
  };

  const handleSaveExpirationDates = async () => {
    setSavingDates(true);
    try {
      const { error } = await supabase
        .from('profil')
        .update({
          date_fin_visite_medicale: editedCertificatExpiration || null,
          titre_sejour_fin_validite: editedTitreSejourExpiration || null
        })
        .eq('id', currentEmployee.id);

      if (error) {
        console.error('Erreur Supabase:', error);
        throw new Error(`Erreur de sauvegarde: ${error.message || 'Erreur inconnue'}`);
      }

      // Mettre à jour l'employé localement au lieu de recharger tout
      setCurrentEmployee({
        ...currentEmployee,
        date_fin_visite_medicale: editedCertificatExpiration || null,
        titre_sejour_fin_validite: editedTitreSejourExpiration || null
      });

      setIsEditingDates(false);

      // NE PAS appeler onUpdate() pour éviter le rechargement du modal
      // La liste principale se mettra à jour automatiquement quand on fermera le modal
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des dates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde des dates d'expiration:\n${errorMessage}\n\nVeuillez vérifier que la migration SQL a bien été exécutée dans Supabase.`);
    } finally {
      setSavingDates(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedCertificatExpiration(currentEmployee.date_fin_visite_medicale || '');
    setEditedTitreSejourExpiration(currentEmployee.titre_sejour_fin_validite || '');
    setIsEditingDates(false);
  };

  // Masking functions
  const maskSecuriteSociale = (numero: string | null) => {
    if (!numero) return 'Non renseigné';
    if (showSecuriteSociale) return numero;
    const cleaned = numero.replace(/\s/g, '');
    if (cleaned.length < 8) return numero;
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 3)} ${cleaned.slice(3, 5)} •• ••• ••• ${cleaned.slice(-2)}`;
  };

  const maskIBAN = (iban: string | null) => {
    if (!iban) return 'Non renseigné';
    if (showIBAN) return iban;
    const cleaned = iban.replace(/\s/g, '');
    if (cleaned.length < 8) return iban;
    return `${cleaned.slice(0, 4)} •••• •••• •••• •••• ${cleaned.slice(-4)}`;
  };

  // Save functions for new tabs
  const handleSavePersonalInfo = async () => {
    setSavingPersonal(true);
    try {
      const { error } = await supabase
        .from('profil')
        .update({
          date_naissance: editedDateNaissance || null,
          lieu_naissance: editedLieuNaissance || null,
          pays_naissance: editedPaysNaissance || null,
          nationalite: editedNationalite || null,
          genre: editedGenre || null,
          nom_naissance: editedNomNaissance || null,
          numero_securite_sociale: editedNumeroSS || null
        })
        .eq('id', currentEmployee.id);

      if (error) throw error;

      setCurrentEmployee({
        ...currentEmployee,
        date_naissance: editedDateNaissance || null,
        lieu_naissance: editedLieuNaissance || null,
        pays_naissance: editedPaysNaissance || null,
        nationalite: editedNationalite || null,
        genre: editedGenre || null,
        nom_naissance: editedNomNaissance || null,
        numero_securite_sociale: editedNumeroSS || null
      });

      setIsEditingPersonal(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des informations personnelles');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    try {
      const { error } = await supabase
        .from('profil')
        .update({
          adresse: editedAdresse || null,
          complement_adresse: editedComplementAdresse || null,
          ville: editedVille || null,
          code_postal: editedCodePostal || null
        })
        .eq('id', currentEmployee.id);

      if (error) throw error;

      setCurrentEmployee({
        ...currentEmployee,
        adresse: editedAdresse || null,
        complement_adresse: editedComplementAdresse || null,
        ville: editedVille || null,
        code_postal: editedCodePostal || null
      });

      setIsEditingAddress(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de l\'adresse');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveBanking = async () => {
    setSavingBanking(true);
    try {
      const { error } = await supabase
        .from('profil')
        .update({
          iban: editedIBAN || null,
          bic: editedBIC || null
        })
        .eq('id', currentEmployee.id);

      if (error) throw error;

      setCurrentEmployee({
        ...currentEmployee,
        iban: editedIBAN || null,
        bic: editedBIC || null
      });

      setIsEditingBanking(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des informations bancaires');
    } finally {
      setSavingBanking(false);
    }
  };

  const handleCancelPersonalEdit = () => {
    setEditedDateNaissance(currentEmployee.date_naissance || '');
    setEditedLieuNaissance(currentEmployee.lieu_naissance || '');
    setEditedPaysNaissance(currentEmployee.pays_naissance || '');
    setEditedNationalite(currentEmployee.nationalite || '');
    setEditedGenre(currentEmployee.genre || '');
    setEditedNomNaissance(currentEmployee.nom_naissance || '');
    setEditedNumeroSS(currentEmployee.numero_securite_sociale || '');
    setIsEditingPersonal(false);
  };

  const handleCancelAddressEdit = () => {
    setEditedAdresse(currentEmployee.adresse || '');
    setEditedComplementAdresse(currentEmployee.complement_adresse || '');
    setEditedVille(currentEmployee.ville || '');
    setEditedCodePostal(currentEmployee.code_postal || '');
    setIsEditingAddress(false);
  };

  const handleCancelBankingEdit = () => {
    setEditedIBAN(currentEmployee.iban || '');
    setEditedBIC(currentEmployee.bic || '');
    setIsEditingBanking(false);
  };

  const handleDownloadContract = async (contractId: string) => {
    try {
      const contract = employeeContracts.find((c: any) => c.id === contractId);

      if (!contract) {
        alert('Contrat introuvable');
        return;
      }

      if (contract.fichier_signe_url) {
        const fullUrl = getStorageUrl(contract.fichier_signe_url);
        window.open(fullUrl, '_blank');
      } else {
        alert('PDF non disponible pour ce contrat');
      }
    } catch (error: any) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement: ' + error.message);
    }
  };

  const handleSendContract = async (contractId: string, employeeEmail: string) => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contrat')
        .select(`
          id,
          variables,
          profil:profil_id (
            id,
            prenom,
            nom,
            email
          ),
          modele:modele_id (
            type_contrat
          )
        `)
        .eq('id', contractId)
        .single();

      if (contractError || !contractData) {
        throw new Error('Impossible de récupérer les données du contrat');
      }

      const employeeName = `${contractData.profil.prenom} ${contractData.profil.nom}`;
      const contractType = contractData.modele?.type_contrat || 'Contrat';

      setConfirmSendModal({
        contractId,
        employeeName,
        employeeEmail: contractData.profil.email,
        contractType
      });
    } catch (error: any) {
      console.error('Erreur lors de la préparation:', error);
      setToast({
        type: 'error',
        message: 'Erreur lors de la préparation de l\'envoi: ' + error.message
      });
    }
  };

  const confirmSendContract = async () => {
    if (!confirmSendModal) return;

    setIsSendingContract(true);
    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contrat')
        .select(`
          id,
          variables,
          profil:profil_id (
            id,
            prenom,
            nom,
            email
          )
        `)
        .eq('id', confirmSendModal.contractId)
        .single();

      if (contractError || !contractData) {
        console.error('Contract fetch error:', contractError);
        throw new Error('Impossible de récupérer les données du contrat');
      }

      const employeeName = `${contractData.profil.prenom} ${contractData.profil.nom}`;
      const employeeEmail = contractData.profil.email;

      console.log('Sending contract email to:', employeeEmail);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contract-pdf-simple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            contractId: confirmSendModal.contractId,
            employeeEmail,
            employeeName,
            variables: contractData.variables
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function response error:', response.status, errorText);
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        await supabase
          .from('contrat')
          .update({ date_envoi: new Date().toISOString() })
          .eq('id', confirmSendModal.contractId);

        setToast({
          type: 'success',
          message: `Contrat envoyé avec succès à ${employeeEmail}`
        });
        setConfirmSendModal(null);

        // Refresh data after successful send
        try {
          await fetchData(true);
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
          // Non-critical error, just log it
        }
      } else {
        throw new Error(data.error || 'Impossible d\'envoyer l\'email');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      setToast({
        type: 'error',
        message: 'Erreur lors de l\'envoi: ' + error.message
      });
    } finally {
      setIsSendingContract(false);
    }
  };

  // Afficher le vrai statut basé sur le contrat
  const displayStatut = currentContractStatus === 'signe' ? 'Signé' :
                        currentContractStatus === 'en_attente_signature' ? 'Contrat envoyé' :
                        currentEmployee.statut === 'en_attente_contrat' ? 'En attente contrat' :
                        currentEmployee.statut === 'contrat_envoye' ? 'Contrat envoyé' :
                        currentEmployee.statut;

  const displayBadgeColor = currentContractStatus === 'signe' ? 'bg-green-100 text-green-700' :
                            currentContractStatus === 'en_attente_signature' ? 'bg-yellow-100 text-yellow-700' :
                            currentEmployee.statut === 'actif' ? 'bg-green-100 text-green-700' :
                            currentEmployee.statut === 'en_attente_contrat' ? 'bg-orange-100 text-orange-700' :
                            currentEmployee.statut === 'contrat_envoye' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700';

  // Helper pour formater les dates
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return '-';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
          {/* Header avec gradient */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {currentEmployee.prenom} {currentEmployee.nom}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${displayBadgeColor} bg-white/90`}>
                    {displayStatut}
                  </span>
                  {currentEmployee.role && (
                    <span className="px-3 py-1 text-xs font-semibold bg-white/20 backdrop-blur text-white rounded-full border border-white/30">
                      {currentEmployee.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section Identité */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Identité</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Matricule TCA</label>
                <p className="text-sm text-gray-900">{currentEmployee.matricule_tca || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                <p className="text-sm text-gray-900">{currentEmployee.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Genre</label>
                <p className="text-sm text-gray-900">{currentEmployee.genre || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date de naissance</label>
                <p className="text-sm text-gray-900">{formatDate(currentEmployee.date_naissance)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Lieu de naissance</label>
                <p className="text-sm text-gray-900">{currentEmployee.lieu_naissance || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Pays de naissance</label>
                <p className="text-sm text-gray-900">{currentEmployee.pays_naissance || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Nationalité</label>
                <p className="text-sm text-gray-900">{currentEmployee.nationalite || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Nom de naissance</label>
                <p className="text-sm text-gray-900">{currentEmployee.nom_naissance || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Numéro de sécurité sociale</label>
                <p className="text-sm text-gray-900">{currentEmployee.numero_securite_sociale || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Téléphone</label>
                <p className="text-sm text-gray-900">{currentEmployee.tel || '-'}</p>
              </div>
            </div>
          </div>

          {/* Section Contrat Principal */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Contrat Principal</h3>
            </div>

            {currentEmployee.modele_contrat && (
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
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
                      <ContractBadge type="type" value={currentEmployee.modele_contrat} />
                      <span className="text-sm font-medium text-gray-900">
                        {currentEmployee.modele_contrat}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Statut</label>
                <div className="mt-1">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${displayBadgeColor}`}>
                    {displayStatut}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date d'entrée</label>
                <p className="text-sm text-gray-900">{formatDate(currentEmployee.date_entree)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Secteur</label>
                <p className="text-sm text-gray-900">{currentEmployee.secteur?.nom || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Role</label>
                <p className="text-sm text-gray-900">{currentEmployee.role || '-'}</p>
              </div>
            </div>
          </div>

          {/* Section Coordonnées */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Coordonnées</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Adresse</label>
                <p className="text-sm text-gray-900">{currentEmployee.adresse || '-'}</p>
              </div>
              {currentEmployee.complement_adresse && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase">Complément d'adresse</label>
                  <p className="text-sm text-gray-900">{currentEmployee.complement_adresse}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Ville</label>
                <p className="text-sm text-gray-900">{currentEmployee.ville || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Code postal</label>
                <p className="text-sm text-gray-900">{currentEmployee.code_postal || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">IBAN</label>
                <p className="text-sm text-gray-900 font-mono">{currentEmployee.iban || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">BIC</label>
                <p className="text-sm text-gray-900 font-mono">{currentEmployee.bic || '-'}</p>
              </div>
            </div>
          </div>

          {/* Section Documents importants - Dates d'expiration */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/30 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Documents importants</h3>
              </div>
              {!isEditingDates ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    Ajouter un document
                  </button>
                  <button
                    onClick={() => setIsEditingDates(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={savingDates}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveExpirationDates}
                    disabled={savingDates}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    {savingDates ? (
                      <LoadingSpinner size="sm" variant="white" text="Enregistrement..." />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Certificat médical */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Certificat médical - Date d'expiration</p>
                </div>
                {isEditingDates ? (
                  <input
                    type="date"
                    value={editedCertificatExpiration}
                    onChange={(e) => setEditedCertificatExpiration(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {currentEmployee.date_fin_visite_medicale
                      ? new Date(currentEmployee.date_fin_visite_medicale).toLocaleDateString('fr-FR')
                      : 'Non renseignée'}
                  </p>
                )}
              </div>

              {/* Carte de séjour - Afficher si type_piece_identite contient séjour/résident */}
              {(() => {
                const typePiece = currentEmployee.type_piece_identite?.toLowerCase() || '';
                const typePieceCandidat = candidatTypePiece?.toLowerCase() || '';
                const hasTitreSejour =
                  typePiece.includes('sejour') ||
                  typePiece.includes('séjour') ||
                  typePiece.includes('resident') ||
                  typePiece.includes('résident') ||
                  typePieceCandidat.includes('sejour') ||
                  typePieceCandidat.includes('séjour') ||
                  typePieceCandidat.includes('resident') ||
                  typePieceCandidat.includes('résident');

                if (!hasTitreSejour) return null;

                const isResident = typePiece.includes('resident') || typePiece.includes('résident') ||
                                   typePieceCandidat.includes('resident') || typePieceCandidat.includes('résident');
                const label = isResident
                  ? 'Carte de résident - Date d\'expiration'
                  : 'Carte/Titre de séjour - Date d\'expiration';

                return (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {label}
                      </p>
                    </div>
                    {isEditingDates ? (
                      <input
                        type="date"
                        value={editedTitreSejourExpiration}
                        onChange={(e) => setEditedTitreSejourExpiration(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {currentEmployee.titre_sejour_fin_validite
                          ? new Date(currentEmployee.titre_sejour_fin_validite).toLocaleDateString('fr-FR')
                          : candidatDateFinValidite
                          ? new Date(candidatDateFinValidite).toLocaleDateString('fr-FR')
                          : 'Non renseignée'}
                      </p>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>

          {/* Section Documents */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/30 rounded-xl p-5 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Documents</h3>
                {documents.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-orange-200 text-orange-800 text-xs font-bold rounded-full">
                    {documents.length}
                  </span>
                )}
              </div>
              {documents.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-orange-700 hover:text-orange-800 font-semibold transition-colors"
                  >
                    {selectedDocuments.size === documents.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                  {selectedDocuments.size > 0 && (
                    <button
                      onClick={() => setShowSendDocumentsModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Mail className="w-4 h-4" />
                      Envoyer ({selectedDocuments.size})
                    </button>
                  )}
                </div>
              )}
            </div>
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8 bg-white rounded-lg">
                <LoadingSpinner size="md" text="Chargement des documents..." />
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-900 mb-1">Aucun document</p>
                    <p className="text-yellow-700 text-sm">
                      Les documents ne sont copiés que pour les employés créés après la mise à jour du système.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg hover:shadow-md transition-all border border-orange-200 hover:border-orange-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                    />
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{doc.type_document}</p>
                      <p className="text-xs text-gray-500">
                        Téléchargé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium text-xs shadow-sm hover:shadow-md flex items-center gap-1.5 transform hover:scale-105"
                        title="Voir le document"
                      >
                        <FileText className="w-4 h-4" />
                        Voir
                      </a>
                      <button
                        onClick={() => setDocumentToDelete(doc)}
                        className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-medium text-xs shadow-sm hover:shadow-md flex items-center gap-1.5 transform hover:scale-105"
                        title="Supprimer le document"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Documents manquants */}
          {missingDocuments.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-red-100/30 rounded-xl p-5 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Documents manquants à télécharger</h3>
                  <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded-full">
                    {missingDocuments.length}
                  </span>
                </div>
                {missingDocuments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAllMissing}
                      className="text-sm text-red-700 hover:text-red-800 font-semibold transition-colors"
                    >
                      {selectedMissingDocs.size === missingDocuments.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    {selectedMissingDocs.size > 0 && (
                      <button
                        onClick={() => setShowMissingDocsReminderModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Send className="w-4 h-4" />
                        Envoyer un rappel ({selectedMissingDocs.size})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Info :</strong> Vous pouvez sélectionner les documents manquants et envoyer un email de rappel au salarié avec un lien sécurisé pour les télécharger.
                </p>
              </div>

              <div className="space-y-2">
                {missingDocuments.map((docType) => (
                  <div
                    key={docType}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg hover:shadow-md transition-all border border-red-200 hover:border-red-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMissingDocs.has(docType)}
                      onChange={() => toggleMissingDocSelection(docType)}
                      className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                    />
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{REQUIRED_DOCUMENTS_MAP[docType]?.label || docType}</p>
                      <p className="text-xs text-red-600 font-semibold">Document obligatoire manquant</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ID Section */}
          <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-400 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">#</span>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-700">ID:</span> <span className="font-mono text-gray-900">{currentEmployee.id}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
            <div className="flex flex-wrap gap-3">
              {currentEmployee.statut === 'en_attente_contrat' && (
                <button
                  onClick={() => setShowContractSend(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg font-medium"
                >
                  <Send className="w-4 h-4" />
                  Envoyer le contrat
                </button>
              )}

              {(currentEmployee.statut === 'contrat_envoye' || currentContractStatus === 'signe' || currentContractStatus === 'en_attente_signature') && (
                <>
                  <button
                    onClick={() => setShowContractValidation(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {currentContractStatus === 'signe' ? 'Activer le salarié' : 'Valider le contrat'}
                  </button>
                  <button
                    onClick={() => setShowResendConfirm(true)}
                    disabled={resending}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <LoadingSpinner size="sm" variant="white" text="Envoi..." />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Renvoyer le contrat
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <History className="w-4 h-4" />
                Voir l'historique
              </button>

              {currentEmployee.statut === 'actif' && (
                <button
                  onClick={() => setShowDeparture(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <UserX className="w-4 h-4" />
                  Gérer le départ
                </button>
              )}
            </div>
          </div>


          {/* Section Contrats signés */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Contrats signés</h3>
                {employeeContracts.length > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                    {employeeContracts.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowManualContractModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                title="Ajouter un contrat manuel"
              >
                <Upload className="w-4 h-4" />
                Ajouter un contrat
              </button>
            </div>

            {loadingContracts ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
                <p className="ml-3 text-gray-500">Chargement des contrats...</p>
              </div>
            ) : employeeContracts.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucun contrat trouvé pour ce salarié</p>
                <p className="text-sm text-gray-500 mt-1">Les contrats signés apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employeeContracts.map((contract: any) => {
                  const isManual = contract.source === 'manuel' || !contract.modele_id;
                  const typeContrat = isManual && contract.variables?.type_contrat
                    ? contract.variables.type_contrat
                    : contract.modele?.type_contrat || 'Autre';
                  const nomModele = isManual && contract.variables?.poste
                    ? contract.variables.poste
                    : contract.modele?.nom || 'Contrat de travail';
                  const statut = contract.statut;
                  const dateSignature = contract.date_signature || contract.yousign_signed_at;
                  const dateCreation = contract.created_at;
                  const hasPdf = contract.fichier_signe_url;

                  const getTypeColor = (type: string) => {
                    const lowerType = type.toLowerCase();
                    if (lowerType.includes('cdi')) return 'bg-green-100 text-green-800 border-green-300';
                    if (lowerType.includes('cdd')) return 'bg-blue-100 text-blue-800 border-blue-300';
                    if (lowerType.includes('ctt')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                    if (lowerType.includes('stage')) return 'bg-purple-100 text-purple-800 border-purple-300';
                    if (lowerType.includes('alternance')) return 'bg-orange-100 text-orange-800 border-orange-300';
                    return 'bg-gray-100 text-gray-800 border-gray-300';
                  };

                  const getStatutDisplay = (st: string) => {
                    if (st === 'signe') return { label: 'Signé', color: 'bg-green-100 text-green-800 border-green-300' };
                    if (st === 'en_attente_signature') return { label: 'En attente signature', color: 'bg-amber-100 text-amber-800 border-amber-300' };
                    if (st === 'envoye') return { label: 'Envoyé', color: 'bg-blue-100 text-blue-800 border-blue-300' };
                    return { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 border-gray-300' };
                  };

                  const statutDisplay = getStatutDisplay(statut);

                  return (
                    <div key={contract.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-base mb-2">{nomModele}</h4>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTypeColor(typeContrat)}`}>
                                {typeContrat}
                              </span>
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statutDisplay.color}`}>
                                {statutDisplay.label}
                              </span>
                              {isManual && (
                                <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-slate-100 text-slate-800 border-slate-300 flex items-center gap-1">
                                  <Upload className="w-3 h-3" />
                                  Manuel
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                              {dateSignature && (
                                <p>✓ Signé le {new Date(dateSignature).toLocaleDateString('fr-FR')}</p>
                              )}
                              <p>Créé le {new Date(dateCreation).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasPdf && (
                            <button
                              onClick={() => {
                                const url = resolveDocUrl(contract.fichier_signe_url);
                                window.open(url, '_blank');
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                            >
                              <Download className="w-4 h-4" />
                              Télécharger
                            </button>
                          )}
                          {!isManual && (
                            <button
                              onClick={() => handleSendContract(contract.id, currentEmployee.email)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                              Envoyer
                            </button>
                          )}
                          {isManual && (
                            <button
                              onClick={() => setContractToDelete(contract)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                              title="Supprimer ce contrat"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section Actions */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
            <div className="flex flex-wrap gap-3">
              {currentEmployee.statut === 'en_attente_contrat' && (
                <button
                  onClick={() => setShowContractSend(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg font-medium"
                >
                  <Send className="w-4 h-4" />
                  Envoyer le contrat
                </button>
              )}

              {(currentEmployee.statut === 'contrat_envoye' || currentContractStatus === 'signe' || currentContractStatus === 'en_attente_signature') && (
                <>
                  <button
                    onClick={() => setShowContractValidation(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {currentContractStatus === 'signe' ? 'Activer le salarié' : 'Valider le contrat'}
                  </button>
                  <button
                    onClick={() => setShowResendConfirm(true)}
                    disabled={resending}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <LoadingSpinner size="sm" variant="white" text="Envoi..." />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Renvoyer le contrat
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg font-medium"
              >
                <History className="w-4 h-4" />
                Historique
              </button>

              <button
                onClick={() => setShowDeparture(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg font-medium"
              >
                <UserX className="w-4 h-4" />
                Départ salarié
              </button>
            </div>
          </div>

          {/* ID Section */}
          <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-400 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">#</span>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-700">ID:</span> <span className="font-mono text-gray-900">{currentEmployee.id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showHistory && (
      <EmployeeHistory
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowHistory(false)}
      />
    )}

    {showDeparture && (
      <EmployeeDeparture
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowDeparture(false)}
        onSuccess={handleDepartureSuccess}
      />
    )}

    {showContractSend && (
      <ContractSendModal
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        employeeEmail={currentEmployee.email}
        onClose={() => setShowContractSend(false)}
        onSuccess={handleContractSent}
      />
    )}

    {showContractValidation && (
      <ContractValidationPanel
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowContractValidation(false)}
        onActivate={handleContractActivated}
      />
    )}

    {showResendConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Renvoyer le contrat</h3>
          <p className="text-gray-700 mb-6">
            Voulez-vous renvoyer l'email de contrat à <strong>{currentEmployee.prenom} {currentEmployee.nom}</strong> ?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowResendConfirm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleResendContract}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Renvoyer
            </button>
          </div>
        </div>
      </div>
    )}

    {resendSuccess && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Email envoyé !</h3>
          </div>
          <p className="text-gray-700 mb-6">
            L'email de contrat a été renvoyé avec succès à <strong>{currentEmployee.prenom} {currentEmployee.nom}</strong>.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setResendSuccess(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    {resendError && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Erreur</h3>
          </div>
          <p className="text-gray-700 mb-2">Erreur lors du renvoi de l'email :</p>
          <p className="text-red-600 font-medium mb-6">{resendError}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setResendError('')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}

    {/************* Tous les autres modals restent ici **************/}

    {/* Upload Modal */}
    {showUploadModal && (
      <ImportantDocumentUpload
        profilId={currentEmployee.id}
        onClose={() => {
          setShowUploadModal(false);
          fetchEmployeeDocuments(currentEmployee.id);
        }}
      />
    )}

    {/* Missing Documents Reminder Modal */}
    {showMissingDocsReminderModal && (
      <SendMissingDocumentsReminderModal
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        employeeEmail={currentEmployee.email}
        selectedDocuments={Array.from(selectedMissingDocs)}
        onClose={() => {
          setShowMissingDocsReminderModal(false);
          setSelectedMissingDocs(new Set());
        }}
      />
    )}

    {/* Manual Contract Upload Modal */}
    {showManualContractModal && (
      <ManualContractUploadModal
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} {currentEmployee.nom}`}
        onClose={() => {
          setShowManualContractModal(false);
          fetchEmployeeContracts(currentEmployee.id);
        }}
      />
    )}

    {/* Contract Delete Confirmation */}
    {contractToDelete && (
      <ConfirmDeleteContractModal
        contractId={contractToDelete.id}
        contractName={contractToDelete.modele?.nom || 'ce contrat'}
        onConfirm={handleDeleteContract}
        onCancel={() => setContractToDelete(null)}
        isDeleting={deletingContract}
      />
    )}

    {/* Toast */}
    {toast && (
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(null)}
      />
    )}

    {/* Contract Send Confirmation Modal */}
    {confirmSendModal && (
      <ConfirmSendContractModal
        contractType={confirmSendModal.contractType}
        employeeName={confirmSendModal.employeeName}
        employeeEmail={confirmSendModal.employeeEmail}
        onConfirm={() => handleConfirmSendContract(confirmSendModal.contractId)}
        onCancel={() => setConfirmSendModal(null)}
        isSending={isSendingContract}
      />
    )}

    {showSendDocumentsModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Envoi de documents</h3>
                <p className="text-blue-100 text-sm">{selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} sélectionné{selectedDocuments.size > 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSendDocumentsModal(false)}
              disabled={sendingDocuments}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Destinataire */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Destinataire</label>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-lg">{currentEmployee.prenom} {currentEmployee.nom}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-gray-600 truncate">{currentEmployee.email}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Documents à envoyer - Continue from here */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Documents à envoyer</label>
                        </label>
                        <input
                          type="date"
                          value={editedDateNaissance}
                          onChange={(e) => setEditedDateNaissance(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Lieu de naissance
                        </label>
                        <input
                          type="text"
                          value={editedLieuNaissance}
                          onChange={(e) => setEditedLieuNaissance(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Pays de naissance
                        </label>
                        <input
                          type="text"
                          value={editedPaysNaissance}
                          onChange={(e) => setEditedPaysNaissance(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Nationalité
                        </label>
                        <input
                          type="text"
                          value={editedNationalite}
                          onChange={(e) => setEditedNationalite(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Genre
                        </label>
                        <select
                          value={editedGenre}
                          onChange={(e) => setEditedGenre(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="Homme">Homme</option>
                          <option value="Femme">Femme</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Nom de naissance
                        </label>
                        <input
                          type="text"
                          value={editedNomNaissance}
                          onChange={(e) => setEditedNomNaissance(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm md:col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Numéro de sécurité sociale
                        </label>
                        <input
                          type="text"
                          value={editedNumeroSS}
                          onChange={(e) => setEditedNumeroSS(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
                          placeholder="1 89 03 75 123 456 78"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={handleCancelPersonalEdit}
                        disabled={savingPersonal}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSavePersonalInfo}
                        disabled={savingPersonal}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        {savingPersonal ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date de naissance</p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {currentEmployee.date_naissance
                          ? new Date(currentEmployee.date_naissance).toLocaleDateString('fr-FR')
                          : <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-orange-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lieu de naissance</p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {currentEmployee.lieu_naissance || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-orange-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pays de naissance</p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {currentEmployee.pays_naissance || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-orange-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationalité</p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {currentEmployee.nationalite || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-orange-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Genre</p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {currentEmployee.genre || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>

                    {currentEmployee.nom_naissance && (
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-orange-600" />
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom de naissance</p>
                        </div>
                        <p className="text-gray-900 font-medium">{currentEmployee.nom_naissance}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-3 shadow-sm md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-600" />
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Numéro de sécurité sociale</p>
                        </div>
                        {currentEmployee.numero_securite_sociale && (
                          <button
                            onClick={() => setShowSecuriteSociale(!showSecuriteSociale)}
                            className="text-orange-600 hover:text-orange-700 transition-colors"
                          >
                            {showSecuriteSociale ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium font-mono">
                        {maskSecuriteSociale(currentEmployee.numero_securite_sociale)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Adresse Tab */}
          {activeTab === 'address' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/30 rounded-xl p-5 border border-cyan-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Adresse</h3>
                  </div>
                  {!isEditingAddress && (
                    <button
                      onClick={() => setIsEditingAddress(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                  )}
                </div>

                {isEditingAddress ? (
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                        Adresse ligne 1
                      </label>
                      <input
                        type="text"
                        value={editedAdresse}
                        onChange={(e) => setEditedAdresse(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Numéro et rue"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                        Adresse ligne 2 (complément)
                      </label>
                      <input
                        type="text"
                        value={editedComplementAdresse}
                        onChange={(e) => setEditedComplementAdresse(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Bâtiment, appartement, etc."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Code postal
                        </label>
                        <input
                          type="text"
                          value={editedCodePostal}
                          onChange={(e) => setEditedCodePostal(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          placeholder="75001"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                          Ville
                        </label>
                        <input
                          type="text"
                          value={editedVille}
                          onChange={(e) => setEditedVille(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          placeholder="Paris"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={handleCancelAddressEdit}
                        disabled={savingAddress}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveAddress}
                        disabled={savingAddress}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                      >
                        {savingAddress ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentEmployee.adresse || currentEmployee.ville ? (
                      <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-cyan-600">
                        {currentEmployee.adresse && (
                          <p className="text-gray-900 font-medium">{currentEmployee.adresse}</p>
                        )}
                        {currentEmployee.complement_adresse && (
                          <p className="text-gray-700">{currentEmployee.complement_adresse}</p>
                        )}
                        {(currentEmployee.code_postal || currentEmployee.ville) && (
                          <p className="text-gray-900 font-medium mt-1">
                            {currentEmployee.code_postal} {currentEmployee.ville}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                        <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 italic">Aucune adresse renseignée</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations bancaires Tab */}
          {activeTab === 'banking' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100/30 rounded-xl p-5 border border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Informations bancaires</h3>
                  </div>
                  {!isEditingBanking && (
                    <button
                      onClick={() => setIsEditingBanking(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    <strong>Données sensibles :</strong> Ces informations sont confidentielles et masquées par défaut.
                  </p>
                </div>

                {isEditingBanking ? (
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={editedIBAN}
                        onChange={(e) => setEditedIBAN(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
                        placeholder="FR76 1234 5678 9012 3456 7890 123"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                        BIC
                      </label>
                      <input
                        type="text"
                        value={editedBIC}
                        onChange={(e) => setEditedBIC(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
                        placeholder="BNPAFRPPXXX"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={handleCancelBankingEdit}
                        disabled={savingBanking}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveBanking}
                        disabled={savingBanking}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {savingBanking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-red-600" />
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IBAN</p>
                        </div>
                        {currentEmployee.iban && (
                          <button
                            onClick={() => setShowIBAN(!showIBAN)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            {showIBAN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium font-mono text-sm">
                        {maskIBAN(currentEmployee.iban)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Building className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">BIC</p>
                      </div>
                      <p className="text-gray-900 font-medium font-mono text-sm">
                        {currentEmployee.bic || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/30 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Contrats du salarié</h3>
                    {employeeContracts.length > 0 && (
                      <span className="ml-2 bg-purple-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                        {employeeContracts.length} {employeeContracts.length === 1 ? 'contrat' : 'contrats'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowManualContractModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                    title="Ajouter un contrat manuel"
                  >
                    <Upload className="w-4 h-4" />
                    Ajouter un contrat
                  </button>
                </div>

                {loadingContracts ? (
                  <div className="flex justify-center items-center py-12">
                    <LoadingSpinner />
                    <p className="ml-3 text-gray-500">Chargement des contrats...</p>
                  </div>
                ) : employeeContracts.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Aucun contrat trouvé pour ce salarié</p>
                    <p className="text-sm text-gray-500 mt-1">Les contrats signés apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeContracts.map((contract: any) => {
                      const isManual = contract.source === 'manuel' || !contract.modele_id;
                      const typeContrat = isManual && contract.variables?.type_contrat
                        ? contract.variables.type_contrat
                        : contract.modele?.type_contrat || 'Autre';
                      const nomModele = isManual && contract.variables?.poste
                        ? contract.variables.poste
                        : contract.modele?.nom || 'Contrat de travail';
                      const statut = contract.statut;
                      const dateSignature = contract.date_signature || contract.yousign_signed_at;
                      const dateCreation = contract.created_at;
                      const hasPdf = contract.fichier_signe_url;

                      const getTypeColor = (type: string) => {
                        const lowerType = type.toLowerCase();
                        if (lowerType.includes('cdi')) return 'bg-green-100 text-green-800 border-green-300';
                        if (lowerType.includes('cdd')) return 'bg-blue-100 text-blue-800 border-blue-300';
                        if (lowerType.includes('ctt')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                        if (lowerType.includes('stage')) return 'bg-purple-100 text-purple-800 border-purple-300';
                        if (lowerType.includes('alternance')) return 'bg-orange-100 text-orange-800 border-orange-300';
                        return 'bg-gray-100 text-gray-800 border-gray-300';
                      };

                      const getStatutDisplay = (st: string) => {
                        if (st === 'signe') return { label: 'Signé', color: 'bg-green-100 text-green-800 border-green-300' };
                        if (st === 'en_attente_signature') return { label: 'En attente signature', color: 'bg-amber-100 text-amber-800 border-amber-300' };
                        if (st === 'envoye') return { label: 'Envoyé', color: 'bg-blue-100 text-blue-800 border-blue-300' };
                        return { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 border-gray-300' };
                      };

                      const statutDisplay = getStatutDisplay(statut);

                      return (
                        <div key={contract.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                <FileText className="w-5 h-5 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base mb-2">{nomModele}</h4>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTypeColor(typeContrat)}`}>
                                    {typeContrat}
                                  </span>
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statutDisplay.color}`}>
                                    {statutDisplay.label}
                                  </span>
                                  {isManual && (
                                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-slate-100 text-slate-800 border-slate-300 flex items-center gap-1">
                                      <Upload className="w-3 h-3" />
                                      Manuel
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {contract.date_debut && (
                                    <p className="text-sm text-gray-700 font-medium flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4 text-blue-600" />
                                      Début du contrat: {new Date(contract.date_debut).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                  {contract.date_fin && (
                                    <p className="text-sm text-orange-700 font-medium flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4 text-orange-600" />
                                      Fin du contrat: {new Date(contract.date_fin).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                  {dateSignature && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      Signé le {new Date(dateSignature).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    Créé le {new Date(dateCreation).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleDownloadContract(contract.id)}
                                disabled={!hasPdf}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  hasPdf
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title={!hasPdf ? 'PDF non disponible' : 'Télécharger le PDF'}
                              >
                                <Download className="w-4 h-4" />
                                Télécharger
                              </button>
                              {!isManual && (
                                <button
                                  onClick={() => handleSendContract(contract.id, currentEmployee.email)}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  <Send className="w-4 h-4" />
                                  Envoyer
                                </button>
                              )}
                              {isManual && (
                                <button
                                  onClick={() => setContractToDelete(contract)}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                                  title="Supprimer ce contrat"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showHistory && (
      <EmployeeHistory
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowHistory(false)}
      />
    )}

    {showDeparture && (
      <EmployeeDeparture
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowDeparture(false)}
        onSuccess={handleDepartureSuccess}
      />
    )}

    {showContractSend && (
      <ContractSendModal
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        employeeEmail={currentEmployee.email}
        onClose={() => setShowContractSend(false)}
        onSuccess={handleContractSent}
      />
    )}

    {showContractValidation && (
      <ContractValidationPanel
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowContractValidation(false)}
        onActivate={handleContractActivated}
      />
    )}

    {showResendConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Renvoyer le contrat</h3>
          <p className="text-gray-700 mb-6">
            Voulez-vous renvoyer l'email de contrat à <strong>{currentEmployee.prenom} {currentEmployee.nom}</strong> ?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowResendConfirm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleResendContract}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Renvoyer
            </button>
          </div>
        </div>
      </div>
    )}

    {resendSuccess && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Email envoyé !</h3>
          </div>
          <p className="text-gray-700 mb-6">
            L'email de contrat a été renvoyé avec succès à <strong>{currentEmployee.prenom} {currentEmployee.nom}</strong>.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setResendSuccess(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    {resendError && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Erreur</h3>
          </div>
          <p className="text-gray-700 mb-2">Erreur lors du renvoi de l'email :</p>
          <p className="text-red-600 font-medium mb-6">{resendError}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setResendError('')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}

    {showSendDocumentsModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Envoi de documents</h3>
                <p className="text-blue-100 text-sm">{selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} sélectionné{selectedDocuments.size > 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSendDocumentsModal(false)}
              disabled={sendingDocuments}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Destinataire */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Destinataire</label>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-lg">{currentEmployee.prenom} {currentEmployee.nom}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-gray-600 truncate">{currentEmployee.email}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Documents à envoyer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Documents à envoyer</label>
              <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                {documents
                  .filter(doc => selectedDocuments.has(doc.id))
                  .map((doc, index) => (
                    <div key={doc.id} className="p-4 flex items-center gap-3 hover:bg-white transition-colors">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{getDocumentLabel(doc.type)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.date_expiration
                            ? `Expire le ${new Date(doc.date_expiration).toLocaleDateString('fr-FR')}`
                            : 'Document valide'
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">#{index + 1}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Info message */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Email automatique</p>
                  <p className="text-sm text-blue-700">
                    Un email contenant {selectedDocuments.size === 1 ? 'ce document' : 'ces documents'} sera envoyé automatiquement à l'adresse email du salarié.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowSendDocumentsModal(false)}
              disabled={sendingDocuments}
              className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleSendDocuments}
              disabled={sendingDocuments}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105"
            >
              {sendingDocuments ? (
                <LoadingSpinner size="sm" variant="white" text="Envoi en cours..." />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Envoyer les documents</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {sendDocumentsSuccess && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-scale-in">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce-once shadow-lg">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Documents envoyés !</h3>
            <p className="text-gray-600 mb-2">
              Les documents ont été envoyés avec succès à
            </p>
            <p className="font-semibold text-gray-900 mb-6">
              {currentEmployee.prenom} {currentEmployee.nom}
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 w-full">
              <p className="text-sm text-green-800">
                <Mail className="w-4 h-4 inline mr-2" />
                Email envoyé à : <strong>{currentEmployee.email}</strong>
              </p>
            </div>
            <button
              onClick={() => setSendDocumentsSuccess(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Parfait !
            </button>
          </div>
        </div>
      </div>
    )}

    {sendDocumentsError && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-scale-in">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <X className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Erreur d'envoi</h3>
            <p className="text-gray-600 mb-2">
              Une erreur s'est produite lors de l'envoi des documents :
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 w-full">
              <p className="text-sm text-red-800 font-medium">
                {sendDocumentsError}
              </p>
            </div>
            <button
              onClick={() => setSendDocumentsError('')}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Document Confirmation Modal */}
    {documentToDelete && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Confirmer la suppression</h3>
                <p className="text-red-100 text-sm">Cette action est irréversible</p>
              </div>
            </div>
            <button
              onClick={() => setDocumentToDelete(null)}
              disabled={deletingDocument}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Warning */}
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">Attention</p>
                  <p className="text-sm text-red-700">
                    Vous êtes sur le point de supprimer définitivement ce document. Cette action ne peut pas être annulée.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-lg mb-1">{documentToDelete.type_document}</p>
                  <p className="text-sm text-gray-600">
                    Téléchargé le {new Date(documentToDelete.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  {documentToDelete.file_name && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      Fichier : {documentToDelete.file_name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmation Text */}
            <div className="text-center">
              <p className="text-gray-700">
                Êtes-vous sûr de vouloir supprimer ce document ?
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={() => setDocumentToDelete(null)}
              disabled={deletingDocument}
              className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteDocument}
              disabled={deletingDocument}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deletingDocument ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Supprimer définitivement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Success Notification */}
    {deleteSuccess && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-scale-in">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce-once shadow-lg">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Document supprimé !</h3>
            <p className="text-gray-600 mb-6">
              Le document a été supprimé avec succès de la base de données et du stockage.
            </p>
            <div className="w-full h-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )}

    {/* Delete Error Notification */}
    {deleteError && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-scale-in">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <X className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Erreur de suppression</h3>
            <p className="text-gray-600 mb-2">
              Une erreur s'est produite lors de la suppression du document :
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 w-full">
              <p className="text-sm text-red-800 font-medium">
                {deleteError}
              </p>
            </div>
            <button
              onClick={() => setDeleteError('')}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Upload Modal */}
    {showUploadModal && (
      <ImportantDocumentUpload
        profilId={currentEmployee.id}
        onClose={() => setShowUploadModal(false)}
        onSuccess={async () => {
          await fetchDocuments();
          await refreshEmployee();
        }}
      />
    )}

    {showMissingDocsReminderModal && (
      <SendMissingDocumentsReminderModal
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        employeeEmail={currentEmployee.email}
        missingDocuments={Array.from(selectedMissingDocs)}
        onClose={() => setShowMissingDocsReminderModal(false)}
        onSuccess={() => {
          setShowMissingDocsReminderModal(false);
          setSelectedMissingDocs(new Set());
        }}
      />
    )}

    {confirmSendModal && (
      <ConfirmSendContractModal
        employeeName={confirmSendModal.employeeName}
        employeeEmail={confirmSendModal.employeeEmail}
        contractType={confirmSendModal.contractType}
        onConfirm={confirmSendContract}
        onCancel={() => setConfirmSendModal(null)}
        isSending={isSendingContract}
      />
    )}

    {toast && (
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(null)}
      />
    )}

    {showManualContractModal && (
      <ManualContractUploadModal
        profilId={currentEmployee.id}
        employeeName={`${currentEmployee.prenom} ${currentEmployee.nom}`}
        onClose={() => setShowManualContractModal(false)}
        onSuccess={() => {
          setShowManualContractModal(false);
          fetchEmployeeContracts(currentEmployee.id);
          setToast({ type: 'success', message: 'Contrat ajouté avec succès' });
        }}
      />
    )}

    {contractToDelete && (
      <ConfirmDeleteContractModal
        contractId={contractToDelete.id}
        contractName={contractToDelete.variables?.poste || 'Contrat de travail'}
        contractType={contractToDelete.variables?.type_contrat || 'Non renseigné'}
        signatureDate={contractToDelete.date_signature || contractToDelete.created_at}
        onConfirm={deleteManualContract}
        onClose={() => setContractToDelete(null)}
        isDeleting={deletingContract}
      />
    )}
    </>
  );
}