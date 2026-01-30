import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Car,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  UserCircle,
  Building2
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleDetailModal } from './VehicleDetailModal';
import { VehicleCreateModal } from './VehicleCreateModal';

interface Chauffeur {
  id: string;
  nom: string;
  prenom: string;
  matricule_tca: string;
  type_attribution: 'principal' | 'secondaire';
  date_debut: string;
  loueur_id: string | null;
  loueur_nom: string | null;
}

interface Vehicle {
  id: string;
  immatriculation: string;
  immat_norm: string;
  reference_tca: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  type: string | null;
  statut: string;
  date_mise_en_service: string | null;
  date_fin_service: string | null;
  photo_path: string | null;
  site_id: string | null;
  created_at: string;
  chauffeurs_actifs: Chauffeur[];
  nb_chauffeurs_actifs: number;
  locataire_type: string | null;
  locataire_nom_libre: string | null;
  locataire_affiche: string;
  proprietaire_carte_grise: string | null;
  loueur_type: string | null;
  loueur_chauffeur_id: string | null;
  loueur_nom_externe: string | null;
  loueur_affiche: string;
}

interface FilterState {
  statut: string;
  marque: string;
  modele: string;
  annee: string;
  referenceTCA: string;
}

type SortField = 'immatriculation' | 'reference_tca' | 'marque' | 'modele' | 'statut' | 'locataire_affiche' | 'proprietaire_carte_grise' | 'loueur_affiche';
type SortOrder = 'asc' | 'desc';

