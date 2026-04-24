import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  Trash2
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleDetailModal } from './VehicleDetailModal';
import { VehicleCreateModal } from './VehicleCreateModal';
import { AttestationSignatureModal } from './AttestationSignatureModal';
import { RestitutionModal } from './RestitutionModal';
import { EDLModal } from './EDLModal'; // 🆕 ÉTAPE D3
import { parseProprietaireCarteGrise } from '../utils/proprietaireParser';

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
  ref_tca: string | null;
  marque: string | null;
  modele: string | null;
  finition: string | null;
  energie: string | null;
  couleur: string | null;
  annee: number | null;
  type: string | null;
  statut: string;
  date_mise_en_service: string | null;
  date_fin_service: string | null;
  date_premiere_mise_en_circulation: string | null;
  fournisseur: string | null;
  mode_acquisition: string | null;
  prix_ht: number | null;
  prix_ttc: number | null;
  mensualite: number | null;
  duree_contrat_mois: number | null;
  date_debut_contrat: string | null;
  date_fin_prevue_contrat: string | null;
  photo_path: string | null;
  site_id: string | null;
  assurance_type: 'tca' | 'externe' | null;
  assurance_compagnie: string | null;
  assurance_numero_contrat: string | null;
  licence_transport_numero: string | null;
  carte_essence_fournisseur: string | null;
  carte_essence_numero: string | null;
  carte_essence_attribuee: boolean;
  kilometrage_actuel: number | null;
  derniere_maj_kilometrage: string | null;
  materiel_embarque: any[] | null;
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

type SortField = 'immatriculation' | 'ref_tca' | 'marque' | 'modele' | 'statut';
type SortOrder = 'asc' | 'desc';

