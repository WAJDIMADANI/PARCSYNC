import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Calendar, AlertTriangle, FileText, Search, Filter, Building2 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleDetailModal } from './VehicleDetailModal';
import { Pagination } from './Pagination';

interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  statut: string;
  site_id: string | null;
  [key: string]: any;
}

interface DocumentVehicule {
  id: string;
  vehicule_id: string;
  type_document: string;
  date_expiration: string;
  actif: boolean;
  vehicule?: Vehicle;
}

interface Site {
  id: string;
  nom: string;
}

export function CTAssuranceList() {
  const [documents, setDocuments] = useState<DocumentVehicule[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ct' | 'assurance' | 'carte_ris'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'soon'>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchDocuments();
    fetchSites();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_vehicule')
        .select(`
          id,
          vehicule_id,
          type_document,
          date_expiration,
          actif,
          vehicule:vehicule_id (
            id,
            immatriculation,
            marque,
            modele,
            statut,
            site_id
          )
        `)
        .eq('actif', true)
        .not('date_expiration', 'is', null)
        .in('type_document', ['controle_technique', 'assurance', 'carte_ris']);

      if (error) throw error;

      // Filtrer uniquement les véhicules actifs
      const activeVehicleDocs = (data || []).filter(
        doc => doc.vehicule && doc.vehicule.statut === 'actif'
      );

      setDocuments(activeVehicleDocs);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('site')
        .select('id, nom')
        .order('nom');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Erreur chargement sites:', error);
    }
  };

  const getDaysRemaining = (dateExpiration: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateExpiration);
    expDate.setHours(0, 0, 0, 0);
    return Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDocTypeLabel = (type: string): string => {
    switch (type) {
      case 'controle_technique':
        return 'CT';
      case 'assurance':
        return 'Assurance';
      case 'carte_ris':
        return 'CMI / RIS';
      default:
        return type;
    }
  };

  const getDocTypeColor = (type: string): string => {
    switch (type) {
      case 'controle_technique':
        return 'bg-blue-100 text-blue-700';
      case 'assurance':
        return 'bg-green-100 text-green-700';
      case 'carte_ris':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleVehicleClick = async (doc: DocumentVehicule) => {
    if (!doc.vehicule) return;

    try {
      // Charger les données complètes du véhicule depuis la vue
      const { data: vehicleData, error } = await supabase
        .from('v_vehicles_list_ui')
        .select('*')
        .eq('id', doc.vehicule_id)
        .single();

      if (error) throw error;

      if (vehicleData) {
        setSelectedVehicle(vehicleData);

        // Charger la photo si disponible
        if (vehicleData.photo_path) {
          const { data: urlData } = supabase.storage
            .from('vehicle-photos')
            .getPublicUrl(vehicleData.photo_path);

          if (urlData?.publicUrl) {
            setVehiclePhotoUrl(urlData.publicUrl);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement véhicule:', error);
    }
  };

  const handleCloseModal = () => {
    setSelectedVehicle(null);
    setVehiclePhotoUrl(undefined);
  };

  const handleVehicleUpdated = async () => {
    await fetchDocuments();
  };

  const getSiteName = (siteId: string | null): string => {
    if (!siteId) return '-';
    const site = sites.find(s => s.id === siteId);
    return site ? site.nom : '-';
  };

  // Filtrage et tri intelligent
  const filteredAndSortedDocuments = (() => {
    let filtered = documents.filter(doc => {
      // Filtre recherche
      const matchesSearch = doc.vehicule
        ? `${doc.vehicule.immatriculation} ${doc.vehicule.marque || ''} ${doc.vehicule.modele || ''}`.toLowerCase().includes(search.toLowerCase())
        : false;

      // Filtre type
      const matchesType =
        filterType === 'all' ||
        (filterType === 'ct' && doc.type_document === 'controle_technique') ||
        (filterType === 'assurance' && doc.type_document === 'assurance') ||
        (filterType === 'carte_ris' && doc.type_document === 'carte_ris');

      // Filtre statut
      const daysRemaining = getDaysRemaining(doc.date_expiration);
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'expired' && daysRemaining < 0) ||
        (filterStatus === 'soon' && daysRemaining >= 0 && daysRemaining <= 30);

      // Filtre site
      const matchesSite =
        filterSite === 'all' ||
        (doc.vehicule && doc.vehicule.site_id === filterSite);

      return matchesSearch && matchesType && matchesStatus && matchesSite;
    });

    // Tri intelligent : expirés d'abord (les plus urgents), puis à renouveler (les plus proches)
    filtered.sort((a, b) => {
      const daysA = getDaysRemaining(a.date_expiration);
      const daysB = getDaysRemaining(b.date_expiration);

      // Les deux expirés : trier par urgence décroissante (plus expiré = plus urgent)
      if (daysA < 0 && daysB < 0) {
        return daysA - daysB;
      }

      // Un expiré, un à renouveler : expiré d'abord
      if (daysA < 0) return -1;
      if (daysB < 0) return 1;

      // Les deux à renouveler : trier par urgence croissante (moins de jours = plus urgent)
      return daysA - daysB;
    });

    return filtered;
  })();

  // Pagination
  const totalItems = filteredAndSortedDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredAndSortedDocuments.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterStatus, filterSite]);

  // Statistiques par type
  const ctCount = documents.filter(d => {
    const days = getDaysRemaining(d.date_expiration);
    return d.type_document === 'controle_technique' && days >= 0 && days <= 30;
  }).length;

  const assuranceCount = documents.filter(d => {
    const days = getDaysRemaining(d.date_expiration);
    return d.type_document === 'assurance' && days >= 0 && days <= 30;
  }).length;

  const carteRisCount = documents.filter(d => {
    const days = getDaysRemaining(d.date_expiration);
    return d.type_document === 'carte_ris' && days >= 0 && days <= 30;
  }).length;

  const expiredCount = documents.filter(d => getDaysRemaining(d.date_expiration) < 0).length;

  const renderDocumentRow = (doc: DocumentVehicule) => {
    const daysRemaining = getDaysRemaining(doc.date_expiration);
    const isExpired = daysRemaining < 0;

    return (
      <tr
        key={doc.id}
        onClick={() => handleVehicleClick(doc)}
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
          isExpired ? 'bg-red-50/30' : ''
        }`}
      >
        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
          {doc.vehicule?.immatriculation || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {doc.vehicule ? (
            <div>
              <div className="font-medium">{doc.vehicule.marque || '-'}</div>
              <div className="text-xs text-gray-500">{doc.vehicule.modele || '-'}</div>
            </div>
          ) : '-'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {getSiteName(doc.vehicule?.site_id || null)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDocTypeColor(doc.type_document)}`}>
            {getDocTypeLabel(doc.type_document)}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(doc.date_expiration).toLocaleDateString('fr-FR')}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {isExpired ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Expiré
            </span>
          ) : daysRemaining <= 7 ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Urgent
            </span>
          ) : daysRemaining <= 30 ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              <Calendar className="w-3 h-3 mr-1" />
              À renouveler
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Valide
            </span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
          {isExpired ? (
            <span className="text-red-700">-{Math.abs(daysRemaining)}j</span>
          ) : (
            <span className={daysRemaining <= 7 ? 'text-red-700' : 'text-orange-700'}>
              {daysRemaining}j
            </span>
          )}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des documents..." />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">CT & Assurance</h1>
          <p className="text-gray-600 mt-1">Suivi des documents véhicules</p>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CT à renouveler</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{ctCount}</p>
              </div>
              <Shield className="w-12 h-12 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assurances à renouveler</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{assuranceCount}</p>
              </div>
              <Shield className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CMI / RIS à renouveler</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{carteRisCount}</p>
              </div>
              <FileText className="w-12 h-12 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents expirés</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{expiredCount}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filtres avancés */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Filtres</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre Statut */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="expired">Expirés</option>
              <option value="soon">À renouveler (30j)</option>
            </select>

            {/* Filtre Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="ct">CT</option>
              <option value="assurance">Assurance</option>
              <option value="carte_ris">CMI / RIS</option>
            </select>

            {/* Filtre Site */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table paginée */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {paginatedDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Aucun document trouvé</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Immatriculation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Véhicule
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Site
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date expiration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jours
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedDocuments.map(renderDocumentRow)}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      {/* Modal Véhicule */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={handleCloseModal}
          onVehicleUpdated={handleVehicleUpdated}
          photoUrl={vehiclePhotoUrl}
        />
      )}
    </>
  );
}
