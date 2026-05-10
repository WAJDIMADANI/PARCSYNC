import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, RefreshCw, MapPin, Calendar, Euro, User, Building, ArrowLeft, ArrowRight, CheckCircle, X, Filter, AlertCircle, Clock, FileText, Layers } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleLocations } from './VehicleLocations';

interface Location {
  id: string;
  vehicule_id: string;
  locataire_id: string | null;
  reference_contrat: string | null;
  type_location: 'location_pure' | 'location_vente_particulier' | 'location_vente_societe' | 'loa';
  date_debut: string;
  date_fin: string | null;
  duree_mois: number | null;
  montant_mensuel: number | null;
  montant_mensuel_ttc: number | null;
  montant_mensuel_ht: number | null;
  montant_total_ttc: number | null;
  montant_total_ht: number | null;
  depot_garantie: number | null;
  apport_initial: number | null;
  km_depart: number | null;
  km_inclus: number | null;
  valeur_residuelle: number | null;
  mensualites_payees: number | null;
  reste_a_payer_ttc: number | null;
  statut: 'en_cours' | 'terminee' | 'en_retard' | 'annulee' | 'a_venir';
  notes: string | null;
  created_at: string;
  contrat_pdf_path: string | null;
  contrat_signed_pdf_path: string | null;
  signature_status: 'draft' | 'sent' | 'signed' | 'declined' | 'expired' | null;
  yousign_sent_at: string | null;
  yousign_signed_at: string | null;
  vehicule?: {
    immatriculation: string;
    marque: string;
    modele: string;
  };
  locataire?: {
    nom: string;
    prenom: string | null;
    type: string;
    telephone: string | null;
    email: string | null;
  };
  // Calculs front
  nb_paiements_total?: number;
  nb_paiements_payes?: number;
  nb_paiements_impayes_en_retard?: number;
  nb_edl_sortie?: number;
  nb_edl_entree?: number;
  nb_edl_total?: number;
  statut_calcule?: 'a_venir' | 'en_cours' | 'en_retard' | 'terminee';
}

interface Locataire {
  id: string;
  type: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  permis_numero: string | null;
  permis_validite: string | null;
  date_naissance: string | null;
}

interface Props {
  onNavigate?: (view: string, params?: any) => void;
  viewParams?: any;
}

