import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, FileText, Search, User, Send, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import MissingDocumentsReminderModal from './MissingDocumentsReminderModal';

interface MissingDocumentData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string | null;
  site_id: string | null;
  nom_site: string | null;
  documents_manquants: string[];
}

interface MissingDocumentsProps {
  onNavigate?: (view: string, params?: any) => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  cni_recto: 'Carte d\'identité (Recto)',
  cni_verso: 'Carte d\'identité (Verso)',
  carte_vitale: 'Carte vitale',
  casier_judiciaire: 'B3 casier judiciaire',
  permis_recto: 'Permis de conduire (Recto)',
  permis_verso: 'Permis de conduire (Verso)',
  attestation_points: 'Point permis',
  rib: 'RIB',
  dpae: 'DPAE',
  certificat_medical: 'Visite médicale obligatoire (médecin agréé préfecture)',
  titre_sejour: 'Titre de séjour'
};

export function MissingDocuments({ onNavigate }: MissingDocumentsProps) {
  const [salaries, setSalaries] = useState<MissingDocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSalarie, setSelectedSalarie] = useState<MissingDocumentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    fetchMissingDocuments();

    const channel = supabase
      .channel('document-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document' }, () => {
        fetchMissingDocuments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMissingDocuments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_missing_documents_by_salarie');

      if (error) throw error;

      console.log('📊 DEBUG - Données brutes reçues:', data);
      console.log('📊 DEBUG - Nombre de salariés:', data?.length);
      if (data && data.length > 0) {
        console.log('📊 DEBUG - Premier salarié:', data[0]);
        console.log('📊 DEBUG - Clés du premier salarié:', Object.keys(data[0]));
      }

      setSalaries(data || []);
    } catch (error) {
      console.error('Erreur chargement documents manquants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = (salarie: MissingDocumentData) => {
    console.log('🔍 DEBUG - Salarié sélectionné:', salarie);
    console.log('🔍 DEBUG - ID du salarié:', salarie.id);
    console.log('🔍 DEBUG - Type de l\'ID:', typeof salarie.id);
    console.log('🔍 DEBUG - Toutes les clés:', Object.keys(salarie));

    if (!salarie.id) {
      alert('❌ ERREUR: L\'ID du salarié est manquant dans les données SQL!\n\nVérifiez que la fonction SQL get_missing_documents_by_salarie() retourne bien la colonne "id".');
      return;
    }

    setSelectedSalarie(salarie);
    setShowModal(true);
  };

  const handleReminderSuccess = () => {
    fetchMissingDocuments();
  };

  const filteredSalaries = salaries.filter(s => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.nom?.toLowerCase().includes(searchLower) ||
      s.prenom?.toLowerCase().includes(searchLower) ||
      s.email?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredSalaries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSalaries = filteredSalaries.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des documents manquants..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          Documents manquants par salarié
        </h1>
        <p className="text-gray-600 mt-2">
          Liste des salariés actifs auxquels il manque un ou plusieurs documents obligatoires
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredSalaries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Aucun résultat' : 'Félicitations !'}
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Aucun salarié ne correspond à votre recherche'
              : 'Tous les salariés actifs ont leurs documents obligatoires'}
          </p>
        </div>
      ) : (
        <>
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Affichage de <span className="font-semibold text-gray-900">{startIndex + 1}</span> à <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredSalaries.length)}</span> sur <span className="font-semibold text-gray-900">{filteredSalaries.length}</span> salarié{filteredSalaries.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Afficher:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">par page</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salarié
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Poste
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents manquants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSalaries.map((salarie) => (
                  <tr
                    key={salarie.id}
                    className="hover:bg-blue-50 transition-colors"
                    onMouseEnter={() => setHoveredRow(salarie.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {salarie.prenom} {salarie.nom}
                          </div>
                          <div className="text-sm text-gray-500">{salarie.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salarie.poste || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salarie.nom_site || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative group">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-4 h-4" />
                            {salarie.documents_manquants.length} document{salarie.documents_manquants.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {hoveredRow === salarie.id && (
                          <div className="absolute z-10 left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Documents manquants:</div>
                            <div className="space-y-1">
                              {salarie.documents_manquants.map((doc) => (
                                <div key={doc} className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                  {DOCUMENT_LABELS[doc] || doc}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate?.('rh/salaries', { profilId: salarie.id })}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <User className="w-4 h-4" />
                          Voir le profil
                        </button>
                        <button
                          onClick={() => handleSendReminder(salarie)}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Envoyer rappel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page <span className="font-semibold text-gray-900">{currentPage}</span> sur <span className="font-semibold text-gray-900">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Première page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">...</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page as number)}
                          className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'border border-gray-300 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Dernière page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {showModal && selectedSalarie && (
        <MissingDocumentsReminderModal
          profilId={selectedSalarie.id}
          employeeName={`${selectedSalarie.prenom} ${selectedSalarie.nom}`}
          employeeEmail={selectedSalarie.email}
          missingDocuments={selectedSalarie.documents_manquants}
          onClose={() => {
            setShowModal(false);
            setSelectedSalarie(null);
          }}
          onSuccess={handleReminderSuccess}
        />
      )}
    </div>
  );
}
