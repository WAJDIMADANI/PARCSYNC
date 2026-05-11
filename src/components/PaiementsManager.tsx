import { useState, useEffect, useMemo } from 'react';
import {
  Banknote, Search, RefreshCw, X, Check, Loader2, AlertTriangle,
  Clock, CheckCircle2, TrendingUp, Building2, Receipt, CreditCard,
  Repeat, Coins, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ========================================================================
// TYPES
// ========================================================================

interface PaiementRow {
  id: string;
  location_id: string;
  numero_echeance: number;
  mois: string;
  montant_attendu_ht: number | null;
  montant_attendu_ttc: number | null;
  montant_paye: number | null;
  date_paiement: string | null;
  statut: string;
  notes: string | null;
  // Données dérivées de la location
  vehicule_immat: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_ref_tca: string | null;
  locataire_nom: string | null;
  locataire_prenom: string | null;
  type_location: string | null;
  contrat_statut: string | null;
  reference_contrat: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_mois: number | null;
  montant_mensuel_ttc: number | null;
  montant_total_ttc: number | null;
  mensualites_payees: number | null;
}

interface ContratPaiement {
  location_id: string;
  reference_contrat: string;
  vehicule_immat: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  locataire_nom: string;
  locataire_prenom: string;
  type_location: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_mois: number | null;
  montant_mensuel_ttc: number;
  montant_total_ttc: number;
  contrat_statut: string | null;
  paiements: PaiementRow[];
  // Calculé
  totalAttendu: number;
  totalEncaisse: number;
  reste: number;
  nbTotal: number;
  nbPayes: number;
  nbRetards: number;
  nbPartiels: number;
  nbAvenir: number;
  sante: 'ok' | 'risque' | 'avenir';
  tauxEncaissement: number;
}

type PeriodeFilter = 'tout' | 'ce_mois' | 'ce_trimestre' | 'cette_annee';
type FilterDetail = 'tout' | 'paye' | 'avenir' | 'impaye' | 'partiel';
type SortBy = 'reference' | 'vehicule' | 'locataire' | 'periode' | 'encaissement' | 'sante';
type SortDir = 'asc' | 'desc';

// ========================================================================
// CONSTANTES
// ========================================================================

const STATUT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  paye:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Payé' },
  impaye:  { bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'À venir' },
  partiel: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Partiel' },
  retard:  { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Retard' },
};

const SANTE_CONFIG = {
  ok:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'OK',      icon: CheckCircle2 },
  risque: { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Risque',  icon: AlertTriangle },
  avenir: { bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'À venir', icon: Clock },
};

const TYPE_LABELS: Record<string, string> = {
  location_pure: 'Loc. pure',
  location_vente_particulier: 'Loc-vente',
  location_vente_societe: 'Loc-vente soc.',
  loa: 'LOA',
};

const MODES_PAIEMENT = [
  { key: 'virement',    label: 'Virement', icon: Building2 },
  { key: 'cheque',      label: 'Chèque',   icon: Receipt },
  { key: 'especes',     label: 'Espèces',  icon: Coins },
  { key: 'cb',          label: 'CB',       icon: CreditCard },
  { key: 'prelevement', label: 'Prélèvt.', icon: Repeat },
];

const PERIODE_LABELS: Record<PeriodeFilter, string> = {
  tout: 'Tout',
  ce_mois: 'Ce mois',
  ce_trimestre: 'Ce trimestre',
  cette_annee: 'Cette année',
};

const LS_LAST_COMPTE_KEY = 'parc_sync_last_compte_id';
const PAGE_SIZE = 50;

// ========================================================================
// COMPOSANT PRINCIPAL
// ========================================================================

export function PaiementsManager() {
  const [paiements, setPaiements] = useState<PaiementRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres / recherche / tri / pagination
  const [search, setSearch] = useState('');
  const [periode, setPeriode] = useState<PeriodeFilter>('tout');
  const [showTermines, setShowTermines] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSante, setFilterSante] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('reference');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Popup contrat
  const [contratDetail, setContratDetail] = useState<ContratPaiement | null>(null);
  const [filterDetail, setFilterDetail] = useState<FilterDetail>('tout');

  // Modal pointage
  const [pointageId, setPointageId] = useState<string | null>(null);
  const [pointageMontant, setPointageMontant] = useState('');
  const [pointageMontantType, setPointageMontantType] = useState<'total' | 'custom'>('total');
  const [pointageDate, setPointageDate] = useState(new Date().toISOString().split('T')[0]);
  const [pointageDateType, setPointageDateType] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [pointageMode, setPointageMode] = useState('');
  const [pointageCompteId, setPointageCompteId] = useState('');
  const [pointageReference, setPointageReference] = useState('');
  const [pointageNotes, setPointageNotes] = useState('');
  const [savingPointage, setSavingPointage] = useState(false);

  // Comptes bancaires
  const [comptesBank, setComptesBank] = useState<{ id: string; nom: string; banque: string | null }[]>([]);

  // ----------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ----------------------------------------------------------------------

  useEffect(() => {
    supabase.from('comptes_bancaires').select('id, nom, banque').eq('actif', true).order('nom')
      .then(({ data }) => setComptesBank(data || []));
  }, []);

  useEffect(() => { fetchPaiements(); }, []);

  const fetchPaiements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paiements_location')
        .select(`
          id, location_id, numero_echeance, mois,
          montant_attendu_ht, montant_attendu_ttc,
          montant_paye, date_paiement, statut, notes,
          location:location_id(
            type_location, statut, reference_contrat, date_debut, date_fin,
            duree_mois, montant_mensuel_ttc, montant_total_ttc, mensualites_payees,
            vehicule:vehicule_id(immatriculation, marque, modele, ref_tca),
            locataire:locataire_id(nom, prenom)
          )
        `)
        .order('mois', { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const rows: PaiementRow[] = (data || []).map((p: any) => {
        let statut = p.statut;
        if (statut === 'impaye' && p.mois < today) statut = 'retard';

        return {
          id: p.id,
          location_id: p.location_id,
          numero_echeance: p.numero_echeance,
          mois: p.mois,
          montant_attendu_ht: p.montant_attendu_ht,
          montant_attendu_ttc: p.montant_attendu_ttc,
          montant_paye: p.montant_paye,
          date_paiement: p.date_paiement,
          statut,
          notes: p.notes,
          vehicule_immat: p.location?.vehicule?.immatriculation || null,
          vehicule_marque: p.location?.vehicule?.marque || null,
          vehicule_modele: p.location?.vehicule?.modele || null,
          vehicule_ref_tca: p.location?.vehicule?.ref_tca || null,
          locataire_nom: p.location?.locataire?.nom || null,
          locataire_prenom: p.location?.locataire?.prenom || null,
          type_location: p.location?.type_location || null,
          contrat_statut: p.location?.statut || null,
          reference_contrat: p.location?.reference_contrat || null,
          date_debut: p.location?.date_debut || null,
          date_fin: p.location?.date_fin || null,
          duree_mois: p.location?.duree_mois || null,
          montant_mensuel_ttc: p.location?.montant_mensuel_ttc || null,
          montant_total_ttc: p.location?.montant_total_ttc || null,
          mensualites_payees: p.location?.mensualites_payees || null,
        };
      });

      setPaiements(rows);
    } catch (err) {
      console.error('[PaiementsManager] Erreur fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // GROUPEMENT PAR CONTRAT
  // ----------------------------------------------------------------------

  const allContrats = useMemo<ContratPaiement[]>(() => {
    const groups: Record<string, PaiementRow[]> = {};
    paiements.forEach(p => {
      if (!groups[p.location_id]) groups[p.location_id] = [];
      groups[p.location_id].push(p);
    });

    const today = new Date().toISOString().split('T')[0];

    return Object.entries(groups).map(([location_id, list]) => {
      const first = list[0];
      const totalAttendu = list.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
      const totalEncaisse = list.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
      const nbTotal = list.length;
      const nbPayes = list.filter(p => p.statut === 'paye').length;
      const nbRetards = list.filter(p => p.statut === 'retard').length;
      const nbPartiels = list.filter(p => p.statut === 'partiel').length;
      const nbEchues = list.filter(p => p.mois && p.mois <= today).length;
      const nbAvenir = nbTotal - nbEchues;

      let sante: 'ok' | 'risque' | 'avenir';
      if (nbRetards > 0 || nbPartiels > 0) sante = 'risque';
      else if (nbEchues === 0) sante = 'avenir';
      else sante = 'ok';

      const tauxEncaissement = totalAttendu > 0 ? Math.round((totalEncaisse / totalAttendu) * 100) : 0;

      return {
        location_id,
        reference_contrat: first.reference_contrat || location_id.slice(0, 6).toUpperCase(),
        vehicule_immat: first.vehicule_immat,
        vehicule_marque: first.vehicule_marque,
        vehicule_modele: first.vehicule_modele,
        locataire_nom: first.locataire_nom || '',
        locataire_prenom: first.locataire_prenom || '',
        type_location: first.type_location,
        date_debut: first.date_debut,
        date_fin: first.date_fin,
        duree_mois: first.duree_mois,
        montant_mensuel_ttc: first.montant_mensuel_ttc || 0,
        montant_total_ttc: first.montant_total_ttc || 0,
        contrat_statut: first.contrat_statut,
        paiements: list.sort((a, b) => (a.numero_echeance || 0) - (b.numero_echeance || 0)),
        totalAttendu,
        totalEncaisse,
        reste: totalAttendu - totalEncaisse,
        nbTotal,
        nbPayes,
        nbRetards,
        nbPartiels,
        nbAvenir,
        sante,
        tauxEncaissement,
      };
    });
  }, [paiements]);

  // ----------------------------------------------------------------------
  // FILTRAGE
  // ----------------------------------------------------------------------

  // Échéances filtrées par période (pour les KPIs et pour savoir quels contrats afficher)
  const paiementsFiltresParPeriode = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return paiements.filter(p => {
      if (!showTermines && p.contrat_statut !== 'en_cours') return false;

      if (periode === 'tout') return true;
      if (!p.mois) return false;

      if (periode === 'ce_mois') {
        return p.mois.startsWith(now.toISOString().slice(0, 7));
      }
      if (periode === 'ce_trimestre') {
        const trimStart = new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1).toISOString().split('T')[0];
        const trimEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0).toISOString().split('T')[0];
        return p.mois >= trimStart && p.mois <= trimEnd;
      }
      if (periode === 'cette_annee') {
        return p.mois.startsWith(String(currentYear));
      }
      return true;
    });
  }, [paiements, periode, showTermines]);

  // Contrats filtrés (un contrat apparaît si au moins 1 échéance est dans la période)
  const contratsFiltres = useMemo<ContratPaiement[]>(() => {
    const locationIdsActifs = new Set(paiementsFiltresParPeriode.map(p => p.location_id));
    let result = allContrats.filter(c => locationIdsActifs.has(c.location_id));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.vehicule_immat?.toLowerCase().includes(q) ||
        c.vehicule_marque?.toLowerCase().includes(q) ||
        c.vehicule_modele?.toLowerCase().includes(q) ||
        c.locataire_nom?.toLowerCase().includes(q) ||
        c.locataire_prenom?.toLowerCase().includes(q) ||
        c.reference_contrat?.toLowerCase().includes(q)
      );
    }

    if (filterType) {
      result = result.filter(c => c.type_location === filterType);
    }

    if (filterSante) {
      result = result.filter(c => c.sante === filterSante);
    }

    // Tri
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'reference':
          cmp = (a.reference_contrat || '').localeCompare(b.reference_contrat || '');
          break;
        case 'vehicule':
          cmp = (a.vehicule_immat || '').localeCompare(b.vehicule_immat || '');
          break;
        case 'locataire':
          cmp = (a.locataire_nom || '').localeCompare(b.locataire_nom || '');
          break;
        case 'periode':
          cmp = (a.date_debut || '').localeCompare(b.date_debut || '');
          break;
        case 'encaissement':
          cmp = a.tauxEncaissement - b.tauxEncaissement;
          break;
        case 'sante': {
          const order = { risque: 0, ok: 1, avenir: 2 };
          cmp = order[a.sante] - order[b.sante];
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allContrats, paiementsFiltresParPeriode, search, filterType, filterSante, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(contratsFiltres.length / PAGE_SIZE));
  const paginatedContrats = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return contratsFiltres.slice(start, start + PAGE_SIZE);
  }, [contratsFiltres, currentPage]);

  // Reset page si filtre change
  useEffect(() => { setCurrentPage(1); }, [search, periode, filterType, filterSante, showTermines]);

  // ----------------------------------------------------------------------
  // KPIs (suivent le filtre période)
  // ----------------------------------------------------------------------

  const kpis = useMemo(() => {
    const attendu = paiementsFiltresParPeriode.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const encaisse = paiementsFiltresParPeriode.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const reste = attendu - encaisse;
    const nbPayes = paiementsFiltresParPeriode.filter(p => p.statut === 'paye').length;
    const taux = paiementsFiltresParPeriode.length > 0
      ? Math.round((nbPayes / paiementsFiltresParPeriode.length) * 100)
      : 0;

    // À risque : nombre de contrats avec santé "risque" parmi les filtrés
    const nbARisque = contratsFiltres.filter(c => c.sante === 'risque').length;

    // Mois en cours : toujours mai 2026 (ou le mois actuel)
    const moisCourant = new Date().toISOString().slice(0, 7);
    const paiementsMoisCourant = paiements.filter(p =>
      p.mois?.startsWith(moisCourant) && (showTermines || p.contrat_statut === 'en_cours')
    );
    const moisAttendu = paiementsMoisCourant.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const moisEncaisse = paiementsMoisCourant.reduce((sum, p) => sum + (p.montant_paye || 0), 0);

    return {
      attendu,
      encaisse,
      reste,
      taux,
      nbARisque,
      moisAttendu,
      moisEncaisse,
      nbEcheances: paiementsFiltresParPeriode.length,
      nbPayes,
    };
  }, [paiementsFiltresParPeriode, contratsFiltres, paiements, showTermines]);

  // ----------------------------------------------------------------------
  // POPUP CONTRAT - Mensualités filtrées
  // ----------------------------------------------------------------------

  const mensualitesFilreesPopup = useMemo<PaiementRow[]>(() => {
    if (!contratDetail) return [];
    if (filterDetail === 'tout') return contratDetail.paiements;
    if (filterDetail === 'paye') return contratDetail.paiements.filter(p => p.statut === 'paye');
    if (filterDetail === 'avenir') return contratDetail.paiements.filter(p => p.statut === 'impaye');
    if (filterDetail === 'impaye') return contratDetail.paiements.filter(p => p.statut === 'retard');
    if (filterDetail === 'partiel') return contratDetail.paiements.filter(p => p.statut === 'partiel');
    return contratDetail.paiements;
  }, [contratDetail, filterDetail]);

  // ----------------------------------------------------------------------
  // POINTAGE
  // ----------------------------------------------------------------------

  const handleOpenPointage = (p: PaiementRow) => {
    setPointageId(p.id);
    const reste = (p.montant_attendu_ttc || 0) - (p.montant_paye || 0);
    const totalAttendu = p.montant_attendu_ttc || 0;
    setPointageMontant(String(reste > 0 ? reste : totalAttendu));
    setPointageMontantType('total');
    setPointageDate(new Date().toISOString().split('T')[0]);
    setPointageDateType('today');
    setPointageMode('virement'); // pré-sélection mode le plus courant
    // Mémoire du dernier compte utilisé
    const lastCompte = localStorage.getItem(LS_LAST_COMPTE_KEY) || '';
    const compteValide = comptesBank.find(c => c.id === lastCompte);
    setPointageCompteId(compteValide ? lastCompte : (comptesBank[0]?.id || ''));
    setPointageReference('');
    setPointageNotes('');
  };

  const handleMontantTypeChange = (type: 'total' | 'custom') => {
    setPointageMontantType(type);
    if (type === 'total') {
      const paiement = paiements.find(p => p.id === pointageId);
      if (paiement) {
        const reste = (paiement.montant_attendu_ttc || 0) - (paiement.montant_paye || 0);
        const totalAttendu = paiement.montant_attendu_ttc || 0;
        setPointageMontant(String(reste > 0 ? reste : totalAttendu));
      }
    }
  };

  const handleDateTypeChange = (type: 'today' | 'yesterday' | 'custom') => {
    setPointageDateType(type);
    if (type === 'today') {
      setPointageDate(new Date().toISOString().split('T')[0]);
    } else if (type === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setPointageDate(y.toISOString().split('T')[0]);
    }
  };

  const handleValiderPointage = async () => {
    if (!pointageId) return;
    setSavingPointage(true);
    try {
      const montant = parseFloat(pointageMontant) || 0;
      const paiement = paiements.find(p => p.id === pointageId);
      if (!paiement) return;

      const totalPaye = (paiement.montant_paye || 0) + montant;
      const attendu = paiement.montant_attendu_ttc || 0;

      let newStatut = 'paye';
      if (totalPaye <= 0) newStatut = 'impaye';
      else if (totalPaye < attendu) newStatut = 'partiel';

      const { error } = await supabase
        .from('paiements_location')
        .update({
          montant_paye: totalPaye,
          date_paiement: pointageDate,
          statut: newStatut,
          mode_paiement: pointageMode || null,
          compte_bancaire_id: pointageCompteId || null,
          reference_paiement: pointageReference || null,
          pointe_par: (await supabase.auth.getUser()).data.user?.id || null,
          notes: pointageNotes ? ((paiement.notes || '') + ' | ' + pointageNotes).replace(/^\s*\|\s*/, '') : paiement.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pointageId);

      if (error) throw error;

      // Mémoriser le compte utilisé pour le prochain pointage
      if (pointageCompteId) {
        localStorage.setItem(LS_LAST_COMPTE_KEY, pointageCompteId);
      }

      // Mettre à jour les compteurs dans la table locations
      const { data: allPaiements } = await supabase
        .from('paiements_location')
        .select('id, statut, montant_paye, montant_attendu_ttc')
        .eq('location_id', paiement.location_id);

      if (allPaiements) {
        const payeesCount = allPaiements.filter(p =>
          p.id === pointageId ? newStatut === 'paye' : p.statut === 'paye'
        ).length;
        const totalEncaisse = allPaiements.reduce((sum, p) => {
          if (p.id === pointageId) return sum + totalPaye;
          return sum + (p.montant_paye || 0);
        }, 0);

        const { data: locationData } = await supabase
          .from('locations')
          .select('montant_total_ht, montant_total_ttc')
          .eq('id', paiement.location_id)
          .single();

        if (locationData) {
          await supabase
            .from('locations')
            .update({
              mensualites_payees: payeesCount,
              reste_a_payer_ttc: Math.max(0, (locationData.montant_total_ttc || 0) - totalEncaisse),
              reste_a_payer_ht: Math.max(0, (locationData.montant_total_ht || 0) - (totalEncaisse / 1.2)),
            })
            .eq('id', paiement.location_id);
        }
      }

      setPointageId(null);
      await fetchPaiements();

      // Si la popup contrat était ouverte, on la rafraîchit avec les nouvelles données
      if (contratDetail) {
        const updatedContrat = allContrats.find(c => c.location_id === contratDetail.location_id);
        if (updatedContrat) setContratDetail(updatedContrat);
      }
    } catch (err) {
      console.error('[PaiementsManager] Erreur pointage:', err);
      alert('Erreur lors du pointage');
    } finally {
      setSavingPointage(false);
    }
  };

  // ----------------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------------

  const formatDateShort = (d: string | null) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch { return d; }
  };

  const formatDateRange = (debut: string | null, fin: string | null) => {
    if (!debut) return '—';
    try {
      const d = new Date(debut);
      if (!fin) return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' → ?';
      const f = new Date(fin);
      return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} → ${f.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
    } catch { return debut; }
  };

  const formatYearRange = (debut: string | null, fin: string | null) => {
    if (!debut) return '';
    try {
      const dY = new Date(debut).getFullYear();
      if (!fin) return String(dY);
      const fY = new Date(fin).getFullYear();
      return dY === fY ? String(dY) : `${dY} → ${String(fY).slice(2)}`;
    } catch { return ''; }
  };

  const formatMoisLabel = (moisDate: string) => {
    try {
      const date = new Date(moisDate);
      return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '');
    } catch { return moisDate; }
  };

  const formatNumber = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toFixed(0);
  };

  const formatMontant = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // ----------------------------------------------------------------------
  // RENDU
  // ----------------------------------------------------------------------

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  const paiementPointage = paiements.find(p => p.id === pointageId);

  // Récap live du pointage
  const recapMontant = parseFloat(pointageMontant) || 0;
  const recapAttendu = paiementPointage?.montant_attendu_ttc || 0;
  const recapDejaPaye = paiementPointage?.montant_paye || 0;
  const recapResteApres = Math.max(0, recapAttendu - recapDejaPaye - recapMontant);
  const recapStatut = (recapDejaPaye + recapMontant) >= recapAttendu ? 'payée'
                    : (recapDejaPaye + recapMontant) > 0 ? 'partielle' : 'impayée';
  const recapDateLabel = pointageDateType === 'today' ? "aujourd'hui"
                       : pointageDateType === 'yesterday' ? 'hier'
                       : `le ${formatDateShort(pointageDate)}`;
  const recapModeLabel = MODES_PAIEMENT.find(m => m.key === pointageMode)?.label.toLowerCase() || '—';
  const recapCompteLabel = comptesBank.find(c => c.id === pointageCompteId)?.nom || '—';

  return (
    <div>
      {/* ============================================================== */}
      {/* HEADER                                                          */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paiements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contratsFiltres.length} contrat{contratsFiltres.length > 1 ? 's' : ''} · {kpis.nbEcheances} échéance{kpis.nbEcheances > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={fetchPaiements}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {/* ============================================================== */}
      {/* TOGGLE PÉRIODE                                                  */}
      {/* ============================================================== */}
      <div className="inline-flex gap-0.5 bg-white border border-gray-200 rounded-md p-0.5 mb-4">
        {(['tout', 'ce_mois', 'ce_trimestre', 'cette_annee'] as PeriodeFilter[]).map(p => (
          <button key={p} onClick={() => setPeriode(p)}
            className={'px-3.5 py-1 text-xs font-medium rounded ' +
              (periode === p ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900')
            }>
            {PERIODE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* KPIs (6 tuiles)                                                 */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <Kpi label="Attendu" value={`${formatNumber(kpis.attendu)} €`} sub={`${kpis.nbEcheances} éch.`} />
        <Kpi label="Encaissé" value={`${formatNumber(kpis.encaisse)} €`} sub={`${kpis.nbPayes} payées`} color="emerald" />
        <Kpi label="Reste" value={`${formatNumber(kpis.reste)} €`} sub="à encaisser" color="amber" />
        <Kpi label="Taux" value={`${kpis.taux}%`} color="blue" progress={kpis.taux} />
        <Kpi label="À risque" value={String(kpis.nbARisque)} sub="contrats" color="red" outline={kpis.nbARisque > 0} />
        <Kpi label="Mois en cours" value={`${formatNumber(kpis.moisEncaisse)} / ${formatNumber(kpis.moisAttendu)} €`} sub={new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} />
      </div>

      {/* ============================================================== */}
      {/* RECHERCHE + FILTRES                                             */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Rechercher par véhicule, réf TCA ou locataire..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white">
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSante} onChange={(e) => setFilterSante(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white">
          <option value="">Toutes santés</option>
          <option value="ok">OK</option>
          <option value="risque">À risque</option>
          <option value="avenir">À venir</option>
        </select>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md cursor-pointer text-sm">
          <input type="checkbox" checked={showTermines} onChange={(e) => setShowTermines(e.target.checked)} className="w-3.5 h-3.5" />
          Contrats terminés
        </label>
      </div>

      {/* ============================================================== */}
      {/* TABLEAU PRINCIPAL                                               */}
      {/* ============================================================== */}
      {paginatedContrats.length === 0 ? (
        <div className="bg-white rounded-md border border-gray-200 p-10 text-center">
          <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium mb-1">Aucun contrat à afficher</p>
          <p className="text-xs text-gray-500">Changez la période, la recherche ou les filtres</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th label="Réf" col="reference" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                <Th label="Véhicule" col="vehicule" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                <Th label="Locataire" col="locataire" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                <Th label="Période" col="periode" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                <Th label="Type" col={null} />
                <Th label="Encaissement" col="encaissement" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                <Th label="Santé" col="sante" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedContrats.map(c => {
                const sc = SANTE_CONFIG[c.sante];
                const SanteIcon = sc.icon;
                const isRisque = c.sante === 'risque';
                return (
                  <tr key={c.location_id}
                    onClick={() => { setContratDetail(c); setFilterDetail('tout'); }}
                    className={'cursor-pointer transition-colors ' + (isRisque ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50')}>
                    <td className="px-3 py-2 font-mono text-gray-500">{c.reference_contrat}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{c.vehicule_immat || '—'}</div>
                      <div className="text-[11px] text-gray-500">{c.vehicule_marque} {c.vehicule_modele}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{c.locataire_prenom} {c.locataire_nom}</td>
                    <td className="px-3 py-2 text-[11px]">
                      <div>{formatDateRange(c.date_debut, c.date_fin)}</div>
                      <div className="text-gray-400">{formatYearRange(c.date_debut, c.date_fin)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {TYPE_LABELS[c.type_location || ''] || c.type_location || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1 min-w-[40px]">
                          <div className={'h-1 rounded-full transition-all ' +
                            (c.tauxEncaissement >= 100 ? 'bg-emerald-500' :
                             c.tauxEncaissement >= 50 ? 'bg-blue-500' : 'bg-amber-500')}
                            style={{ width: c.tauxEncaissement + '%' }} />
                        </div>
                        <span className="text-[11px] font-medium text-gray-700 min-w-[35px] text-right">
                          {c.nbPayes}/{c.nbTotal}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ' + sc.bg + ' ' + sc.text}>
                        <SanteIcon className="w-2.5 h-2.5" /> {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-[11px] text-gray-600">
              {paginatedContrats.length} sur {contratsFiltres.length} contrats
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] px-2">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* POPUP CONTRAT (détail des 12 mensualités)                       */}
      {/* ============================================================== */}
      {contratDetail && (
        <div className="fixed inset-0 bg-black/45 flex items-start justify-center z-40 p-6 overflow-y-auto"
             onClick={() => setContratDetail(null)}>
          <div className="bg-white rounded-lg w-full max-w-3xl my-6" onClick={(e) => e.stopPropagation()}>
            {/* Header sticky */}
            <div className="sticky top-0 bg-white px-5 py-3 border-b border-gray-200 flex items-start justify-between rounded-t-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{contratDetail.reference_contrat}</span>
                  <p className="font-medium text-gray-900">{contratDetail.vehicule_immat} · {contratDetail.vehicule_marque} {contratDetail.vehicule_modele}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {contratDetail.locataire_prenom} {contratDetail.locataire_nom} ·
                  {' '}{TYPE_LABELS[contratDetail.type_location || ''] || contratDetail.type_location} ·
                  {' '}{contratDetail.date_debut ? new Date(contratDetail.date_debut).toLocaleDateString('fr-FR') : '—'}
                  {' → '}
                  {contratDetail.date_fin ? new Date(contratDetail.date_fin).toLocaleDateString('fr-FR') : 'Indéterminé'}
                </p>
              </div>
              <button onClick={() => setContratDetail(null)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Synthèse */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                <SyntheseCard label="Mensualité" value={`${formatMontant(contratDetail.montant_mensuel_ttc)} €`} />
                <SyntheseCard label="Total dû" value={`${formatMontant(contratDetail.totalAttendu)} €`} />
                <SyntheseCard label="Encaissé" value={`${formatMontant(contratDetail.totalEncaisse)} €`} color="emerald" />
                <SyntheseCard label="Reste" value={`${formatMontant(contratDetail.reste)} €`} color="amber" />
                <SyntheseCard label="Statut"
                  value={SANTE_CONFIG[contratDetail.sante].label}
                  color={contratDetail.sante === 'risque' ? 'red' : contratDetail.sante === 'ok' ? 'emerald' : 'slate'}
                  highlight />
              </div>

              {/* Filtres détail */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <FilterPill active={filterDetail === 'tout'} onClick={() => setFilterDetail('tout')}
                  label={`Tout (${contratDetail.nbTotal})`} />
                <FilterPill active={filterDetail === 'paye'} onClick={() => setFilterDetail('paye')}
                  label={`Encaissés (${contratDetail.nbPayes})`} icon={Check} color="emerald" />
                <FilterPill active={filterDetail === 'avenir'} onClick={() => setFilterDetail('avenir')}
                  label={`À venir (${contratDetail.paiements.filter(p => p.statut === 'impaye').length})`} icon={Clock} color="slate" />
                <FilterPill active={filterDetail === 'impaye'} onClick={() => setFilterDetail('impaye')}
                  label={`Impayés (${contratDetail.nbRetards})`} icon={AlertTriangle} color="red" />
                <FilterPill active={filterDetail === 'partiel'} onClick={() => setFilterDetail('partiel')}
                  label={`Partiels (${contratDetail.nbPartiels})`} icon={TrendingUp} color="amber" />
              </div>

              {/* Tableau des 12 mensualités */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">#</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Mois</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Attendu</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Payé</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Date paie.</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Act.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mensualitesFilreesPopup.map(p => {
                      const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.impaye;
                      const bgRow = p.statut === 'partiel' ? 'bg-amber-50'
                                  : p.statut === 'retard' ? 'bg-red-50' : '';
                      return (
                        <tr key={p.id} className={bgRow}>
                          <td className="px-2 py-1.5 text-gray-400">{p.numero_echeance}</td>
                          <td className={'px-2 py-1.5 ' + (p.statut === 'partiel' || p.statut === 'retard' ? 'font-medium' : '')}>
                            {formatMoisLabel(p.mois)}
                          </td>
                          <td className="px-2 py-1.5 text-right">{formatMontant(p.montant_attendu_ttc || 0)}</td>
                          <td className={'px-2 py-1.5 text-right ' +
                            (p.statut === 'paye' ? 'text-emerald-700' :
                             p.statut === 'partiel' ? 'text-amber-700' : 'text-gray-300')}>
                            {p.montant_paye && p.montant_paye > 0 ? formatMontant(p.montant_paye) : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-gray-500 text-[11px]">{formatDateShort(p.date_paiement)}</td>
                          <td className="px-2 py-1.5">
                            <span className={'inline-block text-[10px] px-1.5 py-0.5 rounded-full ' + sc.bg + ' ' + sc.text}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {p.statut !== 'paye' ? (
                              <button onClick={() => handleOpenPointage(p)}
                                className="inline-flex items-center justify-center w-6 h-6 text-emerald-600 hover:bg-emerald-50 border border-emerald-300 rounded transition-colors">
                                <Check className="w-3 h-3" />
                              </button>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => setContratDetail(null)}
                  className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL POINTAGE (refondu, 5 améliorations)                       */}
      {/* ============================================================== */}
      {pointageId && paiementPointage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Pointer le paiement</h3>
                <p className="text-xs text-gray-500">
                  {paiementPointage.vehicule_immat} · Éch. {paiementPointage.numero_echeance} · {formatMoisLabel(paiementPointage.mois)}
                </p>
              </div>
              <button onClick={() => setPointageId(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Récap haut */}
              <div className="bg-gray-50 rounded-md p-2.5 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Attendu</span><span className="font-medium">{formatMontant(recapAttendu)} € TTC</span></div>
                {recapDejaPaye > 0 && (
                  <div className="flex justify-between"><span className="text-gray-500">Déjà encaissé</span><span className="font-medium text-emerald-700">{formatMontant(recapDejaPaye)} €</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">Locataire</span><span>{paiementPointage.locataire_prenom} {paiementPointage.locataire_nom}</span></div>
              </div>

              {/* 1. Montant rapide */}
              <FormSection label="Montant reçu" emoji="💶">
                <div className="flex gap-1.5 mb-2">
                  <SelectBtn active={pointageMontantType === 'total'} onClick={() => handleMontantTypeChange('total')} flex>
                    Total {formatMontant(recapAttendu - recapDejaPaye)} €
                  </SelectBtn>
                  <SelectBtn active={pointageMontantType === 'custom'} onClick={() => handleMontantTypeChange('custom')} flex>
                    Personnalisé
                  </SelectBtn>
                </div>
                <div className="relative">
                  <input type="number" step="0.01" value={pointageMontant}
                    onChange={(e) => { setPointageMontant(e.target.value); setPointageMontantType('custom'); }}
                    className="w-full px-3 py-2 pr-8 text-base font-medium text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">€</span>
                </div>
              </FormSection>

              {/* 2. Date rapide */}
              <FormSection label="Date d'encaissement" emoji="📅">
                <div className="flex gap-1.5">
                  <SelectBtn active={pointageDateType === 'today'} onClick={() => handleDateTypeChange('today')} flex>Aujourd'hui</SelectBtn>
                  <SelectBtn active={pointageDateType === 'yesterday'} onClick={() => handleDateTypeChange('yesterday')} flex>Hier</SelectBtn>
                  <SelectBtn active={pointageDateType === 'custom'} onClick={() => handleDateTypeChange('custom')} flex>Choisir...</SelectBtn>
                </div>
                {pointageDateType === 'custom' && (
                  <input type="date" value={pointageDate} onChange={(e) => setPointageDate(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500" />
                )}
              </FormSection>

              {/* 3. Mode visuel */}
              <FormSection label="Mode de paiement" emoji="💳">
                <div className="grid grid-cols-5 gap-1.5">
                  {MODES_PAIEMENT.map(m => {
                    const ModeIcon = m.icon;
                    const active = pointageMode === m.key;
                    return (
                      <button key={m.key} onClick={() => setPointageMode(m.key)}
                        className={'flex flex-col items-center gap-1 px-1 py-2 border rounded-md text-[10px] transition-colors ' +
                          (active ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
                        }>
                        <ModeIcon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </FormSection>

              {/* 4. Compte mémorisé */}
              <FormSection label={`Compte bancaire${comptesBank.length > 1 ? ' · dernier utilisé pré-sélectionné' : ''}`} emoji="🏦">
                {comptesBank.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                    Aucun compte bancaire actif. Ajoutez-en un dans Admin.
                  </p>
                ) : comptesBank.length <= 4 ? (
                  <div className="flex gap-1.5">
                    {comptesBank.map(c => (
                      <button key={c.id} onClick={() => setPointageCompteId(c.id)}
                        className={'flex-1 px-2 py-1.5 border rounded-md text-left text-xs transition-colors ' +
                          (pointageCompteId === c.id ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200 hover:bg-gray-50')
                        }>
                        <div className={'font-medium ' + (pointageCompteId === c.id ? 'text-blue-700' : 'text-gray-900')}>{c.nom}</div>
                        {c.banque && <div className="text-[10px] text-gray-500">{c.banque}</div>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <select value={pointageCompteId} onChange={(e) => setPointageCompteId(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500">
                    <option value="">-- Sélectionner --</option>
                    {comptesBank.map(c => <option key={c.id} value={c.id}>{c.nom}{c.banque ? ' (' + c.banque + ')' : ''}</option>)}
                  </select>
                )}
              </FormSection>

              {/* Référence + notes (repliables) */}
              <details>
                <summary className="text-xs text-gray-500 cursor-pointer py-1 hover:text-gray-700">
                  + Ajouter référence ou notes (optionnel)
                </summary>
                <div className="space-y-2 mt-2">
                  <input type="text" value={pointageReference} onChange={(e) => setPointageReference(e.target.value)}
                    placeholder="Référence (n° chèque, ref virement...)"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500" />
                  <input type="text" value={pointageNotes} onChange={(e) => setPointageNotes(e.target.value)}
                    placeholder="Notes (optionnel)"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500" />
                </div>
              </details>

              {/* 5. Récap live */}
              {recapMontant > 0 && pointageMode && pointageCompteId && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    <strong className="font-medium">{formatMontant(recapMontant)} € reçus {recapDateLabel}</strong> par {recapModeLabel} sur {recapCompteLabel}.<br />
                    Solde après pointage : {formatMontant(recapResteApres)} € · Échéance marquée <strong>{recapStatut}</strong>
                  </div>
                </div>
              )}
              {recapMontant > 0 && recapMontant < (recapAttendu - recapDejaPaye) && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Paiement partiel — il restera {formatMontant(recapAttendu - recapDejaPaye - recapMontant)} € à encaisser
                  </p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-gray-200">
              <button onClick={() => setPointageId(null)} disabled={savingPointage}
                className="px-4 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleValiderPointage}
                disabled={savingPointage || !pointageMontant || !pointageMode || !pointageCompteId}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                {savingPointage ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</> : <><Check className="w-3.5 h-3.5" /> Valider le pointage</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================================
// SOUS-COMPOSANTS
// ========================================================================

function Kpi({ label, value, sub, color, progress, outline }: {
  label: string; value: string; sub?: string;
  color?: 'emerald' | 'amber' | 'blue' | 'red';
  progress?: number; outline?: boolean;
}) {
  const colorClass = color === 'emerald' ? 'text-emerald-600'
                   : color === 'amber' ? 'text-amber-600'
                   : color === 'blue' ? 'text-blue-600'
                   : color === 'red' ? 'text-red-600'
                   : 'text-gray-900';
  const borderClass = outline ? 'border-red-300' : 'border-gray-200';
  return (
    <div className={'bg-white border ' + borderClass + ' rounded-md p-2.5'}>
      <p className="text-[10px] text-gray-500 font-medium mb-1">{label}</p>
      <p className={'text-base font-semibold ' + colorClass}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      {progress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
          <div className="bg-blue-500 h-1 rounded-full" style={{ width: progress + '%' }} />
        </div>
      )}
    </div>
  );
}

function Th({ label, col, sortBy, sortDir, onClick }: {
  label: string; col: SortBy | null;
  sortBy?: SortBy; sortDir?: SortDir;
  onClick?: (col: SortBy) => void;
}) {
  const sortable = col !== null && onClick;
  const active = sortable && sortBy === col;
  return (
    <th
      onClick={sortable ? () => onClick!(col!) : undefined}
      className={'px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider ' +
        (sortable ? 'cursor-pointer hover:text-gray-700 select-none' : '')
      }>
      {label}{active && (sortDir === 'asc' ? ' ▲' : ' ▼')}
    </th>
  );
}

function SyntheseCard({ label, value, color, highlight }: {
  label: string; value: string;
  color?: 'emerald' | 'amber' | 'red' | 'slate';
  highlight?: boolean;
}) {
  const bg = highlight
    ? (color === 'red' ? 'bg-red-100' : color === 'emerald' ? 'bg-emerald-100' : 'bg-slate-100')
    : 'bg-gray-50';
  const textColor = highlight
    ? (color === 'red' ? 'text-red-700' : color === 'emerald' ? 'text-emerald-700' : 'text-slate-700')
    : (color === 'emerald' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-gray-900');
  return (
    <div className={'rounded-md p-2 ' + bg}>
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={'text-sm font-semibold ' + textColor}>{value}</p>
    </div>
  );
}

function FilterPill({ active, onClick, label, icon: Icon, color }: {
  active: boolean; onClick: () => void; label: string;
  icon?: any; color?: 'emerald' | 'red' | 'amber' | 'slate';
}) {
  const colorActive = color === 'emerald' ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                    : color === 'red'     ? 'bg-red-100 border-red-400 text-red-700'
                    : color === 'amber'   ? 'bg-amber-100 border-amber-400 text-amber-700'
                    : color === 'slate'   ? 'bg-slate-100 border-slate-400 text-slate-700'
                    : 'bg-blue-50 border-blue-400 text-blue-700';
  return (
    <button onClick={onClick}
      className={'inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] border rounded-full transition-colors ' +
        (active ? colorActive : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
      }>
      {Icon && <Icon className="w-2.5 h-2.5" />}{label}
    </button>
  );
}

function FormSection({ label, emoji, children }: {
  label: string; emoji: string; children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">{emoji} {label}</p>
      {children}
    </div>
  );
}

function SelectBtn({ active, onClick, flex, children }: {
  active: boolean; onClick: () => void; flex?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={'px-3 py-1.5 text-xs border rounded-md transition-colors ' + (flex ? 'flex-1 ' : '') +
        (active ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
      }>
      {children}
    </button>
  );
}