export function LocationsManager({ onNavigate, viewParams }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatutCalcule, setFilterStatutCalcule] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSignature, setFilterSignature] = useState<string>('all');
  const [filterSante, setFilterSante] = useState<string>('all');
  const [filterEDL, setFilterEDL] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form data
  const [vehiculeId, setVehiculeId] = useState('');
  const [vehiculeImmat, setVehiculeImmat] = useState('');
  const [typeLocataire, setTypeLocataire] = useState<'particulier' | 'entreprise'>('particulier');
  const [searchLocataire, setSearchLocataire] = useState('');
  const [locataireExistant, setLocataireExistant] = useState<Locataire | null>(null);
  const [locatairesRecherche, setLocatairesRecherche] = useState<Locataire[]>([]);

  // Nouveau locataire
  const [newLocataire, setNewLocataire] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    date_naissance: '',
    permis_numero: '',
    permis_validite: ''
  });

  // Contrat
  const [typeLocation, setTypeLocation] = useState<'location_pure' | 'loa'>('location_pure');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState('');
  const [montantMensuel, setMontantMensuel] = useState('');
  const [depotGarantie, setDepotGarantie] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (viewParams?.vehiculeId) {
      setVehiculeId(viewParams.vehiculeId);
      setVehiculeImmat(viewParams.vehiculeImmat || '');
      if (viewParams.typeLocation === 'location_pure' || viewParams.typeLocation === 'loa') {
        setTypeLocation(viewParams.typeLocation);
      }
      setView('form');
    }
  }, [viewParams]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      // 1. Récupérer toutes les locations avec véhicule + locataire
      const { data: locsData, error: locsError } = await supabase
        .from('locations')
        .select(`
          *,
          vehicule:vehicule_id(immatriculation, marque, modele),
          locataire:locataire_id(nom, prenom, type, telephone, email)
        `)
        .order('created_at', { ascending: false });

      if (locsError) {
        console.error('Erreur Supabase locations:', locsError);
        throw locsError;
      }

      // 2. Récupérer tous les paiements pour calculer les compteurs
      const { data: paiementsData, error: paiementsError } = await supabase
        .from('paiements_location')
        .select('location_id, statut, mois');

      if (paiementsError) {
        console.error('Erreur Supabase paiements:', paiementsError);
        // On continue quand même, on aura juste pas les compteurs
      }

      // 2bis. Récupérer tous les EDL liés à des locations
      const { data: edlData, error: edlError } = await supabase
        .from('etat_des_lieux')
        .select('location_id, type_edl')
        .not('location_id', 'is', null);

      if (edlError) {
        console.error('Erreur Supabase EDL:', edlError);
        // On continue, juste pas de compteurs EDL
      }

      // 3. Calculer les statistiques par location
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const enrichedLocations: Location[] = (locsData || []).map((loc: any) => {
        const paiementsLocation = (paiementsData || []).filter(
          (p: any) => p.location_id === loc.id
        );

        const nb_paiements_total = paiementsLocation.length;
        const nb_paiements_payes = paiementsLocation.filter(
          (p: any) => p.statut === 'paye'
        ).length;
        const nb_paiements_impayes_en_retard = paiementsLocation.filter(
          (p: any) => {
            if (p.statut === 'paye') return false;
            const moisDate = new Date(p.mois);
            return moisDate < today;
          }
        ).length;

        // Calcul du statut auto
        const dateDebutLoc = new Date(loc.date_debut);
        const dateFinLoc = loc.date_fin ? new Date(loc.date_fin) : null;
        let statut_calcule: 'a_venir' | 'en_cours' | 'en_retard' | 'terminee';

        if (loc.statut === 'terminee' || loc.statut === 'annulee') {
          statut_calcule = 'terminee';
        } else if (dateDebutLoc > today) {
          statut_calcule = 'a_venir';
        } else if (dateFinLoc && dateFinLoc < today) {
          statut_calcule = 'terminee';
        } else if (nb_paiements_impayes_en_retard > 0) {
          statut_calcule = 'en_retard';
        } else {
          statut_calcule = 'en_cours';
        }

        // Compteurs EDL pour cette location
        const edlsLocation = (edlData || []).filter((e: any) => e.location_id === loc.id);
        const nb_edl_sortie = edlsLocation.filter((e: any) => e.type_edl === 'sortie').length;
        const nb_edl_entree = edlsLocation.filter((e: any) => e.type_edl === 'entree').length;
        const nb_edl_total = edlsLocation.length;

        return {
          ...loc,
          nb_paiements_total,
          nb_paiements_payes,
          nb_paiements_impayes_en_retard,
          nb_edl_sortie,
          nb_edl_entree,
          nb_edl_total,
          statut_calcule,
        };
      });

      // 4. Tri "plus urgent d'abord" : en_retard > a_venir > en_cours > terminee
      const ordrePriorite: Record<string, number> = {
        en_retard: 0,
        a_venir: 1,
        en_cours: 2,
        terminee: 3,
      };

      enrichedLocations.sort((a, b) => {
        const pa = ordrePriorite[a.statut_calcule || 'en_cours'];
        const pb = ordrePriorite[b.statut_calcule || 'en_cours'];
        if (pa !== pb) return pa - pb;
        // À priorité égale, plus récent d'abord
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log(`Locations chargées: ${enrichedLocations.length}`);
      setLocations(enrichedLocations);
    } catch (error) {
      console.error('Erreur lors du chargement des locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const rechercherLocataires = async (query: string) => {
    if (!query || query.length < 2) {
      setLocatairesRecherche([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('loueur')
        .select('*')
        .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%`)
        .eq('type', typeLocataire)
        .limit(5);

      if (error) throw error;
      setLocatairesRecherche(data || []);
    } catch (error) {
      console.error('Erreur recherche locataires:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      rechercherLocataires(searchLocataire);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchLocataire, typeLocataire]);

  const handleNouvelleLocation = () => {
    setView('form');
    setStep(1);
    resetForm();
  };

  const resetForm = () => {
    if (!viewParams?.vehiculeId) {
      setVehiculeId('');
      setVehiculeImmat('');
    }
    setTypeLocataire('particulier');
    setSearchLocataire('');
    setLocataireExistant(null);
    setLocatairesRecherche([]);
    setNewLocataire({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      adresse: '',
      date_naissance: '',
      permis_numero: '',
      permis_validite: ''
    });
    setTypeLocation(viewParams?.typeLocation || 'location_pure');
    setDateDebut(new Date().toISOString().split('T')[0]);
    setDateFin('');
    setMontantMensuel('');
    setDepotGarantie('');
    setNotes('');
  };

  const handleRetourListe = () => {
    setView('list');
    setStep(1);
    resetForm();
    setSuccessMessage('');
  };

  const handleNextStep = () => {
    if (step === 1 && !vehiculeImmat) {
      alert('Veuillez saisir une immatriculation');
      return;
    }
    if (step === 1 && !locataireExistant && !newLocataire.nom) {
      alert('Veuillez sélectionner ou créer un locataire');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreerLocation = async () => {
    setSaving(true);
    try {
      let locataireId = locataireExistant?.id;

      if (!locataireId && newLocataire.nom) {
        const { data: newLoc, error: locError } = await supabase
          .from('loueur')
          .insert({
            type: typeLocataire,
            nom: newLocataire.nom,
            prenom: typeLocataire === 'particulier' ? newLocataire.prenom : null,
            telephone: newLocataire.telephone || null,
            email: newLocataire.email || null,
            adresse: newLocataire.adresse || null,
            date_naissance: typeLocataire === 'particulier' ? newLocataire.date_naissance || null : null,
            permis_numero: typeLocataire === 'particulier' ? newLocataire.permis_numero || null : null,
            permis_validite: typeLocataire === 'particulier' ? newLocataire.permis_validite || null : null,
            actif: true
          })
          .select()
          .single();
        if (locError) throw locError;
        locataireId = newLoc.id;
      }

      const { error: locationError } = await supabase
        .from('locations')
        .insert({
          vehicule_id: vehiculeId,
          locataire_id: locataireId,
          type_location: typeLocation,
          date_debut: dateDebut,
          date_fin: dateFin || null,
          montant_mensuel: montantMensuel ? parseFloat(montantMensuel) : null,
          depot_garantie: depotGarantie ? parseFloat(depotGarantie) : null,
          statut: 'en_cours',
          notes: notes || null
        });

      if (locationError) throw locationError;

      // Mettre à jour locataire_type dans vehicule
      await supabase
        .from('vehicule')
        .update({
          locataire_type: typeLocataire === 'particulier' ? 'personne_externe' : 'entreprise_externe'
        })
        .eq('id', vehiculeId);

      // Créer l'attribution avec loueur_id
      if (locataireId) {
        await supabase
          .from('attribution_vehicule')
          .update({ date_fin: dateDebut })
          .eq('vehicule_id', vehiculeId)
          .is('date_fin', null);

        await supabase
          .from('attribution_vehicule')
          .insert({
            vehicule_id: vehiculeId,
            loueur_id: locataireId,
            type_attribution: 'principal',
            date_debut: dateDebut,
            date_fin: null
          });
      }

      setSuccessMessage('Location créée avec succès');
      await fetchLocations();
      setTimeout(() => {
        handleRetourListe();
      }, 2000);
    } catch (error) {
      console.error('Erreur création location:', error);
      alert('Erreur lors de la création de la location');
    } finally {
      setSaving(false);
    }
  };

  // ─── Logique métier ────────────────────────────────────────────────────────

  const isAtRisk = (loc: Location): { atRisk: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    if ((loc.nb_paiements_impayes_en_retard || 0) > 0) {
      const n = loc.nb_paiements_impayes_en_retard || 0;
      reasons.push(`${n} impayé${n > 1 ? 's' : ''}`);
    }
    if (loc.statut_calcule === 'en_cours' && loc.signature_status !== 'signed') {
      reasons.push('non signé');
    }
    return { atRisk: reasons.length > 0, reasons };
  };

  const isToAnticipate = (loc: Location): boolean => {
    if (loc.statut_calcule !== 'en_cours') return false;
    if (!loc.date_fin) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const df = new Date(loc.date_fin);
    const daysUntilEnd = Math.floor((df.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd >= 0 && daysUntilEnd <= 30;
  };

  const getKpiData = () => {
    const enCours = locations.filter(l => l.statut_calcule === 'en_cours');
    const aVenir = locations.filter(l => l.statut_calcule === 'a_venir');
    const terminees = locations.filter(l => l.statut_calcule === 'terminee');
    const aRisque = locations.filter(l => isAtRisk(l).atRisk);
    const aAnticiper = locations.filter(l => isToAnticipate(l));
    return {
      total: locations.length,
      enCours: { count: enCours.length, signes: enCours.filter(l => l.signature_status === 'signed').length },
      aVenir: { count: aVenir.length, envoyes: aVenir.filter(l => l.signature_status === 'sent').length },
      aRisque: {
        count: aRisque.length,
        impayes: locations.reduce((s, l) => s + (l.nb_paiements_impayes_en_retard || 0), 0),
        nonSignes: enCours.filter(l => l.signature_status !== 'signed').length,
      },
      aAnticiper: { count: aAnticiper.length },
      terminees: { count: terminees.length },
    };
  };

  const sortedAndFilteredLocations = (() => {
    const filtered = locations.filter(loc => {
      if (filterStatutCalcule) {
        if (filterStatutCalcule === 'at_risk') {
          if (!isAtRisk(loc).atRisk) return false;
        } else if (filterStatutCalcule === 'to_anticipate') {
          if (!isToAnticipate(loc)) return false;
        } else if (loc.statut_calcule !== filterStatutCalcule) {
          return false;
        }
      }
      if (filterType !== 'all' && loc.type_location !== filterType) return false;
      if (filterSignature !== 'all') {
        const sig = loc.signature_status || 'draft';
        if (filterSignature === 'no_pdf') {
          if (loc.contrat_pdf_path) return false;
        } else if (sig !== filterSignature) return false;
      }
      if (filterSante === 'sain') {
        if (isAtRisk(loc).atRisk) return false;
      } else if (filterSante === 'a_risque') {
        if (!isAtRisk(loc).atRisk) return false;
      }
      // Filtre EDL fonctionnel
      if (filterEDL !== 'all') {
        const sortie = (loc.nb_edl_sortie || 0) > 0;
        const entree = (loc.nb_edl_entree || 0) > 0;
        if (filterEDL === 'with_sortie' && !sortie) return false;
        if (filterEDL === 'with_retour' && !entree) return false;
        if (filterEDL === 'complete' && (!sortie || !entree)) return false;
        if (filterEDL === 'none' && (loc.nb_edl_total || 0) > 0) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const m = loc.vehicule?.immatriculation?.toLowerCase().includes(s) ||
          loc.locataire?.nom?.toLowerCase().includes(s) ||
          loc.locataire?.prenom?.toLowerCase().includes(s) ||
          loc.locataire?.email?.toLowerCase().includes(s) ||
          loc.reference_contrat?.toLowerCase().includes(s);
        if (!m) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'reference':
          cmp = (a.reference_contrat || '').localeCompare(b.reference_contrat || '');
          break;
        case 'vehicule':
          cmp = (a.vehicule?.immatriculation || '').localeCompare(b.vehicule?.immatriculation || '');
          break;
        case 'type':
          cmp = (a.type_location || '').localeCompare(b.type_location || '');
          break;
        case 'locataire':
          cmp = (a.locataire?.nom || '').localeCompare(b.locataire?.nom || '');
          break;
        case 'date_debut':
          cmp = new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
          break;
        case 'date_fin':
          cmp = new Date(a.date_fin || 0).getTime() - new Date(b.date_fin || 0).getTime();
          break;
        case 'priority':
        default: {
          const ordre: Record<string, number> = { en_retard: 0, a_venir: 1, en_cours: 2, terminee: 3 };
          cmp = (ordre[a.statut_calcule || 'en_cours'] ?? 99) - (ordre[b.statut_calcule || 'en_cours'] ?? 99);
          if (cmp === 0) {
            cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  })();

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredLocations.length / ITEMS_PER_PAGE));
  const paginatedLocations = sortedAndFilteredLocations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatutCalcule, filterType, filterSignature, filterSante, filterEDL, search]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatutCalcule(null);
    setFilterType('all');
    setFilterSignature('all');
    setFilterSante('all');
    setFilterEDL('all');
  };

  const hasActiveFilters = !!filterStatutCalcule || filterType !== 'all' || filterSignature !== 'all' || filterSante !== 'all' || filterEDL !== 'all' || !!search;

  const kpi = getKpiData();

  // ─── Helpers d'affichage ───────────────────────────────────────────────────

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      location_pure: 'Location pure',
      location_vente_particulier: 'Loc-vente Particulier',
      location_vente_societe: 'Loc-vente Société',
      loa: 'LOA',
    };
    return labels[type] || type;
  };

  const getStatutInfo = (loc: Location) => {
    const sc = loc.statut_calcule || 'en_cours';
    const map: Record<string, { label: string; bg: string; text: string; dot: string }> = {
      en_cours: { label: 'En cours', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      a_venir: { label: 'À venir', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      en_retard: { label: 'En retard', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
      terminee: { label: 'Terminée', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    };
    return map[sc] || map.en_cours;
  };

  const getSignatureBadge = (loc: Location) => {
    if (!loc.contrat_pdf_path) return { label: 'Pas de PDF', bg: 'bg-slate-100', text: 'text-slate-600' };
    const sig = loc.signature_status;
    if (sig === 'signed') return { label: 'Signé', bg: 'bg-emerald-50', text: 'text-emerald-700' };
    if (sig === 'sent') return { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700' };
    if (sig === 'declined') return { label: 'Refusé', bg: 'bg-red-50', text: 'text-red-700' };
    return { label: 'Brouillon', bg: 'bg-slate-100', text: 'text-slate-600' };
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return <LoadingSpinner />;
  }

  // ─── Vue liste ────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Success message */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center text-sm">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Locations</h1>
            <p className="text-sm text-slate-500 mt-1">Gestion administrative et juridique des contrats</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLocations}
              className="flex items-center px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </button>
            <button
              onClick={handleNouvelleLocation}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle location
            </button>
          </div>
        </div>

        {/* SECTION 1 — États des contrats */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">États des contrats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setFilterStatutCalcule(null)}
              className={`p-4 rounded-xl border text-left transition-all ${
                !filterStatutCalcule ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-slate-500">Total</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900">{kpi.total}</div>
              <div className="text-xs text-slate-500 mt-1">contrats</div>
            </button>

            <button
              onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'en_cours' ? null : 'en_cours')}
              className={`p-4 rounded-xl border text-left transition-all ${
                filterStatutCalcule === 'en_cours' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-slate-500">En cours</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900">{kpi.enCours.count}</div>
              <div className="text-xs text-slate-500 mt-1">{kpi.enCours.signes} signé{kpi.enCours.signes > 1 ? 's' : ''}</div>
            </button>

            <button
              onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'a_venir' ? null : 'a_venir')}
              className={`p-4 rounded-xl border text-left transition-all ${
                filterStatutCalcule === 'a_venir' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-slate-500">À venir</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900">{kpi.aVenir.count}</div>
              <div className="text-xs text-slate-500 mt-1">{kpi.aVenir.envoyes} envoyé{kpi.aVenir.envoyes > 1 ? 's' : ''}</div>
            </button>

            <button
              onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'terminee' ? null : 'terminee')}
              className={`p-4 rounded-xl border text-left transition-all ${
                filterStatutCalcule === 'terminee' ? 'border-slate-500 bg-slate-100 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500">Terminées</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900">{kpi.terminees.count}</div>
              <div className="text-xs text-slate-500 mt-1">archivées</div>
            </button>
          </div>
        </div>

        {/* SECTION 2 — Alertes */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Alertes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* À risque */}
            <button
              onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'at_risk' ? null : 'at_risk')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                filterStatutCalcule === 'at_risk'
                  ? 'border-red-500 bg-red-50 shadow-md'
                  : kpi.aRisque.count > 0
                    ? 'border-red-300 bg-red-50/50 hover:border-red-400 hover:shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${kpi.aRisque.count > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                    <AlertCircle className={`h-4 w-4 ${kpi.aRisque.count > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-sm font-semibold ${kpi.aRisque.count > 0 ? 'text-red-700' : 'text-slate-700'}`}>À risque</span>
                </div>
                <span className={`text-3xl font-bold ${kpi.aRisque.count > 0 ? 'text-red-700' : 'text-slate-300'}`}>{kpi.aRisque.count}</span>
              </div>
              <p className={`text-sm ${kpi.aRisque.count > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                {kpi.aRisque.count === 0 && 'Aucun contrat à risque'}
                {kpi.aRisque.impayes > 0 && `${kpi.aRisque.impayes} impayé${kpi.aRisque.impayes > 1 ? 's' : ''}`}
                {kpi.aRisque.impayes > 0 && kpi.aRisque.nonSignes > 0 && ' · '}
                {kpi.aRisque.nonSignes > 0 && `${kpi.aRisque.nonSignes} non signé${kpi.aRisque.nonSignes > 1 ? 's' : ''}`}
              </p>
              {kpi.aRisque.count > 0 && <p className="text-xs text-red-600 mt-2 font-medium">Action requise</p>}
            </button>

            {/* À anticiper */}
            <button
              onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'to_anticipate' ? null : 'to_anticipate')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                filterStatutCalcule === 'to_anticipate'
                  ? 'border-amber-500 bg-amber-50 shadow-md'
                  : kpi.aAnticiper.count > 0
                    ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400 hover:shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${kpi.aAnticiper.count > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Clock className={`h-4 w-4 ${kpi.aAnticiper.count > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-sm font-semibold ${kpi.aAnticiper.count > 0 ? 'text-amber-700' : 'text-slate-700'}`}>À anticiper</span>
                </div>
                <span className={`text-3xl font-bold ${kpi.aAnticiper.count > 0 ? 'text-amber-700' : 'text-slate-300'}`}>{kpi.aAnticiper.count}</span>
              </div>
              <p className={`text-sm ${kpi.aAnticiper.count > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {kpi.aAnticiper.count === 0 ? 'Aucun contrat ne finit dans les 30 prochains jours' : `Contrat${kpi.aAnticiper.count > 1 ? 's' : ''} finissant sous 30 jours`}
              </p>
            </button>
          </div>
        </div>

        {/* SECTION 3 — Recherche + Filtres */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par véhicule, locataire ou référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">Type : Tous</option>
              <option value="location_pure">Location pure</option>
              <option value="location_vente_particulier">Loc-vente Particulier</option>
              <option value="location_vente_societe">Loc-vente Société</option>
              <option value="loa">LOA</option>
            </select>
            <select value={filterSignature} onChange={(e) => setFilterSignature(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">Signature : Tous</option>
              <option value="signed">Signé</option>
              <option value="sent">En attente</option>
              <option value="draft">Brouillon</option>
              <option value="declined">Refusé</option>
              <option value="no_pdf">Sans PDF</option>
            </select>
            <select value={filterSante} onChange={(e) => setFilterSante(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">Santé : Tous</option>
              <option value="sain">Sain</option>
              <option value="a_risque">À risque</option>
            </select>
            <select value={filterEDL} onChange={(e) => setFilterEDL(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">EDL : Tous</option>
              <option value="with_sortie">Avec EDL Sortie</option>
              <option value="with_retour">Avec EDL Retour</option>
              <option value="complete">EDL complet</option>
              <option value="none">Sans aucun EDL</option>
            </select>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100">
                <X className="h-3 w-3" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* SECTION 4 — Tableau dense pro */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-medium">{sortedAndFilteredLocations.length}</span> contrat{sortedAndFilteredLocations.length > 1 ? 's' : ''}
              {hasActiveFilters && <span className="text-slate-400"> sur {locations.length}</span>}
            </p>
            {totalPages > 1 && (
              <p className="text-xs text-slate-500">
                Page {currentPage} sur {totalPages}
              </p>
            )}
          </div>

          {sortedAndFilteredLocations.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun contrat ne correspond aux filtres</p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="mt-3 text-sm text-blue-600 hover:underline">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="w-1 px-0"></th>
                      <th
                        onClick={() => handleSort('reference')}
                        className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none"
                      >
                        Référence {sortColumn === 'reference' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => handleSort('vehicule')}
                        className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none"
                      >
                        Véhicule {sortColumn === 'vehicule' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => handleSort('type')}
                        className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none"
                      >
                        Type {sortColumn === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => handleSort('locataire')}
                        className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none"
                      >
                        Locataire {sortColumn === 'locataire' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => handleSort('date_debut')}
                        className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none"
                      >
                        Période {sortColumn === 'date_debut' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Statut
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Doc.
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Sig.
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Pay.
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        EDL
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Risque
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLocations.map((loc) => {
                      const statut = getStatutInfo(loc);
                      const risk = isAtRisk(loc);
                      const nbPay = loc.nb_paiements_payes || 0;
                      const nbTotal = loc.nb_paiements_total || 0;
                      const nbRetard = loc.nb_paiements_impayes_en_retard || 0;

                      return (
                        <tr
                          key={loc.id}
                          onClick={() => setSelectedLocation(loc)}
                          className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                            risk.atRisk ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className={`p-0 w-1 ${risk.atRisk ? 'bg-red-500' : statut.dot}`}></td>

                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-900">{loc.reference_contrat || '—'}</div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-900">{loc.vehicule?.immatriculation || '—'}</div>
                            <div className="text-xs text-slate-500">{loc.vehicule?.marque} {loc.vehicule?.modele}</div>
                          </td>

                          <td className="px-3 py-3">
                            <span className="text-slate-700">{getTypeLabel(loc.type_location)}</span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-900">
                              {loc.locataire?.nom} {loc.locataire?.prenom || ''}
                            </div>
                            <div className="text-xs text-slate-500">
                              {loc.locataire?.type === 'particulier' ? 'Particulier' : 'Entreprise'}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-slate-700 text-xs">
                              {new Date(loc.date_debut).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                              {loc.date_fin && ` → ${new Date(loc.date_fin).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}`}
                            </div>
                            {loc.duree_mois && <div className="text-xs text-slate-400">{loc.duree_mois} mois</div>}
                          </td>

                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statut.bg} ${statut.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />
                              {statut.label}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-center">
                            {loc.contrat_pdf_path ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-slate-300 font-bold">✗</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center">
                            {loc.signature_status === 'signed' && <span className="text-emerald-600 font-bold">✓</span>}
                            {loc.signature_status === 'sent' && <span className="text-amber-500 text-xs font-medium">En att.</span>}
                            {loc.signature_status === 'declined' && <span className="text-red-600 font-bold">✗</span>}
                            {(!loc.signature_status || loc.signature_status === 'draft') && <span className="text-slate-300">—</span>}
                          </td>

                          <td className="px-3 py-3 text-center">
                            {nbTotal === 0 ? (
                              <span className="text-slate-400 text-xs">—</span>
                            ) : (
                              <div>
                                <span className={`text-xs font-medium ${nbRetard > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                  {nbPay}/{nbTotal}
                                </span>
                                {nbRetard > 0 && (
                                  <div className="text-xs text-red-600 font-medium">{nbRetard} retard</div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* EDL — fonctionnel */}
                          <td className="px-3 py-3 text-center">
                            {(() => {
                              const sortie = (loc.nb_edl_sortie || 0) > 0;
                              const entree = (loc.nb_edl_entree || 0) > 0;
                              const isActive = loc.statut_calcule === 'en_cours' || loc.statut_calcule === 'a_venir';
                              if (sortie && entree) {
                                return <span className="text-emerald-600 text-base" title="EDL Sortie + Retour">✓✓</span>;
                              }
                              if (sortie) {
                                return <span className="text-blue-600 text-xs font-medium" title="EDL Sortie fait, Retour manquant">S</span>;
                              }
                              if (entree) {
                                return <span className="text-amber-600 text-xs font-medium" title="EDL Retour fait, Sortie manquante">R</span>;
                              }
                              return (
                                <span className={`text-xs ${isActive ? 'text-red-500 font-medium' : 'text-slate-300'}`} title={isActive ? 'Aucun EDL ⚠' : 'Aucun EDL'}>
                                  {isActive ? '⚠' : '—'}
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-3 py-3 text-center">
                            {risk.atRisk ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <AlertCircle className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold">✓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Précédent
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
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
                          className={`w-8 h-8 text-sm font-medium rounded-lg transition ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL DÉTAILS — réutilise le composant VehicleLocations existant */}
        {selectedLocation && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedLocation(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="flex items-start justify-between p-5 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedLocation.reference_contrat || 'Contrat sans référence'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedLocation.vehicule?.immatriculation} · {selectedLocation.vehicule?.marque} {selectedLocation.vehicule?.modele}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Contenu : composant VehicleLocations qui affiche tout */}
              <div className="flex-1 overflow-y-auto p-5">
                <VehicleLocations vehicleId={selectedLocation.vehicule_id} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Vue formulaire (wizard — intact) ────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRetourListe}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle location</h1>
        </div>
        <div className="text-sm font-medium text-gray-600">
          Étape {step} / 3
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Véhicule et Locataire</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Immatriculation du véhicule
              </label>
              <input
                type="text"
                value={vehiculeImmat}
                onChange={(e) => setVehiculeImmat(e.target.value)}
                disabled={!!viewParams?.vehiculeId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="AA-123-BB"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de locataire
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setTypeLocataire('particulier')}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 ${
                    typeLocataire === 'particulier'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Particulier
                </button>
                <button
                  onClick={() => setTypeLocataire('entreprise')}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 ${
                    typeLocataire === 'entreprise'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Building className="h-5 w-5 mr-2" />
                  Entreprise
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un locataire existant
              </label>
              <input
                type="text"
                value={searchLocataire}
                onChange={(e) => setSearchLocataire(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom, prénom ou email..."
              />
              {locatairesRecherche.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg divide-y">
                  {locatairesRecherche.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setLocataireExistant(loc);
                        setSearchLocataire('');
                        setLocatairesRecherche([]);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {loc.nom} {loc.prenom || ''}
                        </div>
                        <div className="text-sm text-gray-500">{loc.email || loc.telephone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {locataireExistant && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {locataireExistant.nom} {locataireExistant.prenom || ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {locataireExistant.email || locataireExistant.telephone}
                    </div>
                  </div>
                  <button
                    onClick={() => setLocataireExistant(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {!locataireExistant && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Créer un nouveau locataire
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {typeLocataire === 'particulier' ? 'Nom' : 'Raison sociale'}
                    </label>
                    <input
                      type="text"
                      value={newLocataire.nom}
                      onChange={(e) => setNewLocataire({ ...newLocataire, nom: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {typeLocataire === 'particulier' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={newLocataire.prenom}
                        onChange={(e) => setNewLocataire({ ...newLocataire, prenom: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={newLocataire.telephone}
                      onChange={(e) => setNewLocataire({ ...newLocataire, telephone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newLocataire.email}
                      onChange={(e) => setNewLocataire({ ...newLocataire, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={newLocataire.adresse}
                      onChange={(e) => setNewLocataire({ ...newLocataire, adresse: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {typeLocataire === 'particulier' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de naissance
                        </label>
                        <input
                          type="date"
                          value={newLocataire.date_naissance}
                          onChange={(e) => setNewLocataire({ ...newLocataire, date_naissance: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Numéro de permis
                        </label>
                        <input
                          type="text"
                          value={newLocataire.permis_numero}
                          onChange={(e) => setNewLocataire({ ...newLocataire, permis_numero: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Validité du permis
                        </label>
                        <input
                          type="date"
                          value={newLocataire.permis_validite}
                          onChange={(e) => setNewLocataire({ ...newLocataire, permis_validite: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Termes du contrat</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de location
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setTypeLocation('location_pure')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    typeLocation === 'location_pure'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Location pure
                </button>
                <button
                  onClick={() => setTypeLocation('loa')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    typeLocation === 'loa'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  LOA
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin (optionnel)
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant mensuel (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montantMensuel}
                  onChange={(e) => setMontantMensuel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dépôt de garantie (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depotGarantie}
                  onChange={(e) => setDepotGarantie(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirmation</h2>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Véhicule</h3>
                <p className="text-lg font-medium text-gray-900">{vehiculeImmat}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Locataire</h3>
                {locataireExistant ? (
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {locataireExistant.nom} {locataireExistant.prenom || ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      {locataireExistant.type === 'particulier' ? 'Particulier' : 'Entreprise'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {newLocataire.nom} {newLocataire.prenom}
                    </p>
                    <p className="text-sm text-gray-600">
                      {typeLocataire === 'particulier' ? 'Particulier' : 'Entreprise'} (Nouveau)
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Type de location</h3>
                <p className="text-lg font-medium text-gray-900">
                  {typeLocation === 'location_pure' ? 'Location pure' : 'LOA'}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date de début</h3>
                  <p className="text-gray-900">{new Date(dateDebut).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date de fin</h3>
                  <p className="text-gray-900">
                    {dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : 'Indéterminée'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Montant mensuel</h3>
                  <p className="text-gray-900">
                    {montantMensuel ? `${parseFloat(montantMensuel).toFixed(2)} €` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Dépôt de garantie</h3>
                  <p className="text-gray-900">
                    {depotGarantie ? `${parseFloat(depotGarantie).toFixed(2)} €` : 'Non renseigné'}
                  </p>
                </div>
              </div>

              {notes && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={step === 1 ? handleRetourListe : handlePrevStep}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {step === 1 ? 'Annuler' : 'Précédent'}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Suivant
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleCreerLocation}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Créer la location
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