function SalarieSearch({ salaries, selectedId, onSelect }: {
  salaries: {id: string; nom: string; prenom: string; matricule_tca?: string}[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = salaries.filter(s => {
    const q = search.toLowerCase();
    return (
      s.nom?.toLowerCase().includes(q) ||
      s.prenom?.toLowerCase().includes(q) ||
      (s as any).matricule_tca?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const selected = salaries.find(s => s.id === selectedId);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Rechercher par nom ou matricule..."
        value={search || (selected ? `${selected.prenom} ${selected.nom}` : '')}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); onSelect(''); }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
      />
      {open && search.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Aucun résultat</div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
              >
                <span>{s.prenom} {s.nom}</span>
                {(s as any).matricule_tca && (
                  <span className="text-xs text-gray-400 ml-2">{(s as any).matricule_tca}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function VehicleListNew({ onNavigate }: { onNavigate?: (view: string, params?: any) => void } = {}) {
  const { appUserId, appUserNom, appUserPrenom } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAttributionModal, setShowAttributionModal] = useState(false);
  const [attributionVehicle, setAttributionVehicle] = useState<Vehicle | null>(null);
  const [attributionType, setAttributionType] = useState('');
  const [salaries, setSalaries] = useState<{id: string; nom: string; prenom: string}[]>([]);
  const [loueurs, setLoueurs] = useState<{id: string; nom: string; type: string}[]>([]);
  const [attributionDate, setAttributionDate] = useState(new Date().toISOString().split('T')[0]);
  const [attributionNotes, setAttributionNotes] = useState('');
  const [attributionSalarieId, setAttributionSalarieId] = useState('');
  const [attributionLoueurId, setAttributionLoueurId] = useState('');
  const [savingAttribution, setSavingAttribution] = useState(false);
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [attestationData, setAttestationData] = useState<any>(null);
 const [showRestitutionModal, setShowRestitutionModal] = useState(false);
  const [restitutionData, setRestitutionData] = useState<any>(null);

  // 🆕 ÉTAPE D3 : États pour la modal EDL qui s'ouvre après l'attestation
  const [showEDLModal, setShowEDLModal] = useState(false);
  const [edlData, setEdlData] = useState<any>(null);

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
    fetchSalariesEtLoueurs();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_vehicles_list_ui')
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

  const fetchSalariesEtLoueurs = async () => {
    try {
      const { data: salariesData } = await supabase
        .from('profil')
        .select('id, nom, prenom, matricule_tca')
        .eq('statut', 'actif')
        .order('nom');
      setSalaries(salariesData || []);
      const { data: loueursData } = await supabase
        .from('locataire_externe')
        .select('id, nom, type')
        .eq('actif', true)
        .order('nom');
      setLoueurs(loueursData || []);
    } catch (error) {
      console.error('Erreur chargement salariés/loueurs:', error);
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
        const refMatch = v.ref_tca?.toLowerCase().includes(searchLower);
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
        v.ref_tca?.toLowerCase().includes(filters.referenceTCA.toLowerCase())
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

  const handleVehicleUpdated = async (updatedVehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v));
    await fetchVehicles();
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('vehicule')
        .delete()
        .eq('id', vehicleToDelete.id);

      if (error) throw error;

      await fetchVehicles();
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression du véhicule:', error);
      alert('Erreur lors de la suppression du véhicule');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    const s = statut.toLowerCase();
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'sur_parc':                { bg: 'bg-gray-200',    text: 'text-gray-800', label: '🅿 Sur parc' },
      'chauffeur_tca':           { bg: 'bg-blue-500',    text: 'text-white',    label: '👤 Chauffeur TCA' },
      'direction_administratif': { bg: 'bg-blue-800',    text: 'text-white',    label: '🏢 Direction' },
      'location_pure':           { bg: 'bg-emerald-500', text: 'text-white',    label: '🔄 Location pure' },
      'loa':                     { bg: 'bg-purple-500',  text: 'text-white',    label: '💰 LOA' },
      'en_pret':                 { bg: 'bg-cyan-500',    text: 'text-white',    label: '🤝 En prêt' },
      'en_garage':               { bg: 'bg-amber-500',   text: 'text-white',    label: '🛠 En garage' },
      'hors_service':            { bg: 'bg-red-500',     text: 'text-white',    label: '🚫 Hors service' },
      'sorti_flotte':            { bg: 'bg-gray-700',    text: 'text-white',    label: '📦 Sorti de flotte' },
      'actif':                   { bg: 'bg-emerald-500', text: 'text-white',    label: 'Actif' },
      'maintenance':             { bg: 'bg-amber-500',   text: 'text-white',    label: 'Maintenance' },
      'hors service':            { bg: 'bg-red-500',     text: 'text-white',    label: 'Hors service' },
      'en location':             { bg: 'bg-sky-500',     text: 'text-white',    label: 'En location' },
    };
    const config = statusConfig[s] || { bg: 'bg-gray-400', text: 'text-white', label: statut };
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

  const getFournisseurDisplay = (vehicle: Vehicle) => {
    const fournisseur = vehicle.fournisseur;

    if (!fournisseur || fournisseur.trim() === '') {
      return <span className="text-xs text-gray-400">-</span>;
    }

    return <span className="text-xs text-gray-700 max-w-[150px] truncate block">{fournisseur}</span>;
  };

  const handleRestituer = async (vehicle: Vehicle) => {
    if (vehicle.statut !== 'chauffeur_tca') {
      alert('Restitution disponible uniquement pour les chauffeurs TCA pour le moment. Les autres types arrivent bientôt.');
      return;
    }
    if (!appUserId) {
      alert('Utilisateur non connecté');
      return;
    }
    try {
      const { data: attribution, error } = await supabase
        .from('attribution_vehicule')
        .select(`
          id, vehicule_id, profil_id, km_depart, date_debut,
          signature_chauffeur, signature_admin, attribue_par, created_at,
          profil:profil_id(id, nom, prenom, genre, date_naissance, matricule_tca, secteur:secteur_id(nom)),
          admin:attribue_par(nom, prenom)
        `)
        .eq('vehicule_id', vehicle.id)
        .eq('statut_vehicule', 'chauffeur_tca')
        .is('date_fin', null)
        .maybeSingle();

      if (error || !attribution) {
        alert('Aucune attribution active trouvée pour ce véhicule');
        return;
      }

      const profil: any = attribution.profil;
      const admin: any = attribution.admin;

      setRestitutionData({
        attributionId: attribution.id,
        vehiculeId: vehicle.id,
        immatriculation: vehicle.immatriculation,
        marque: vehicle.marque || '',
        modele: vehicle.modele || '',
        refTca: vehicle.ref_tca || null,
        carteEssence: (vehicle as any).carte_essence_numero || null,
        licenceTransport: (vehicle as any).licence_transport_numero || null,
        profilId: profil?.id || '',
        salarieNom: profil?.nom || '',
        salariePrenom: profil?.prenom || '',
        salarieGenre: profil?.genre || null,
        salarieMatriculeTca: profil?.matricule_tca || null,
        salarieDateNaissance: profil?.date_naissance || null,
        salarieSecteurNom: profil?.secteur?.nom || null,
        kmDepart: attribution.km_depart || 0,
        dateDepart: attribution.date_debut || '',
        signatureChauffeurDepart: attribution.signature_chauffeur || '',
        signatureAdminDepart: attribution.signature_admin || '',
        adminDepartNom: admin?.nom || '',
        adminDepartPrenom: admin?.prenom || '',
        dateDepartResponsable: attribution.created_at || '',
        adminId: appUserId,
        adminNom: appUserNom || '',
        adminPrenom: appUserPrenom || '',
      });
      setShowRestitutionModal(true);
    } catch (e) {
      console.error('Erreur récupération attribution:', e);
      alert('Erreur lors de la récupération des données');
    }
  };

  const handleValiderAttribution = async () => {
    if (!attributionVehicle || !attributionType) return;
    setSavingAttribution(true);
    try {
      const hier = new Date(attributionDate);
      hier.setDate(hier.getDate() - 1);
      const hierStr = hier.toISOString().split('T')[0];

      await supabase
        .from('attribution_vehicule')
        .update({ date_fin: hierStr })
        .eq('vehicule_id', attributionVehicle.id)
        .is('date_fin', null);

     if (attributionType !== 'location_pure' && attributionType !== 'location_vente_particulier' && attributionType !== 'location_vente_societe') {
        await supabase
          .from('locations')
          .update({ statut: 'terminee' })
          .eq('vehicule_id', attributionVehicle.id)
          .eq('statut', 'en_cours');
      }

     const necessitePersonne = ['chauffeur_tca', 'direction_administratif', 'en_pret'].includes(attributionType);
      let createdAttributionId: string | null = null;
      if (necessitePersonne && (attributionSalarieId || attributionLoueurId)) {
        const { data: insertedAttribution, error: insertError } = await supabase
          .from('attribution_vehicule')
          .insert({
            vehicule_id: attributionVehicle.id,
            profil_id: attributionSalarieId || null,
            loueur_id: attributionLoueurId || null,
            type_attribution: 'principal',
            date_debut: attributionDate,
            date_fin: null,
            notes: attributionNotes || null,
            statut_vehicule: attributionType,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        createdAttributionId = insertedAttribution?.id || null;
      }

      await supabase
        .from('vehicule')
        .update({ statut: attributionType })
        .eq('id', attributionVehicle.id);

   const isLocation = ['location_pure', 'location_vente_particulier', 'location_vente_societe'].includes(attributionType);
      const wasChauffeurTca = attributionType === 'chauffeur_tca';
      const vehiculeId = attributionVehicle.id;
      const vehiculeImmat = attributionVehicle.immatriculation;

      if (wasChauffeurTca && createdAttributionId && appUserId) {
        const { data: profilComplet } = await supabase
          .from('profil')
          .select('id, nom, prenom, genre, date_naissance, matricule_tca, secteur:secteur_id(nom)')
          .eq('id', attributionSalarieId)
          .maybeSingle();

        if (profilComplet) {
          setAttestationData({
            attributionId: createdAttributionId,
            vehiculeId: attributionVehicle.id,
            immatriculation: attributionVehicle.immatriculation,
            marque: attributionVehicle.marque || '',
            modele: attributionVehicle.modele || '',
            refTca: attributionVehicle.ref_tca || null,
            carteEssence: attributionVehicle.carte_essence_numero || null,
            licenceTransport: attributionVehicle.licence_transport_numero || null,
            profilId: profilComplet.id,
            salarieNom: profilComplet.nom,
            salariePrenom: profilComplet.prenom,
            salarieGenre: profilComplet.genre,
            salarieMatriculeTca: profilComplet.matricule_tca,
            salarieDateNaissance: profilComplet.date_naissance,
            salarieSecteurNom: (profilComplet.secteur as any)?.nom || null,
            adminId: appUserId,
            adminNom: appUserNom || '',
            adminPrenom: appUserPrenom || '',
          });
          setShowAttributionModal(false);
          setAttributionVehicle(null);
          setAttributionType('');
          setAttributionSalarieId('');
          setAttributionLoueurId('');
          setAttributionNotes('');
          setShowAttestationModal(true);
          setSavingAttribution(false);
          return;
        }
      }

      await fetchVehicles();
      setShowAttributionModal(false);
      setAttributionVehicle(null);
      setAttributionType('');
      setAttributionSalarieId('');
      setAttributionLoueurId('');
      setAttributionNotes('');

    // 🆕 L2 : Si c'est une location, on ne redirige plus vers la page Locations.
      // Le formulaire de contrat s'ouvrira directement (L2c).
    } catch (error) {
      console.error('Erreur attribution:', error);
      alert('Erreur lors de l\'attribution. Veuillez réessayer.');
    } finally {
      setSavingAttribution(false);
    }
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
              placeholder="Rechercher par immatriculation, référence TCA, locataire, propriétaire, fournisseur..."
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
                    onChange={(e) => { setFilters({ ...filters, statut: e.target.value }); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous</option>
                    <option value="sur_parc">🅿 Sur parc</option>
                    <option value="chauffeur_tca">👤 Chauffeur TCA</option>
                    <option value="direction_administratif">🏢 Direction</option>
                  <option value="location_pure">🔄 Location pure</option>
                  <option value="location_vente_particulier">💰 Location-vente particulier</option>
                  <option value="location_vente_societe">🏢 Location-vente société</option>
                    <option value="en_pret">🤝 En prêt</option>
                    <option value="en_garage">🛠 En garage</option>
                    <option value="hors_service">🚫 Hors service</option>
                    <option value="sorti_flotte">📦 Sorti de flotte</option>
                    <option value="actif">Actif (ancien)</option>
                    <option value="maintenance">Maintenance (ancien)</option>
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
                    <option value="ref_tca">Référence TCA</option>
                    <option value="marque">Marque</option>
                    <option value="modele">Modèle</option>
                    <option value="statut">Statut</option>
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
                      onClick={() => handleSort('ref_tca')}
                    >
                      <div className="flex items-center">
                        Réf. TCA
                        {sortField === 'ref_tca' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
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
                      onClick={() => handleSort('statut')}
                    >
                      <div className="flex items-center">
                        Statut
                        {sortField === 'statut' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wide border-r border-gray-300">
                      Attribué à
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
                        {vehicle.ref_tca ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-800">
                            {vehicle.ref_tca}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        <div className="text-sm font-bold text-gray-900">{vehicle.immatriculation}</div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs">
                          <div className="font-bold text-gray-900">{vehicle.marque || '-'}</div>
                          <div className="text-gray-600">{vehicle.modele || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        {getStatusBadge(vehicle.statut)}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <span className="text-xs text-gray-700">
                          {(() => {
                            const s = vehicle.statut;
                            if (s === 'location_pure' || s === 'loa') {
                              return vehicle.locataire_affiche && vehicle.locataire_affiche !== 'Non attribué' && vehicle.locataire_affiche !== 'TCA'
                                ? vehicle.locataire_affiche
                                : <span className="text-gray-400">—</span>;
                            }
                            if (s === 'chauffeur_tca' || s === 'direction_administratif' || s === 'en_pret') {
                              return vehicle.chauffeurs_actifs && vehicle.chauffeurs_actifs.length > 0
                                ? `${vehicle.chauffeurs_actifs[0].prenom || ''} ${vehicle.chauffeurs_actifs[0].nom || ''}`.trim()
                                : <span className="text-gray-400">—</span>;
                            }
                            return <span className="text-gray-400">—</span>;
                          })()}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(vehicle);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                          >
                            Voir
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttributionVehicle(vehicle);
                              setAttributionType('');
                              setShowAttributionModal(true);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 font-semibold transition-colors border border-emerald-300 rounded px-2 py-0.5 text-xs hover:bg-emerald-50"
                          >
                            Attribution
                          </button>
                          {['chauffeur_tca','direction_administratif','location_pure','loa','en_pret'].includes(vehicle.statut) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestituer(vehicle);
                              }}
                              className="text-orange-600 hover:text-orange-800 font-semibold transition-colors border border-orange-300 rounded px-2 py-0.5 text-xs hover:bg-orange-50"
                            >
                              Restituer
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVehicleToDelete(vehicle);
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors p-1"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
          onVehicleUpdated={handleVehicleUpdated}
          photoUrl={photoUrls[selectedVehicle.id]}
        />
      )}

      {showCreateModal && (
        <VehicleCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchVehicles}
        />
      )}

      {vehicleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
                <p className="text-sm text-gray-600">Cette action est irréversible</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Voulez-vous vraiment supprimer ce véhicule ?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-sm">
                  <span className="font-semibold text-gray-900">{vehicleToDelete.immatriculation}</span>
                  {vehicleToDelete.marque && (
                    <span className="text-gray-600"> - {vehicleToDelete.marque} {vehicleToDelete.modele}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setVehicleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteVehicle}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAttributionModal && attributionVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Attribution véhicule</h3>
                <p className="text-sm text-gray-500">
                  {attributionVehicle.immatriculation} · {attributionVehicle.marque} {attributionVehicle.modele}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'attribution</label>
                <select
                  value={attributionType}
                  onChange={(e) => setAttributionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="sur_parc">🅿 Sur parc</option>
                  <option value="chauffeur_tca">👤 Chauffeur TCA</option>
                  <option value="direction_administratif">🏢 Direction / Administratif</option>
                  <option value="location_pure">🔄 Location pure</option>
                  <option value="loa">💰 LOA</option>
                  <option value="en_pret">🤝 En prêt</option>
                  <option value="en_garage">🛠 En garage</option>
                  <option value="hors_service">🚫 Hors service</option>
                  <option value="sorti_flotte">📦 Sorti de flotte</option>
                </select>
              </div>
              {(attributionType === 'chauffeur_tca' || attributionType === 'direction_administratif') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salarié</label>
                  <SalarieSearch
                    salaries={salaries}
                    selectedId={attributionSalarieId}
                    onSelect={setAttributionSalarieId}
                  />
                </div>
              )}
              {(attributionType === 'location_pure' || attributionType === 'loa') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">📋 Contrat de location</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Après validation, créez le contrat complet depuis la page "Locations"
                    pour définir le loueur, les termes financiers et l'état des lieux.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <input
                  type="date"
                  value={attributionDate}
                  onChange={(e) => setAttributionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input
                  type="text"
                  value={attributionNotes}
                  onChange={(e) => setAttributionNotes(e.target.value)}
                  placeholder="Ex: véhicule de remplacement..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => { setShowAttributionModal(false); setAttributionVehicle(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleValiderAttribution}
                disabled={savingAttribution || !attributionType}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingAttribution ? 'Enregistrement...' : 'Valider l\'attribution'}
              </button>
            </div>
          </div>
        </div>
      )}

    {showAttestationModal && attestationData && (
        <AttestationSignatureModal
          isOpen={showAttestationModal}
          onClose={async () => {
            // 🆕 ÉTAPE D3 : Si l'admin annule l'attestation (sans signer), on ne déclenche PAS
            // l'EDL (rien à tracer). On ferme tout simplement.
            setShowAttestationModal(false);
            setAttestationData(null);
            await fetchVehicles();
          }}
          onSuccess={(_pdfPath: string, kmDepart: number) => {
            // 🆕 ÉTAPE D3 : Au lieu de fermer, on ouvre l'EDL avec les infos de l'attribution
            if (!attestationData) return;
            setEdlData({
              typeEdl: 'sortie',
              attributionId: attestationData.attributionId,
              vehiculeId: attestationData.vehiculeId,
              profilId: attestationData.profilId,
              immatriculation: attestationData.immatriculation,
              marque: attestationData.marque,
              modele: attestationData.modele,
              refTca: attestationData.refTca,
              salarieNom: attestationData.salarieNom,
              salariePrenom: attestationData.salariePrenom,
              kmInitial: kmDepart,
              adminId: attestationData.adminId,
              adminNom: attestationData.adminNom,
              adminPrenom: attestationData.adminPrenom,
            });
            setShowAttestationModal(false);
            setAttestationData(null);
            setShowEDLModal(true);
          }}
          {...attestationData}
        />
      )}

      {/* 🆕 ÉTAPE D3 : Modal EDL qui s'ouvre après la signature de l'attestation */}
      {showEDLModal && edlData && (
        <EDLModal
          isOpen={showEDLModal}
          onClose={async () => {
            // L'attestation est déjà signée et sauvegardée. Si l'admin ferme l'EDL sans le valider,
            // l'EDL pourra être fait plus tard manuellement (sera ajouté en D6).
            setShowEDLModal(false);
            setEdlData(null);
            await fetchVehicles();
          }}
          onSuccess={async () => {
            setShowEDLModal(false);
            setEdlData(null);
            await fetchVehicles();
          }}
          {...edlData}
        />
      )}
      {showRestitutionModal && restitutionData && (
        <RestitutionModal
          isOpen={showRestitutionModal}
          onClose={() => {
            setShowRestitutionModal(false);
            setRestitutionData(null);
          }}
          onSuccess={async () => {
            setShowRestitutionModal(false);
            setRestitutionData(null);
            await fetchVehicles();
          }}
          {...restitutionData}
        />
      )}
    </div>
  );
}