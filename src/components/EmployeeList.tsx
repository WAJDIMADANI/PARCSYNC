import { useState, useEffect } from 'react';
import { supabase, getStorageUrl } from '../lib/supabase';
import { Search, X, Mail, Phone, Building, Briefcase, Calendar, User, MapPin, History, UserX, FileText, Send, Check, ChevronUp, ChevronDown, Filter, CheckCircle, RefreshCw, Edit2, Save, AlertCircle } from 'lucide-react';
import EmployeeHistory from './EmployeeHistory';
import EmployeeDeparture from './EmployeeDeparture';
import { LoadingSpinner } from './LoadingSpinner';
import ContractSendModal from './ContractSendModal';
import ContractValidationPanel from './ContractValidationPanel';
import { resolveDocUrl } from '../lib/documentStorage';

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
  certificat_medical_expiration: string | null;
  permis_expiration: string | null;
  created_at: string;
  site?: Site;
  secteur?: Secteur;
  manager?: { prenom: string; nom: string };
}

interface Contract {
  id: string;
  profil_id: string;
  statut: string;
  date_signature: string | null;
  yousign_signed_at: string | null;
  created_at: string;
}

type SortField = 'nom' | 'prenom' | 'role' | 'statut' | 'site' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function EmployeeList() {
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
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterSecteur, setFilterSecteur] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const filteredAndSortedEmployees = employees
    .filter(emp => {
      const matchesSearch = `${emp.prenom} ${emp.nom} ${emp.email} ${emp.role || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatut = !filterStatut || emp.statut === filterStatut;
      const matchesSite = !filterSite || emp.site_id === filterSite;
      const matchesSecteur = !filterSecteur || emp.secteur_id === filterSecteur;
      return matchesSearch && matchesStatut && matchesSite && matchesSecteur;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
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
        case 'site':
          aValue = (a.site?.nom || '').toLowerCase();
          bValue = (b.site?.nom || '').toLowerCase();
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
    setFilterSite('');
    setFilterSecteur('');
  };

  const hasActiveFilters = filterStatut || filterSite || filterSecteur;

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
          <p className="text-gray-600 mt-1">
            {filteredAndSortedEmployees.length} employé(s) {hasActiveFilters && `(sur ${employees.length} au total)`}
          </p>
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
            Filtres {hasActiveFilters && `(${[filterStatut, filterSite, filterSecteur].filter(Boolean).length})`}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.nom}</option>
                ))}
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    onClick={() => handleSort('site')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Site
                      {getSortIcon('site')}
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
                {filteredAndSortedEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
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
                      <div className="text-sm text-gray-600">{employee.site?.nom || '-'}</div>
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
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editedCertificatExpiration, setEditedCertificatExpiration] = useState(employee.certificat_medical_expiration || '');
  const [editedPermisExpiration, setEditedPermisExpiration] = useState(employee.permis_expiration || '');
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(employee);
  const [currentContractStatus, setCurrentContractStatus] = useState<string | null>(contractStatus);
  const [savingDates, setSavingDates] = useState(false);

  // NE PAS synchroniser automatiquement avec employee pour éviter les rechargements
  // Le modal garde son état local stable pendant toute sa durée de vie

  useEffect(() => {
    // Signaler que le modal est ouvert
    onOpen();
    fetchDocuments();
  }, []);

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

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document')
        .select('*')
        .eq('owner_id', currentEmployee.id)
        .eq('owner_type', 'profil')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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

      const emailResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contract-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            employeeEmail: currentEmployee.email,
            employeeName: `${currentEmployee.prenom} ${currentEmployee.nom}`,
            contractId: contrat.id,
            variables: contrat.variables
          })
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Erreur API (status ' + emailResponse.status + '):', errorText);

        if (emailResponse.status === 404) {
          throw new Error('La fonction d\'envoi d\'email n\'est pas déployée. Veuillez déployer la fonction "send-contract-email" sur Supabase.');
        }

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'email');
        } catch (e) {
          throw new Error('Erreur lors de l\'envoi de l\'email: ' + errorText.substring(0, 100));
        }
      }

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
          certificat_medical_expiration: editedCertificatExpiration || null,
          permis_expiration: editedPermisExpiration || null
        })
        .eq('id', currentEmployee.id);

      if (error) {
        console.error('Erreur Supabase:', error);
        throw new Error(`Erreur de sauvegarde: ${error.message || 'Erreur inconnue'}`);
      }

      // Mettre à jour l'employé localement au lieu de recharger tout
      setCurrentEmployee({
        ...currentEmployee,
        certificat_medical_expiration: editedCertificatExpiration || null,
        permis_expiration: editedPermisExpiration || null
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
    setEditedCertificatExpiration(currentEmployee.certificat_medical_expiration || '');
    setEditedPermisExpiration(currentEmployee.permis_expiration || '');
    setIsEditingDates(false);
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
          {/* Grid des informations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations de contact */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl p-5 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Informations de contact</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  </div>
                  <p className="text-gray-900 font-medium">{currentEmployee.email}</p>
                </div>

                {currentEmployee.tel && (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Téléphone</p>
                    </div>
                    <p className="text-gray-900 font-medium">{currentEmployee.tel}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Affectation */}
            <div className="bg-gradient-to-br from-green-50 to-green-100/30 rounded-xl p-5 border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Affectation</h3>
              </div>

              <div className="space-y-3">
                {currentEmployee.site && (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site</p>
                    </div>
                    <p className="text-gray-900 font-medium">{currentEmployee.site.nom}</p>
                  </div>
                )}

                {currentEmployee.secteur && (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Secteur</p>
                    </div>
                    <p className="text-gray-900 font-medium">{currentEmployee.secteur.nom}</p>
                  </div>
                )}

                {currentEmployee.manager && (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager</p>
                    </div>
                    <p className="text-gray-900 font-medium">{currentEmployee.manager.prenom} {currentEmployee.manager.nom}</p>
                  </div>
                )}

                {currentEmployee.date_entree && (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date d'entrée</p>
                    </div>
                    <p className="text-gray-900 font-medium">{new Date(currentEmployee.date_entree).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
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
                <button
                  onClick={() => setIsEditingDates(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
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
                    {currentEmployee.certificat_medical_expiration
                      ? new Date(currentEmployee.certificat_medical_expiration).toLocaleDateString('fr-FR')
                      : 'Non renseignée'}
                  </p>
                )}
              </div>

              {/* Permis de conduire */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permis de conduire - Date d'expiration</p>
                </div>
                {isEditingDates ? (
                  <input
                    type="date"
                    value={editedPermisExpiration}
                    onChange={(e) => setEditedPermisExpiration(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {currentEmployee.permis_expiration
                      ? new Date(currentEmployee.permis_expiration).toLocaleDateString('fr-FR')
                      : 'Non renseignée'}
                  </p>
                )}
              </div>
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
                      <p className="font-bold text-gray-900 text-sm">{doc.file_name || doc.type_document || getDocumentLabel(doc.type)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Téléchargé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const signedUrl = await getSignedUrl(doc.fichier_url);
                        window.open(signedUrl, '_blank');
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium text-xs shadow-sm hover:shadow-md flex items-center gap-1.5 transform hover:scale-105"
                      title="Voir le document"
                    >
                      <FileText className="w-4 h-4" />
                      Voir
                    </button>
                  </div>
                ))}
              </div>
            )}
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
    </>
  );
}