export function VehicleListNew() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    statut: '',
    marque: '',
    modele: '',
    annee: '',
    referenceTCA: '',
  });

  const [sortField, setSortField] = useState<SortField>('immatriculation');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_vehicles_list')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vehiclesData = (data || []).map(v => ({
        ...v,
        chauffeurs_actifs: Array.isArray(v.chauffeurs_actifs) ? v.chauffeurs_actifs : []
      }));

      setVehicles(vehiclesData);

      const urls: Record<string, string> = {};
      for (const vehicle of vehiclesData) {
        if (vehicle.photo_path) {
          const { data: signedUrl } = await supabase.storage
            .from('vehicle-photos')
            .createSignedUrl(vehicle.photo_path, 3600);

          if (signedUrl) {
            urls[vehicle.id] = signedUrl.signedUrl;
          }
        }
      }
      setPhotoUrls(urls);
    } catch (error) {
      console.error('Erreur chargement véhicules:', error);
    } finally {
      setLoading(false);
    }
  };

  const marques = useMemo(() => {
    const unique = [...new Set(vehicles.map(v => v.marque).filter(Boolean))];
    return unique.sort();
  }, [vehicles]);

  const modeles = useMemo(() => {
    const unique = [...new Set(vehicles.map(v => v.modele).filter(Boolean))];
    return unique.sort();
  }, [vehicles]);

  const annees = useMemo(() => {
    const unique = [...new Set(vehicles.map(v => v.annee).filter(Boolean))];
    return unique.sort((a, b) => (b as number) - (a as number));
  }, [vehicles]);

  const filteredAndSortedVehicles = useMemo(() => {
    let result = [...vehicles];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(v => {
        const immatMatch = v.immatriculation?.toLowerCase().includes(searchLower);
        const refMatch = v.reference_tca?.toLowerCase().includes(searchLower);
        const marqueMatch = v.marque?.toLowerCase().includes(searchLower);
        const modeleMatch = v.modele?.toLowerCase().includes(searchLower);
        const locataireMatch = v.locataire_affiche?.toLowerCase().includes(searchLower);
        const proprietaireMatch = v.proprietaire_carte_grise?.toLowerCase().includes(searchLower);
        const loueurMatch = v.loueur_affiche?.toLowerCase().includes(searchLower);

        return immatMatch || refMatch || marqueMatch || modeleMatch || locataireMatch || proprietaireMatch || loueurMatch;
      });
    }

    if (filters.statut) {
      result = result.filter(v => v.statut === filters.statut);
    }

    if (filters.marque) {
      result = result.filter(v => v.marque === filters.marque);
    }

    if (filters.modele) {
      result = result.filter(v => v.modele === filters.modele);
    }

    if (filters.annee) {
      result = result.filter(v => v.annee?.toString() === filters.annee);
    }

    if (filters.referenceTCA) {
      result = result.filter(v =>
        v.reference_tca?.toLowerCase().includes(filters.referenceTCA.toLowerCase())
      );
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [vehicles, search, filters, sortField, sortOrder]);

  const totalItems = filteredAndSortedVehicles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVehicles = filteredAndSortedVehicles.slice(startIndex, endIndex);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setFilters({
      statut: '',
      marque: '',
      modele: '',
      annee: '',
      referenceTCA: '',
    });
    setSearch('');
    setCurrentPage(1);
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      actif: { bg: 'bg-emerald-500', text: 'text-white', label: 'Actif' },
      maintenance: { bg: 'bg-amber-500', text: 'text-white', label: 'Maintenance' },
      'hors service': { bg: 'bg-red-500', text: 'text-white', label: 'Hors service' },
      'en location': { bg: 'bg-sky-500', text: 'text-white', label: 'En location' },
    };

    const config = statusConfig[statut.toLowerCase()] || { bg: 'bg-gray-500', text: 'text-white', label: statut };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getLocataireBadge = (vehicle: Vehicle) => {
    const locataire = vehicle.locataire_affiche;

    if (!locataire || locataire === 'Non défini') {
      return <span className="text-xs text-gray-400">Non défini</span>;
    }

    if (vehicle.locataire_type === null) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white max-w-[150px] truncate">
          <User className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{locataire}</span>
        </span>
      );
    }

    if (vehicle.locataire_type === 'sur_parc') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500 text-white">
          Sur parc
        </span>
      );
    }

    if (vehicle.locataire_type === 'epave') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
          EPAVE
        </span>
      );
    }

    if (vehicle.locataire_type === 'vendu') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white">
          Vendu
        </span>
      );
    }

    if (vehicle.locataire_type === 'libre') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-500 text-white max-w-[150px] truncate">
          <span className="truncate">{locataire}</span>
        </span>
      );
    }

    return <span className="text-xs text-gray-700 max-w-[150px] truncate block">{locataire}</span>;
  };

  const getLoueurBadge = (vehicle: Vehicle) => {
    const loueur = vehicle.loueur_affiche;

    if (!loueur || loueur === '-') {
      return <span className="text-xs text-gray-400">-</span>;
    }

    if (vehicle.loueur_type === 'chauffeur_tca') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white max-w-[150px] truncate">
          <UserCircle className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{loueur}</span>
        </span>
      );
    }

    if (vehicle.loueur_type === 'entreprise') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500 text-white max-w-[150px] truncate">
          <Building2 className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{loueur}</span>
        </span>
      );
    }

    if (vehicle.loueur_type === 'personne_externe') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-white max-w-[150px] truncate">
          <User className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{loueur}</span>
        </span>
      );
    }

    return <span className="text-xs text-gray-700 max-w-[150px] truncate block">{loueur}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des véhicules..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Véhicules</h1>
          <p className="text-gray-600 mt-1">
            {totalItems} véhicule{totalItems > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Ajouter un véhicule
        </button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par immatriculation, référence TCA, locataire, propriétaire, loueur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 rounded-lg border ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'
            } hover:bg-blue-50 transition-colors font-medium relative`}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filtres et tri
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={fetchVehicles}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    value={filters.statut}
                    onChange={(e) => {
                      setFilters({ ...filters, statut: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous</option>
                    <option value="actif">Actif</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="hors service">Hors service</option>
                    <option value="en location">En location</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marque</label>
                  <select
                    value={filters.marque}
                    onChange={(e) => {
                      setFilters({ ...filters, marque: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Toutes</option>
                    {marques.map(marque => (
                      <option key={marque} value={marque}>{marque}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modèle</label>
                  <select
                    value={filters.modele}
                    onChange={(e) => {
                      setFilters({ ...filters, modele: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous</option>
                    {modeles.map(modele => (
                      <option key={modele} value={modele}>{modele}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                  <select
                    value={filters.annee}
                    onChange={(e) => {
                      setFilters({ ...filters, annee: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Toutes</option>
                    {annees.map(annee => (
                      <option key={annee} value={annee}>{annee}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Référence TCA</label>
                  <input
                    type="text"
                    value={filters.referenceTCA}
                    onChange={(e) => {
                      setFilters({ ...filters, referenceTCA: e.target.value });
                      setCurrentPage(1);
                    }}
                    placeholder="Rechercher..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trier par</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="immatriculation">Immatriculation</option>
                    <option value="reference_tca">Référence TCA</option>
                    <option value="marque">Marque</option>
                    <option value="modele">Modèle</option>
                    <option value="locataire_affiche">Nom du locataire</option>
                    <option value="statut">Statut</option>
                    <option value="proprietaire_carte_grise">Propriétaire</option>
                    <option value="loueur_affiche">Loueur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ordre</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="asc">Croissant</option>
                    <option value="desc">Décroissant</option>
                  </select>
                </div>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <X className="w-4 h-4 mr-2" />
                  Réinitialiser tous les filtres
                </button>
              </div>
            )}
          </div>
        )}

        {(sortField || search || activeFiltersCount > 0) && (
          <div className="flex items-center text-sm text-gray-600">
            <span>
              Tri actif: <span className="font-medium">{sortField}</span> ({sortOrder === 'asc' ? 'Croissant' : 'Décroissant'})
            </span>
          </div>
        )}
      </div>

      {paginatedVehicles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Aucun véhicule trouvé</p>
          <p className="text-gray-500">
            {search || activeFiltersCount > 0
              ? 'Essayez de modifier vos critères de recherche ou filtres'
              : 'Commencez par ajouter votre premier véhicule'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('immatriculation')}
                    >
                      <div className="flex items-center">
                        Immatriculation
                        {sortField === 'immatriculation' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('reference_tca')}
                    >
                      <div className="flex items-center">
                        Réf. TCA
                        {sortField === 'reference_tca' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('marque')}
                    >
                      <div className="flex items-center">
                        Marque/Modèle
                        {sortField === 'marque' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('locataire_affiche')}
                    >
                      <div className="flex items-center">
                        Nom du locataire
                        {sortField === 'locataire_affiche' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('statut')}
                    >
                      <div className="flex items-center">
                        Statut
                        {sortField === 'statut' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('proprietaire_carte_grise')}
                    >
                      <div className="flex items-center">
                        Propriétaire
                        {sortField === 'proprietaire_carte_grise' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200 transition-colors border-r border-gray-300"
                      onClick={() => handleSort('loueur_affiche')}
                    >
                      <div className="flex items-center">
                        Loueur
                        {sortField === 'loueur_affiche' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedVehicles.map((vehicle, idx) => (
                    <tr
                      key={vehicle.id}
                      className={`hover:bg-blue-50 transition-colors cursor-pointer border-b border-gray-200 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        <div className="text-sm font-bold text-gray-900">{vehicle.immatriculation}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        {vehicle.reference_tca ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-800">
                            {vehicle.reference_tca}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs">
                          <div className="font-bold text-gray-900">{vehicle.marque || '-'}</div>
                          <div className="text-gray-600">{vehicle.modele || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs">
                          {getLocataireBadge(vehicle)}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        {getStatusBadge(vehicle.statut)}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs text-gray-900 max-w-[120px] truncate" title={vehicle.proprietaire_carte_grise || ''}>
                          {vehicle.proprietaire_carte_grise || <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs">
                          {getLoueurBadge(vehicle)}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVehicle(vehicle);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Affichage de <span className="font-medium">{startIndex + 1}</span> à{' '}
                <span className="font-medium">{Math.min(endIndex, totalItems)}</span> sur{' '}
                <span className="font-medium">{totalItems}</span> véhicule{totalItems > 1 ? 's' : ''}
              </p>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={25}>25 par page</option>
                <option value={50}>50 par page</option>
                <option value={100}>100 par page</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium ${
                  currentPage === 1
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 border rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium ${
                  currentPage === totalPages
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </>
      )}

      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdate={fetchVehicles}
          photoUrl={photoUrls[selectedVehicle.id]}
        />
      )}

      {showCreateModal && (
        <VehicleCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchVehicles}
        />
      )}
    </div>
  );
}
