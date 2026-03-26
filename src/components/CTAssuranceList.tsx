import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Calendar, AlertTriangle, FileText, Search } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleDetailModal } from './VehicleDetailModal';

interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  statut: string;
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

export function CTAssuranceList() {
  const [documents, setDocuments] = useState<DocumentVehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ct' | 'assurance' | 'carte_ris'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchDocuments();
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
            statut
          )
        `)
        .eq('actif', true)
        .not('date_expiration', 'is', null)
        .in('type_document', ['controle_technique', 'assurance', 'carte_ris'])
        .order('date_expiration', { ascending: true });

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
    // Recharger la liste des documents
    await fetchDocuments();
    // Le modal gère lui-même le refresh
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.vehicule
      ? `${doc.vehicule.immatriculation} ${doc.vehicule.marque || ''} ${doc.vehicule.modele || ''}`.toLowerCase().includes(search.toLowerCase())
      : false;

    const matchesType =
      filterType === 'all' ||
      (filterType === 'ct' && doc.type_document === 'controle_technique') ||
      (filterType === 'assurance' && doc.type_document === 'assurance') ||
      (filterType === 'carte_ris' && doc.type_document === 'carte_ris');

    return matchesSearch && matchesType;
  });

  // Séparer les documents expirés et ceux à renouveler
  const expiredDocs = filteredDocuments.filter(d => getDaysRemaining(d.date_expiration) < 0);
  const soonExpiringDocs = filteredDocuments.filter(d => {
    const days = getDaysRemaining(d.date_expiration);
    return days >= 0 && days <= 30;
  });

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

    return (
      <tr
        key={doc.id}
        onClick={() => handleVehicleClick(doc)}
        className="hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {doc.vehicule ? (
            <div>
              <div className="font-semibold">{doc.vehicule.immatriculation}</div>
              <div className="text-xs text-gray-500">
                {doc.vehicule.marque} {doc.vehicule.modele}
              </div>
            </div>
          ) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDocTypeColor(doc.type_document)}`}>
            {getDocTypeLabel(doc.type_document)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(doc.date_expiration).toLocaleDateString('fr-FR')}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {daysRemaining < 0 ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Expiré depuis {Math.abs(daysRemaining)}j
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              <Calendar className="w-3 h-3 mr-1" />
              {daysRemaining === 0 ? "Aujourd'hui" : `${daysRemaining}j restants`}
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

        {/* Search and Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un véhicule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setFilterType('ct')}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                filterType === 'ct'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              CT
            </button>
            <button
              onClick={() => setFilterType('assurance')}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                filterType === 'assurance'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Assurance
            </button>
            <button
              onClick={() => setFilterType('carte_ris')}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                filterType === 'carte_ris'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              CMI / RIS
            </button>
          </div>
        </div>

        {/* Section Documents Expirés */}
        {expiredDocs.length > 0 && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-red-900">
                  Documents expirés ({expiredDocs.length})
                </h2>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Véhicule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date expiration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiredDocs.map(renderDocumentRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section Documents Bientôt Expirés */}
        {soonExpiringDocs.length > 0 && (
          <div className="mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-orange-900">
                  Documents à renouveler dans les 30 jours ({soonExpiringDocs.length})
                </h2>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Véhicule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date expiration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {soonExpiringDocs.map(renderDocumentRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {expiredDocs.length === 0 && soonExpiringDocs.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Aucun document à renouveler</p>
          </div>
        )}
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
