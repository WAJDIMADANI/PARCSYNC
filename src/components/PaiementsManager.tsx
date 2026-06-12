import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Banknote, Search, RefreshCw, X, Check, Loader2, AlertTriangle,
  Clock, CheckCircle2, TrendingUp, Building2, Receipt, CreditCard,
  Repeat, Coins, Gift, ChevronLeft, ChevronRight, Calendar, Wallet, Hash,
  User, StickyNote, ArrowUpLeft, FileText, Mail, CalendarRange, CalendarDays, PieChart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AlertesParcEncart } from './AlertesParcEncart';
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
  mode_paiement: string | null;
  compte_bancaire_id: string | null;
  reference_paiement: string | null;
  pointe_par: string | null;
  updated_at: string | null;
  facture_generee_at?: string | null;
  montant_offert?: number | null;
  avoir_genere_at?: string | null;
  vehicule_immat: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_ref_tca: string | null;
  locataire_nom: string | null;
  locataire_prenom: string | null;
  locataire_email: string | null;
  type_location: string | null;
  contrat_statut: string | null;
  vehicule_id: string | null;
  reference_contrat: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_mois: number | null;
  montant_mensuel_ttc: number | null;
  montant_total_ttc: number | null;
  mensualites_payees: number | null;
  jour_paiement: number | null;
  // 🆕 Apport (depuis la table locations)
  apport_initial: number | null;
  date_apport: string | null;
  compte_apport_id: string | null;
}

interface ContratPaiement {
  location_id: string;
  reference_contrat: string;
  vehicule_id: string | null;
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
  totalAttendu: number;        // 🆕 inclut l'apport
  totalEncaisse: number;       // 🆕 inclut l'apport si versé
  reste: number;
  nbTotal: number;             // 🆕 inclut l'apport comme +1 échéance virtuelle
  nbPayes: number;             // 🆕 inclut l'apport comme +1 si versé
  nbRetards: number;
  nbPartiels: number;
  nbAvenir: number;
  sante: 'ok' | 'risque' | 'avenir';
  tauxEncaissement: number;
  // 🆕 Apport
  apport_initial: number;
  date_apport: string | null;
  compte_apport_id: string | null;
  hasApport: boolean;
  apportVerse: boolean;
}

type PeriodeFilter = 'tout' | 'ce_mois' | 'ce_trimestre' | 'cette_annee' | 'custom';
type CustomMode = 'mois' | 'trimestre' | 'annee' | 'plage' | null;
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
  { key: 'offert',      label: 'Offert',   icon: Gift },
];

const MODES_LABELS: Record<string, string> = {
  virement: 'Virement bancaire',
  cheque: 'Chèque',
  especes: 'Espèces',
  cb: 'Carte bancaire',
  prelevement: 'Prélèvement automatique',
  offert: 'Offert (geste commercial)',
  autre: 'Autre',
};

const PERIODE_LABELS: Record<Exclude<PeriodeFilter, 'custom'>, string> = {
  tout: 'Tout',
  ce_mois: 'Ce mois',
  ce_trimestre: 'Ce trimestre',
  cette_annee: 'Cette année',
};

const LS_LAST_COMPTE_KEY = 'parc_sync_last_compte_id';
const PAGE_SIZE = 50;

const ANNEE_MIN = 2024;
const ANNEE_MAX = 2028;

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// 🆕 Types LV pour intégrer l'apport
const TYPES_LV = ['location_vente_particulier', 'location_vente_societe'];

// ========================================================================
// HELPERS PÉRIODE
// ========================================================================

interface PeriodeBornes {
  debut: string;
  fin: string;
  label: string;
}

function bornesPeriode(
  periode: PeriodeFilter,
  customMode: CustomMode,
  customMois: string,
  customTrimestre: string,
  customAnnee: string,
  customPlageStart: string,
  customPlageEnd: string
): PeriodeBornes | null {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth();

  if (periode === 'tout') return null;

  if (periode === 'ce_mois') {
    const d = new Date(yyyy, mm, 1);
    const f = new Date(yyyy, mm + 1, 0);
    return {
      debut: d.toISOString().split('T')[0],
      fin: f.toISOString().split('T')[0],
      label: `${MOIS_LABELS[mm]} ${yyyy}`,
    };
  }

  if (periode === 'ce_trimestre') {
    const tStart = Math.floor(mm / 3) * 3;
    const d = new Date(yyyy, tStart, 1);
    const f = new Date(yyyy, tStart + 3, 0);
    return {
      debut: d.toISOString().split('T')[0],
      fin: f.toISOString().split('T')[0],
      label: `T${Math.floor(mm / 3) + 1} ${yyyy}`,
    };
  }

  if (periode === 'cette_annee') {
    return {
      debut: `${yyyy}-01-01`,
      fin: `${yyyy}-12-31`,
      label: String(yyyy),
    };
  }

  if (periode === 'custom') {
    if (customMode === 'mois' && customMois) {
      const [y, m] = customMois.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      const f = new Date(y, m, 0);
      return {
        debut: d.toISOString().split('T')[0],
        fin: f.toISOString().split('T')[0],
        label: `${MOIS_LABELS[m - 1]} ${y}`,
      };
    }
    if (customMode === 'trimestre' && customTrimestre) {
      const [y, t] = customTrimestre.split('-T');
      const yy = Number(y);
      const tt = Number(t);
      const tStart = (tt - 1) * 3;
      const d = new Date(yy, tStart, 1);
      const f = new Date(yy, tStart + 3, 0);
      return {
        debut: d.toISOString().split('T')[0],
        fin: f.toISOString().split('T')[0],
        label: `T${tt} ${yy}`,
      };
    }
    if (customMode === 'annee' && customAnnee) {
      return {
        debut: `${customAnnee}-01-01`,
        fin: `${customAnnee}-12-31`,
        label: customAnnee,
      };
    }
    if (customMode === 'plage' && customPlageStart && customPlageEnd) {
      const fmt = (s: string) => {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y.slice(2)}`;
      };
      return {
        debut: customPlageStart,
        fin: customPlageEnd,
        label: `${fmt(customPlageStart)} → ${fmt(customPlageEnd)}`,
      };
    }
    return null;
  }

  return null;
}

// 🆕 Helper : un contrat LV a-t-il un apport déclaré ?
function hasApportDeclare(p: { type_location: string | null; apport_initial: number | null }): boolean {
  return TYPES_LV.includes(p.type_location || '')
    && p.apport_initial !== null
    && p.apport_initial > 0;
}

// 🆕 Helper : un apport est-il considéré comme versé ?
// Critère validé : compte_apport_id renseigné
function apportEstVerse(p: { compte_apport_id: string | null }): boolean {
  return !!p.compte_apport_id;
}

// ========================================================================
// COMPOSANT PRINCIPAL
// ========================================================================

interface PaiementsManagerProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function PaiementsManager({ onNavigate }: PaiementsManagerProps = {}) {
  const [paiements, setPaiements] = useState<PaiementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [periode, setPeriode] = useState<PeriodeFilter>('tout');
  const [customMode, setCustomMode] = useState<CustomMode>(null);
  const [customMois, setCustomMois] = useState('');
  const [customTrimestre, setCustomTrimestre] = useState('');
  const [customAnnee, setCustomAnnee] = useState('');
  const [customPlageStart, setCustomPlageStart] = useState('');
  const [customPlageEnd, setCustomPlageEnd] = useState('');

  const [showTermines, setShowTermines] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSante, setFilterSante] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('reference');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [contratDetail, setContratDetail] = useState<ContratPaiement | null>(null);
  const [filterDetail, setFilterDetail] = useState<FilterDetail>('tout');

  const [paiementDetail, setPaiementDetail] = useState<PaiementRow | null>(null);
  const [depointing, setDepointing] = useState(false);
  const [generatingFacture, setGeneratingFacture] = useState(false);
  const [depointConfirm, setDepointConfirm] = useState(false);
  const depointResolveRef = useRef<((v: boolean) => void) | null>(null);
  const [factureSuccess, setFactureSuccess] = useState<string | null>(null);
  const [offrirSolde, setOffrirSolde] = useState(false);
  const [montantOffert, setMontantOffert] = useState('');

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

  const [comptesBank, setComptesBank] = useState<{ id: string; nom: string; banque: string | null }[]>([]);

  // ----------------------------------------------------------------------
  // CHARGEMENT
  // ----------------------------------------------------------------------

  useEffect(() => {
    supabase.from('comptes_bancaires').select('id, nom, banque').eq('actif', true).order('nom')
      .then(({ data }) => setComptesBank(data || []));
  }, []);

  useEffect(() => { fetchPaiements(); }, []);

  const fetchPaiements = async (): Promise<PaiementRow[]> => {
    setLoading(true);
    try {
      // Pagination pour contourner le max_rows serveur PostgREST (plafond ~1000-2000 lignes/requête)
      const PAGE_SIZE = 1000;

      // Requête 1 paginée : paiements sans jointures
      let allPaiementsData: any[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('paiements_location')
          .select(`
            id, location_id, numero_echeance, mois,
            montant_attendu_ht, montant_attendu_ttc,
            montant_paye, date_paiement, statut, notes,
            mode_paiement, compte_bancaire_id, reference_paiement,
            pointe_par, updated_at, facture_generee_at, montant_offert, avoir_genere_at
          `)
          .order('mois', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        allPaiementsData = allPaiementsData.concat(data || []);
        if ((data || []).length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      const paiementsData = allPaiementsData;

      // Requête 2 paginée : locations avec vehicule + locataire
      let allLocationsData: any[] = [];
      offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('locations')
          .select(`
            id, type_location, statut, reference_contrat, date_debut, date_fin,
            duree_mois, montant_mensuel_ttc, montant_total_ttc, mensualites_payees, jour_paiement,
            apport_initial, date_apport, compte_apport_id,
            vehicule:vehicule_id(id, immatriculation, marque, modele, ref_tca),
            locataire:locataire_id(nom, prenom, email)
          `)
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        allLocationsData = allLocationsData.concat(data || []);
        if ((data || []).length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      const locationsData = allLocationsData;

      // Map indexée par location.id pour lookup O(1)
      const locationsMap = new Map<string, any>();
      (locationsData || []).forEach((loc: any) => locationsMap.set(loc.id, loc));

      const today = new Date().toISOString().split('T')[0];
      const rows: PaiementRow[] = (paiementsData || []).map((p: any) => {
        let statut = p.statut;

        const loc = locationsMap.get(p.location_id);

        // Calcul de la date prévue réelle = mois + jour_paiement (avec gestion mois courts)
        const jourPaiement = loc?.jour_paiement || 1;
        let datePrevueStr = p.mois;
        if (p.mois) {
          const moisDate = new Date(p.mois);
          const lastDay = new Date(moisDate.getFullYear(), moisDate.getMonth() + 1, 0).getDate();
          const jourEffectif = Math.min(jourPaiement, lastDay);
          const datePrevue = new Date(moisDate.getFullYear(), moisDate.getMonth(), jourEffectif);
          datePrevueStr = datePrevue.toISOString().split('T')[0];
        }

        // Recalcul du statut basé sur la date prévue (recalcule à chaque fetch)
        // - Si non payé (impaye OU retard) ET date prévue < aujourd'hui → retard
        // - Si non payé (impaye OU retard) ET date prévue >= aujourd'hui → impaye (à venir)
        // - Les statuts 'paye' et 'partiel' ne sont JAMAIS modifiés
        if (statut === 'impaye' || statut === 'retard') {
          statut = datePrevueStr < today ? 'retard' : 'impaye';
        }

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
          mode_paiement: p.mode_paiement,
          compte_bancaire_id: p.compte_bancaire_id,
          reference_paiement: p.reference_paiement,
          pointe_par: p.pointe_par,
          updated_at: p.updated_at,
          vehicule_immat: loc?.vehicule?.immatriculation || null,
          vehicule_marque: loc?.vehicule?.marque || null,
          vehicule_modele: loc?.vehicule?.modele || null,
          vehicule_ref_tca: loc?.vehicule?.ref_tca || null,
          locataire_nom: loc?.locataire?.nom || null,
          locataire_prenom: loc?.locataire?.prenom || null,
          locataire_email: loc?.locataire?.email || null,
          type_location: loc?.type_location || null,
          contrat_statut: loc?.statut || null,
          vehicule_id: loc?.vehicule?.id || null,
          reference_contrat: loc?.reference_contrat || null,
          date_debut: loc?.date_debut || null,
          date_fin: loc?.date_fin || null,
          duree_mois: loc?.duree_mois || null,
          montant_mensuel_ttc: loc?.montant_mensuel_ttc || null,
          montant_total_ttc: loc?.montant_total_ttc || null,
          mensualites_payees: loc?.mensualites_payees || null,
          jour_paiement: loc?.jour_paiement || null,
         apport_initial: loc?.apport_initial ?? null,
          date_apport: loc?.date_apport ?? null,
          compte_apport_id: loc?.compte_apport_id ?? null,
          montant_offert: p.montant_offert ?? null,
          avoir_genere_at: p.avoir_genere_at ?? null,
        };
      });

      setPaiements(rows);
      console.log('[PaiementsManager] Total paiements chargés:', rows.length);
      return rows;
    } catch (err) {
      console.error('[PaiementsManager] Erreur fetch:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // CALCUL CONTRAT — 🆕 INTÈGRE L'APPORT
  // ----------------------------------------------------------------------

  const calculerContrat = (location_id: string, rows: PaiementRow[]): ContratPaiement | null => {
    const list = rows.filter(p => p.location_id === location_id);
    if (list.length === 0) return null;
    const first = list[0];
    const today = new Date().toISOString().split('T')[0];

    // Calculs de base sur les paiements_location
 // 🆕 Total attendu = durée × mensualité (règle métier), avec fallback sur somme en base
    const totalAttenduLoyers = (first.duree_mois && first.montant_mensuel_ttc)
      ? first.duree_mois * first.montant_mensuel_ttc
      : list.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const totalEncaisseLoyers = list.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    // 🆕 Nb d'échéances théoriques = durée du contrat, avec fallback sur nb réel en base
    const nbLoyers = first.duree_mois || list.length;
    // 🆕 Nb d'échéances "couvertes" calculé via montant_encaissé / mensualité (gère trop-payé)
    const nbPayesLoyers = (first.montant_mensuel_ttc && first.montant_mensuel_ttc > 0)
      ? Math.min(Math.floor(totalEncaisseLoyers / first.montant_mensuel_ttc), nbLoyers)
      : list.filter(p => p.statut === 'paye').length;
    const nbRetards = list.filter(p => p.statut === 'retard').length;
    const nbPartiels = list.filter(p => p.statut === 'partiel').length;
    const nbEchues = list.filter(p => p.mois && p.mois <= today).length;
    const nbAvenir = nbLoyers - nbEchues;

    // 🆕 Apport (intégré dans les totaux)
    const hasApport = hasApportDeclare(first);
    const apportVerse = hasApport && apportEstVerse(first);
    const apportMontant = hasApport ? Number(first.apport_initial) : 0;

    // 🆕 Totaux globaux (loyers + apport)
    const totalAttendu = totalAttenduLoyers + apportMontant;
    const totalEncaisse = totalEncaisseLoyers + (apportVerse ? apportMontant : 0);
    const nbTotal = nbLoyers + (hasApport ? 1 : 0);
    const nbPayes = nbPayesLoyers + (apportVerse ? 1 : 0);

    // Santé : si apport non versé, c'est à risque (sauf si le contrat est encore à venir)
    let sante: 'ok' | 'risque' | 'avenir';
    if (nbRetards > 0 || nbPartiels > 0) sante = 'risque';
    else if (nbEchues === 0 && (!hasApport || apportVerse)) sante = 'avenir';
    else sante = 'ok';

    const tauxEncaissement = totalAttendu > 0 ? Math.round((totalEncaisse / totalAttendu) * 100) : 0;

    return {
      location_id,
      reference_contrat: first.reference_contrat || location_id.slice(0, 6).toUpperCase(),
      vehicule_id: first.vehicule_id,
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
      // 🆕 Apport
      apport_initial: apportMontant,
      date_apport: first.date_apport,
      compte_apport_id: first.compte_apport_id,
      hasApport,
      apportVerse,
    };
  };

  const allContrats = useMemo<ContratPaiement[]>(() => {
    const locationIds = Array.from(new Set(paiements.map(p => p.location_id)));
    return locationIds
      .map(id => calculerContrat(id, paiements))
      .filter((c): c is ContratPaiement => c !== null);
  }, [paiements]);

  // ----------------------------------------------------------------------
  // BORNES DE PÉRIODE
  // ----------------------------------------------------------------------

  const bornes = useMemo(
    () => bornesPeriode(periode, customMode, customMois, customTrimestre, customAnnee, customPlageStart, customPlageEnd),
    [periode, customMode, customMois, customTrimestre, customAnnee, customPlageStart, customPlageEnd]
  );

  // ----------------------------------------------------------------------
  // FILTRAGE
  // ----------------------------------------------------------------------

  const paiementsFiltresAttendu = useMemo(() => {
    return paiements.filter(p => {
      if (!showTermines && p.contrat_statut !== 'en_cours') return false;
      if (!bornes) return true;
      if (!p.mois) return false;
      return p.mois >= bornes.debut && p.mois <= bornes.fin;
    });
  }, [paiements, bornes, showTermines]);

  const paiementsFiltresEncaisse = useMemo(() => {
    return paiements.filter(p => {
      if (!showTermines && p.contrat_statut !== 'en_cours') return false;
      if (!p.date_paiement) return false;
      if (!bornes) return true;
      return p.date_paiement >= bornes.debut && p.date_paiement <= bornes.fin;
    });
  }, [paiements, bornes, showTermines]);

  // 🆕 Apports inclus dans les filtres période
  // Pour l'attendu : un apport "appartient" à la période si date_debut du contrat est dans la période
  // Pour l'encaissé : un apport "appartient" à la période si date_apport est dans la période
  const contratsAvecApportFiltrésAttendu = useMemo(() => {
    return allContrats.filter(c => {
      if (!c.hasApport) return false;
      if (!showTermines && c.contrat_statut !== 'en_cours') return false;
      if (!bornes) return true;
      if (!c.date_debut) return false;
      // L'apport est attendu au mois de date_debut du contrat
      const moisApport = c.date_debut.substring(0, 7) + '-01';
      return moisApport >= bornes.debut && moisApport <= bornes.fin;
    });
  }, [allContrats, bornes, showTermines]);

  const contratsAvecApportFiltrésEncaisse = useMemo(() => {
    return allContrats.filter(c => {
      if (!c.hasApport || !c.apportVerse) return false;
      if (!showTermines && c.contrat_statut !== 'en_cours') return false;
      if (!c.date_apport) return false;
      if (!bornes) return true;
      return c.date_apport >= bornes.debut && c.date_apport <= bornes.fin;
    });
  }, [allContrats, bornes, showTermines]);

  const contratsFiltres = useMemo<ContratPaiement[]>(() => {
    const locationIdsActifs = new Set(paiementsFiltresAttendu.map(p => p.location_id));
    // 🆕 On inclut aussi les contrats dont l'apport tombe dans la période
    contratsAvecApportFiltrésAttendu.forEach(c => locationIdsActifs.add(c.location_id));

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

    if (filterType) result = result.filter(c => c.type_location === filterType);
    if (filterSante) result = result.filter(c => c.sante === filterSante);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'reference': cmp = (a.reference_contrat || '').localeCompare(b.reference_contrat || ''); break;
        case 'vehicule':  cmp = (a.vehicule_immat || '').localeCompare(b.vehicule_immat || ''); break;
        case 'locataire': cmp = (a.locataire_nom || '').localeCompare(b.locataire_nom || ''); break;
        case 'periode':   cmp = (a.date_debut || '').localeCompare(b.date_debut || ''); break;
        case 'encaissement': cmp = a.tauxEncaissement - b.tauxEncaissement; break;
        case 'sante': {
          const order = { risque: 0, ok: 1, avenir: 2 };
          cmp = order[a.sante] - order[b.sante];
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allContrats, paiementsFiltresAttendu, contratsAvecApportFiltrésAttendu, search, filterType, filterSante, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(contratsFiltres.length / PAGE_SIZE));
  const paginatedContrats = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return contratsFiltres.slice(start, start + PAGE_SIZE);
  }, [contratsFiltres, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search, periode, customMode, customMois, customTrimestre, customAnnee, customPlageStart, customPlageEnd, filterType, filterSante, showTermines]);

  // ----------------------------------------------------------------------
  // KPIs — 🆕 Intègrent les apports
  // ----------------------------------------------------------------------

  const kpis = useMemo(() => {
    // Attendu : loyers de la période + apports dont la date_debut est dans la période
    const attenduLoyers = paiementsFiltresAttendu.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const attenduApports = contratsAvecApportFiltrésAttendu.reduce((sum, c) => sum + c.apport_initial, 0);
    const attendu = attenduLoyers + attenduApports;

    const nbLoyers = paiementsFiltresAttendu.length;
    const nbApports = contratsAvecApportFiltrésAttendu.length;
    const nbEcheances = nbLoyers + nbApports;

    // Encaissé : paiements reçus dans la période + apports versés dans la période
    const encaisseLoyers = paiementsFiltresEncaisse.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const encaisseApports = contratsAvecApportFiltrésEncaisse.reduce((sum, c) => sum + c.apport_initial, 0);
    const encaisse = encaisseLoyers + encaisseApports;

    const nbPaiementsRecus = paiementsFiltresEncaisse.length + contratsAvecApportFiltrésEncaisse.length;

    // Reste : Attendu - (loyers payés sur Attendu) - (apports versés sur Attendu)
    const encaisseSurAttenduLoyers = paiementsFiltresAttendu.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const encaisseSurAttenduApports = contratsAvecApportFiltrésAttendu
      .filter(c => c.apportVerse)
      .reduce((sum, c) => sum + c.apport_initial, 0);
    const reste = Math.max(0, attendu - encaisseSurAttenduLoyers - encaisseSurAttenduApports);

    // Taux : pourcentage d'échéances "payées" (loyer payé OU apport versé) sur le jeu Attendu
    const nbPayesSurAttenduLoyers = paiementsFiltresAttendu.filter(p => p.statut === 'paye').length;
    const nbPayesSurAttenduApports = contratsAvecApportFiltrésAttendu.filter(c => c.apportVerse).length;
    const nbPayesSurAttendu = nbPayesSurAttenduLoyers + nbPayesSurAttenduApports;
    const taux = nbEcheances > 0 ? Math.round((nbPayesSurAttendu / nbEcheances) * 100) : 0;

    const nbARisque = contratsFiltres.filter(c => c.sante === 'risque').length;

    const moisCourant = new Date().toISOString().slice(0, 7);
    const paiementsMoisCourant = paiements.filter(p =>
      p.mois?.startsWith(moisCourant) && (showTermines || p.contrat_statut === 'en_cours')
    );
    const moisAttenduLoyers = paiementsMoisCourant.reduce((sum, p) => sum + (p.montant_attendu_ttc || 0), 0);
    const moisEncaisseLoyers = paiementsMoisCourant.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    // Apports du mois courant
    const apportsMoisCourant = allContrats.filter(c =>
      c.hasApport && c.date_debut?.startsWith(moisCourant) && (showTermines || c.contrat_statut === 'en_cours')
    );
    const moisAttendu = moisAttenduLoyers + apportsMoisCourant.reduce((sum, c) => sum + c.apport_initial, 0);
    const moisEncaisse = moisEncaisseLoyers + apportsMoisCourant.filter(c => c.apportVerse).reduce((sum, c) => sum + c.apport_initial, 0);

    return { attendu, encaisse, reste, taux, nbARisque, moisAttendu, moisEncaisse, nbEcheances, nbPayes: nbPayesSurAttendu, nbPaiementsRecus };
  }, [paiementsFiltresAttendu, paiementsFiltresEncaisse, contratsAvecApportFiltrésAttendu, contratsAvecApportFiltrésEncaisse, contratsFiltres, paiements, allContrats, showTermines]);

  const moisCourantStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const kpisMois = useMemo(() => {
    const paiementsMois = paiements.filter(p =>
      p.mois?.startsWith(moisCourantStr) && p.contrat_statut === 'en_cours'
    );
    const attendu = paiementsMois.reduce((s, p) => s + (p.montant_attendu_ttc || 0), 0);
    const encaisse = paiementsMois.reduce((s, p) => s + (p.montant_paye || 0), 0);
    const reste = Math.max(0, attendu - encaisse);
    const nbEcheances = paiementsMois.length;
    const nbPayes = paiementsMois.filter(p => p.montant_paye && p.montant_paye > 0).length;
    const nbRestants = paiementsMois.filter(p => p.statut !== 'paye').length;
    const taux = attendu > 0 ? Math.round((encaisse / attendu) * 100) : 0;
    return { attendu, encaisse, reste, nbEcheances, nbPayes, nbRestants, taux };
  }, [paiements, moisCourantStr]);

  const kpisRetards = useMemo(() => {
    const retards = paiements.filter(p =>
      p.statut === 'retard' && p.contrat_statut === 'en_cours'
    );
    const montant = retards.reduce((s, p) => s + ((p.montant_attendu_ttc || 0) - (p.montant_paye || 0)), 0);
    return { montant, nb: retards.length };
  }, [paiements]);

  const kpisParType = useMemo(() => {
    const types = ['location_vente_societe', 'location_vente_particulier', 'location_pure', 'loa'];
    const result: Record<string, { nbContrats: number; attenduMois: number; encaisseMois: number; nbRetards: number }> = {} as Record<string, { nbContrats: number; attenduMois: number; encaisseMois: number; nbRetards: number }>;
    types.forEach(t => {
      const contratsType = allContrats.filter(c => c.type_location === t && c.contrat_statut === 'en_cours');
      const nbContrats = contratsType.length;
      const paiementsTypeMois = paiements.filter(p =>
        p.type_location === t &&
        p.contrat_statut === 'en_cours' &&
        p.mois?.startsWith(moisCourantStr)
      );
      const attenduMois = paiementsTypeMois.reduce((s, p) => s + (p.montant_attendu_ttc || 0), 0);
      const encaisseMois = paiementsTypeMois.reduce((s, p) => s + (p.montant_paye || 0), 0);
      const nbRetards = contratsType.reduce((s, c) => s + c.nbRetards, 0);
      result[t] = { nbContrats, attenduMois, encaisseMois, nbRetards };
    });
    return result;
  }, [paiements, allContrats, moisCourantStr]);

  // ----------------------------------------------------------------------
  // POPUP CONTRAT
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
  // HANDLERS PÉRIODE
  // ----------------------------------------------------------------------

  const setPeriodeRapide = (p: Exclude<PeriodeFilter, 'custom'>) => {
    setPeriode(p);
    setCustomMode(null);
    setCustomMois('');
    setCustomTrimestre('');
    setCustomAnnee('');
    setCustomPlageStart('');
    setCustomPlageEnd('');
  };

  const activerCustom = (mode: CustomMode) => {
    setPeriode('custom');
    setCustomMode(mode);
    if (mode !== 'mois') setCustomMois('');
    if (mode !== 'trimestre') setCustomTrimestre('');
    if (mode !== 'annee') setCustomAnnee('');
    if (mode !== 'plage') { setCustomPlageStart(''); setCustomPlageEnd(''); }
  };

  const resetCustom = () => {
    setPeriode('tout');
    setCustomMode(null);
    setCustomMois('');
    setCustomTrimestre('');
    setCustomAnnee('');
    setCustomPlageStart('');
    setCustomPlageEnd('');
  };

  const optionsMois = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let y = ANNEE_MAX; y >= ANNEE_MIN; y--) {
      for (let m = 11; m >= 0; m--) {
        const value = `${y}-${String(m + 1).padStart(2, '0')}`;
        options.push({ value, label: `${MOIS_LABELS[m]} ${y}` });
      }
    }
    return options;
  }, []);

  const optionsTrimestres = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let y = ANNEE_MAX; y >= ANNEE_MIN; y--) {
      for (let t = 4; t >= 1; t--) {
        options.push({ value: `${y}-T${t}`, label: `T${t} ${y}` });
      }
    }
    return options;
  }, []);

  const optionsAnnees = useMemo(() => {
    const options: string[] = [];
    for (let y = ANNEE_MAX; y >= ANNEE_MIN; y--) options.push(String(y));
    return options;
  }, []);

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
    setPointageMode('virement');
    const lastCompte = localStorage.getItem(LS_LAST_COMPTE_KEY) || '';
    const compteValide = comptesBank.find(c => c.id === lastCompte);
    setPointageCompteId(compteValide ? lastCompte : (comptesBank[0]?.id || ''));
    setPointageReference('');
  setPointageNotes('');
    setOffrirSolde(false);
    setMontantOffert('');
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
      if (!paiement) {
        console.error('[Pointage] Paiement introuvable pour id:', pointageId);
        alert('Erreur : paiement introuvable, veuillez actualiser la page.');
        return;
      }

     const montantOffertNum = offrirSolde ? (parseFloat(montantOffert) || 0) : 0;
      console.log('[Debug] pointageId:', pointageId, '| paiements count:', paiements.length, '| found:', paiements.find(p => p.id === pointageId));
      const totalPaye = (paiement.montant_paye || 0) + montant;
      const attendu = paiement.montant_attendu_ttc || 0;
      const totalAvecOffert = totalPaye + montantOffertNum;

    let newStatut = 'paye';
      if (totalAvecOffert <= 0) newStatut = 'impaye';
      else if (totalAvecOffert < attendu && !offrirSolde) newStatut = 'partiel';

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
          montant_offert: montantOffertNum > 0 ? montantOffertNum : null,
          notes: pointageNotes ? ((paiement.notes || '') + ' | ' + pointageNotes).replace(/^\s*\|\s*/, '') : paiement.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pointageId);

      if (error) throw error;

  if (pointageCompteId) localStorage.setItem(LS_LAST_COMPTE_KEY, pointageCompteId);

      const { data: allPaiements } = await supabase
        .from('paiements_location')
        .select('id, statut, montant_paye, montant_attendu_ttc, numero_echeance')
        .eq('location_id', paiement.location_id)
        .order('numero_echeance', { ascending: true });

      if (allPaiements) {
        // Mois restants non payés (hors échéance courante)
        const moisRestants = allPaiements.filter(p =>
          p.id !== pointageId &&
          (p.statut === 'impaye' || p.statut === 'retard')
        );

        // Surplus = ce qui dépasse le montant attendu de ce mois
        const surplus = Math.max(0, totalPaye - (paiement.montant_attendu_ttc || 0));

        if (surplus > 0.01 && moisRestants.length > 0) {
          // Redistribuer le surplus sur les mois restants
          const totalRestantBrut = moisRestants.reduce((sum, p) => sum + (Number(p.montant_attendu_ttc) || 0), 0);
          const nouveauTotal = Math.max(0, totalRestantBrut - surplus);
          const nouveauMontant = Math.round((nouveauTotal / moisRestants.length) * 100) / 100;

          for (const mp of moisRestants) {
            await supabase
              .from('paiements_location')
              .update({
                montant_attendu_ttc: nouveauMontant,
                montant_attendu_ht: Math.round((nouveauMontant / 1.20) * 100) / 100,
              })
              .eq('id', mp.id);
          }

          await supabase
            .from('locations')
            .update({
              montant_mensuel_ttc: nouveauMontant,
              montant_mensuel_ht: Math.round((nouveauMontant / 1.20) * 100) / 100,
              reste_a_payer_ttc: Math.round(nouveauTotal * 100) / 100,
              reste_a_payer_ht: Math.round((nouveauTotal / 1.20) * 100) / 100,
            })
            .eq('id', paiement.location_id);

        } else {
          // Pas de surplus — comportement normal
          const totalEncaisse = allPaiements.reduce((sum, p) => {
            if (p.id === pointageId) return sum + totalPaye;
            return sum + (p.montant_paye || 0);
          }, 0);

     const { data: locationData } = await supabase
          .from('locations')
          .select('montant_total_ht, montant_total_ttc, duree_mois')
          .eq('id', paiementDetail.location_id)
          .single();

        if (locationData) {
          // Recalcul mensualité originale = total / durée
          const mensualiteOriginale = (locationData.duree_mois && locationData.duree_mois > 0)
            ? Math.round((locationData.montant_total_ttc / locationData.duree_mois) * 100) / 100
            : null;
          const mensualiteOriginaleHT = mensualiteOriginale
            ? Math.round((mensualiteOriginale / 1.20) * 100) / 100
            : null;

          // Restaurer montant_attendu_ttc sur tous les mois non payés
          if (mensualiteOriginale) {
            const { data: moisNonPaies } = await supabase
              .from('paiements_location')
              .select('id')
              .eq('location_id', paiementDetail.location_id)
              .in('statut', ['impaye', 'retard']);

            if (moisNonPaies && moisNonPaies.length > 0) {
              for (const mp of moisNonPaies) {
                await supabase
                  .from('paiements_location')
                  .update({
                    montant_attendu_ttc: mensualiteOriginale,
                    montant_attendu_ht: mensualiteOriginaleHT,
                  })
                  .eq('id', mp.id);
              }
            }
          }

          await supabase
            .from('locations')
            .update({
              mensualites_payees: payeesCount,
              montant_mensuel_ttc: mensualiteOriginale || locationData.montant_total_ttc,
              montant_mensuel_ht: mensualiteOriginaleHT || locationData.montant_total_ht,
              reste_a_payer_ttc: Math.max(0, (locationData.montant_total_ttc || 0) - totalEncaisse),
              reste_a_payer_ht: Math.max(0, (locationData.montant_total_ht || 0) - (totalEncaisse / 1.2)),
            })
            .eq('id', paiementDetail.location_id);
        }
        }

        // mensualites_payees toujours mis à jour
        const payeesCount = allPaiements.filter(p =>
          p.id === pointageId ? newStatut === 'paye' : p.statut === 'paye'
        ).length;
        await supabase
          .from('locations')
          .update({ mensualites_payees: payeesCount })
          .eq('id', paiement.location_id);
      }

      setPointageId(null);

      const freshRows = await fetchPaiements();
      if (contratDetail) {
        const updatedContrat = calculerContrat(contratDetail.location_id, freshRows);
        if (updatedContrat) setContratDetail(updatedContrat);
      }
    } catch (err) {
      console.error('[PaiementsManager] Erreur pointage:', err);
      alert('Erreur lors du pointage');
    } finally {
      setSavingPointage(false);
    }
  };

  const handleDepointer = async () => {
    if (!paiementDetail) return;
    if (!await new Promise<boolean>(resolve => {
      setDepointConfirm(true);
      depointResolveRef.current = resolve;
    })) return;

    setDepointing(true);
    try {
      const { error } = await supabase
        .from('paiements_location')
        .update({
          montant_paye: 0,
          date_paiement: null,
          statut: 'impaye',
          mode_paiement: null,
          compte_bancaire_id: null,
          reference_paiement: null,
          pointe_par: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paiementDetail.id);

      if (error) throw error;

      const { data: allPaiements } = await supabase
        .from('paiements_location')
        .select('id, statut, montant_paye')
        .eq('location_id', paiementDetail.location_id);

      if (allPaiements) {
        const payeesCount = allPaiements.filter(p =>
          p.id === paiementDetail.id ? false : p.statut === 'paye'
        ).length;
        const totalEncaisse = allPaiements.reduce((sum, p) => {
          if (p.id === paiementDetail.id) return sum;
          return sum + (p.montant_paye || 0);
        }, 0);

        const { data: locationData } = await supabase
          .from('locations')
          .select('montant_total_ht, montant_total_ttc')
          .eq('id', paiementDetail.location_id)
          .single();

        if (locationData) {
          await supabase
            .from('locations')
            .update({
              mensualites_payees: payeesCount,
              reste_a_payer_ttc: Math.max(0, (locationData.montant_total_ttc || 0) - totalEncaisse),
              reste_a_payer_ht: Math.max(0, (locationData.montant_total_ht || 0) - (totalEncaisse / 1.2)),
            })
            .eq('id', paiementDetail.location_id);
        }
      }

      setPaiementDetail(null);
      const freshRows = await fetchPaiements();
      if (contratDetail) {
        const updatedContrat = calculerContrat(contratDetail.location_id, freshRows);
        if (updatedContrat) setContratDetail(updatedContrat);
      }
    } catch (err) {
      console.error('[PaiementsManager] Erreur dépointage:', err);
      alert('Erreur lors du dépointage');
    } finally {
      setDepointing(false);
    }
  };

  const handleGenererFacture = async (paiementId: string, envoyerEmail = false, modeAvoir = false) => {
    setGeneratingFacture(true);
    setFactureSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${(supabase as any).supabaseUrl}/functions/v1/generate-facture`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ paiement_id: paiementId, envoyer_email: false, mode_avoir: modeAvoir }),
        }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const blob = new Blob(
        [Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      if (envoyerEmail) {
        const emailRes = await fetch(
          `${(supabase as any).supabaseUrl}/functions/v1/send-facture-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ paiement_id: paiementId }),
          }
        );
        const emailResult = await emailRes.json();
        if (!emailResult.success) throw new Error('Email : ' + emailResult.error);
        setFactureSuccess(`${result.numero_facture} · email envoyé ✓`);
      } else {
        setFactureSuccess(result.numero_facture);
      }
      fetchPaiements();
    } catch (err: any) {
      console.error('[Facture]', err);
      alert('Erreur génération facture : ' + err.message);
    } finally {
      setGeneratingFacture(false);
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

  const formatDateLong = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
    if (n === 0) return '0';
    if (n < 1000) return n.toFixed(0);
    const enK = n / 1000;
    if (enK === Math.floor(enK)) return enK.toFixed(0) + 'K';
    return enK.toFixed(1).replace('.', ',') + 'K';
  };

  const formatMontant = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const getCompteNom = (compteId: string | null) => {
    if (!compteId) return null;
    return comptesBank.find(c => c.id === compteId) || null;
  };

  const scrollVersContrat = (locationId: string, typeCategorie: 'paiement' | 'location') => {
    if (typeCategorie === 'location' && onNavigate) {
      onNavigate('parc/locations', { focus_location_id: locationId });
      return;
    }
    const row = document.getElementById('contrat-row-' + locationId);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('bg-yellow-100');
    setTimeout(() => row.classList.remove('bg-yellow-100'), 2000);
  };

  const ouvrirPointageParId = (paiementId: string) => {
    const p = paiements.find(x => x.id === paiementId);
    if (p) handleOpenPointage(p);
  };

  const getDatePrevue = (p: PaiementRow): string | null => {
    if (!p.mois) return null;
    const jourPaiement = p.jour_paiement || 1;
    const date = new Date(p.mois);
    date.setDate(jourPaiement);
    return date.toISOString().split('T')[0];
  };

  const getEcartJours = (datePrevue: string | null, dateRecue: string | null): number | null => {
    if (!datePrevue || !dateRecue) return null;
    const prev = new Date(datePrevue);
    const recu = new Date(dateRecue);
    const diffMs = recu.getTime() - prev.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  // ----------------------------------------------------------------------
  // RENDU
  // ----------------------------------------------------------------------

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  const paiementPointage = paiements.find(p => p.id === pointageId);

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

  const detailCompte = paiementDetail ? getCompteNom(paiementDetail.compte_bancaire_id) : null;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paiements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contratsFiltres.length} contrat{contratsFiltres.length > 1 ? 's' : ''} · {kpis.nbEcheances} échéance{kpis.nbEcheances > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => fetchPaiements()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {/* TOGGLE PÉRIODE RAPIDE */}
      <div className="inline-flex gap-0.5 bg-white border border-gray-200 rounded-md p-0.5 mb-2">
        {(['tout', 'ce_mois', 'ce_trimestre', 'cette_annee'] as Exclude<PeriodeFilter, 'custom'>[]).map(p => (
          <button key={p} onClick={() => setPeriodeRapide(p)}
            className={'px-3.5 py-1 text-xs font-medium rounded transition-colors ' +
              (periode === p ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900')
            }>
            {PERIODE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* PÉRIODE PERSONNALISÉE */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Période personnalisée</span>

        <div className={'inline-flex items-center gap-1 bg-white border rounded-md px-2 py-1 transition-colors ' +
          (customMode === 'mois' ? 'border-blue-400' : 'border-gray-200')
        }>
          <CalendarDays className="w-3 h-3 text-gray-500" />
          <select
            value={customMode === 'mois' ? customMois : ''}
            onChange={(e) => { if (e.target.value) { activerCustom('mois'); setCustomMois(e.target.value); } }}
            className="border-none bg-transparent text-xs py-0 h-5 w-[110px] focus:outline-none cursor-pointer"
          >
            <option value="">Mois...</option>
            {optionsMois.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className={'inline-flex items-center gap-1 bg-white border rounded-md px-2 py-1 transition-colors ' +
          (customMode === 'trimestre' ? 'border-blue-400' : 'border-gray-200')
        }>
          <PieChart className="w-3 h-3 text-gray-500" />
          <select
            value={customMode === 'trimestre' ? customTrimestre : ''}
            onChange={(e) => { if (e.target.value) { activerCustom('trimestre'); setCustomTrimestre(e.target.value); } }}
            className="border-none bg-transparent text-xs py-0 h-5 w-[90px] focus:outline-none cursor-pointer"
          >
            <option value="">Trimestre...</option>
            {optionsTrimestres.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className={'inline-flex items-center gap-1 bg-white border rounded-md px-2 py-1 transition-colors ' +
          (customMode === 'annee' ? 'border-blue-400' : 'border-gray-200')
        }>
          <Calendar className="w-3 h-3 text-gray-500" />
          <select
            value={customMode === 'annee' ? customAnnee : ''}
            onChange={(e) => { if (e.target.value) { activerCustom('annee'); setCustomAnnee(e.target.value); } }}
            className="border-none bg-transparent text-xs py-0 h-5 w-[70px] focus:outline-none cursor-pointer"
          >
            <option value="">Année...</option>
            {optionsAnnees.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className={'inline-flex items-center gap-1 bg-white border rounded-md px-2 py-1 transition-colors ' +
          (customMode === 'plage' ? 'border-blue-400' : 'border-gray-200')
        }>
          <CalendarRange className="w-3 h-3 text-gray-500" />
          <input
            type="date"
            value={customMode === 'plage' ? customPlageStart : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                if (customMode !== 'plage') activerCustom('plage');
                setCustomPlageStart(v);
                if (customPlageEnd && v > customPlageEnd) setCustomPlageEnd('');
              }
            }}
            className="border-none bg-transparent text-[11px] py-0 h-5 w-[105px] focus:outline-none"
          />
          <span className="text-[10px] text-gray-400">→</span>
          <input
            type="date"
            value={customMode === 'plage' ? customPlageEnd : ''}
            min={customPlageStart || undefined}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                if (customMode !== 'plage') activerCustom('plage');
                setCustomPlageEnd(v);
              }
            }}
            className="border-none bg-transparent text-[11px] py-0 h-5 w-[105px] focus:outline-none"
          />
        </div>

        {periode === 'custom' && (
          <button
            onClick={resetCustom}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
          >
            <X className="w-3 h-3" /> Réinitialiser
          </button>
        )}
      </div>

      {bornes && (
        <div className="text-[11px] text-gray-500 mb-4 pl-1">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Période active : <strong className="text-gray-900 font-medium">{bornes.label}</strong>
          </span>
        </div>
      )}
      {!bornes && <div className="mb-4" />}

      {/* KPIs MOIS COURANT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <Kpi
          label={`À encaisser (${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})`}
          value={`${formatNumber(kpisMois.attendu)} €`}
          sub={`${kpisMois.nbEcheances} échéances`}
        />
        <Kpi
          label="Encaissé"
          value={`${formatNumber(kpisMois.encaisse)} €`}
          sub={`${kpisMois.taux}% · ${kpisMois.nbPayes} paiements`}
          color="emerald"
          progress={kpisMois.taux}
        />
        <Kpi
          label="Reste à encaisser"
          value={`${formatNumber(kpisMois.reste)} €`}
          sub={`${kpisMois.nbRestants} échéances`}
          color="amber"
        />
        <Kpi
          label="En retard"
          value={`${formatNumber(kpisRetards.montant)} €`}
          sub={`${kpisRetards.nb} impayés (tout cumul)`}
          color="red"
          outline={kpisRetards.nb > 0}
        />
      </div>

      {/* CARTES PAR TYPE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {(['location_vente_societe', 'location_vente_particulier', 'location_pure', 'loa'] as const).map(typeKey => {
          const data = kpisParType[typeKey];
          const colors = {
            location_vente_societe:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'LV Entreprises',  Icon: Building2  },
            location_vente_particulier: { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   label: 'LV Particuliers', Icon: User       },
            location_pure:              { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Location Pure',   Icon: Receipt    },
            loa:                        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'LOA',             Icon: CreditCard },
          }[typeKey];
          const { Icon } = colors;
          const isActive = filterType === typeKey;
          return (
            <button
              key={typeKey}
              onClick={() => setFilterType(isActive ? '' : typeKey)}
              className={`text-left p-2.5 rounded-md border transition-all ${colors.bg} ${isActive ? `${colors.border} ring-2 ring-offset-1` : 'border-transparent hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>{colors.label}</span>
              </div>
              <p className="text-base font-semibold text-gray-900">{data.nbContrats} contrat{data.nbContrats !== 1 ? 's' : ''}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{formatNumber(data.encaisseMois)} / {formatNumber(data.attenduMois)} €</p>
              <p className={`text-[10px] mt-1 ${data.nbRetards > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {data.nbRetards > 0 ? `⚠ ${data.nbRetards} retard${data.nbRetards !== 1 ? 's' : ''}` : '✓ Aucun retard'}
              </p>
            </button>
          );
        })}
      </div>

      {/* RECHERCHE + FILTRES */}
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

      {/* TABLEAU PRINCIPAL */}
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
                    id={'contrat-row-' + c.location_id}
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

      {/* POPUP CONTRAT */}
      {contratDetail && (
        <div className="fixed inset-0 bg-black/45 flex items-start justify-center z-40 p-6 overflow-y-auto"
             onClick={() => setContratDetail(null)}>
          <div className="bg-white rounded-lg w-full max-w-4xl my-6" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-5 py-3 border-b border-gray-200 flex items-start justify-between rounded-t-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <button
                    onClick={() => onNavigate?.('parc/locations', { focus_location_id: contratDetail.location_id })}
                    className="font-mono text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Voir cette location dans l'écran Locations"
                  >
                    {contratDetail.reference_contrat}
                  </button>
                  <p className="font-medium text-gray-900">
                    <button
                      onClick={() => contratDetail.vehicule_id && onNavigate?.('parc/vehicules', { vehicleId: contratDetail.vehicule_id })}
                      className="text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                      title="Voir la fiche de ce véhicule"
                    >
                      {contratDetail.vehicule_immat}
                    </button>
                    {' · '}{contratDetail.vehicule_marque} {contratDetail.vehicule_modele}
                  </p>
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

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">#</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Mois</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Attendu</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Date prévue</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Payé</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Date reçu</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Act.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* 🆕 Ligne APPORT (n°0) si contrat LV avec apport */}
                    {contratDetail.hasApport && filterDetail === 'tout' && (
                      <tr className="bg-violet-50/50">
                        <td className="px-2 py-1.5 font-bold text-violet-700">0</td>
                        <td className="px-2 py-1.5 font-semibold text-violet-700">Apport initial</td>
                        <td className="px-2 py-1.5 text-right font-bold text-violet-800">{formatMontant(contratDetail.apport_initial)}</td>
                        <td className="px-2 py-1.5 text-violet-600 text-[11px]">
                          {contratDetail.date_apport ? formatDateShort(contratDetail.date_apport) : 'À la signature'}
                        </td>
                        <td className={'px-2 py-1.5 text-right ' + (contratDetail.apportVerse ? 'text-emerald-700' : 'text-gray-300')}>
                          {contratDetail.apportVerse ? formatMontant(contratDetail.apport_initial) : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-violet-500 text-[11px]">
                          {contratDetail.apportVerse && contratDetail.date_apport ? formatDateShort(contratDetail.date_apport) : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            {contratDetail.apportVerse ? 'Versé' : 'Apport'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-300">—</td>
                      </tr>
                    )}
                    {mensualitesFilreesPopup.map(p => {
                      const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.impaye;
                      const bgRow = p.statut === 'partiel' ? 'bg-amber-50'
                                  : p.statut === 'retard' ? 'bg-red-50' : '';
                      const isPaye = p.statut === 'paye' || p.statut === 'partiel';
const isPointable = p.statut !== 'paye' && p.statut !== 'partiel';
                      return (
                        <tr key={p.id}
                            onClick={() => { if (isPaye) setPaiementDetail(p); }}
                            className={bgRow + (isPaye ? ' cursor-pointer hover:bg-emerald-50' : '')}>
                          <td className="px-2 py-1.5 text-gray-400">{p.numero_echeance}</td>
                          <td className={'px-2 py-1.5 ' + (p.statut === 'partiel' || p.statut === 'retard' ? 'font-medium' : '')}>
                            {formatMoisLabel(p.mois)}
                          </td>
                          <td className="px-2 py-1.5 text-right">{formatMontant(p.montant_attendu_ttc || 0)}</td>
                          <td className="px-2 py-1.5 text-gray-700 text-[11px]">{formatDateShort(getDatePrevue(p))}</td>
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
                            {isPointable ? (
                              <button onClick={(e) => { e.stopPropagation(); handleOpenPointage(p); }}
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

              <p className="text-[10px] text-gray-400 mt-2 italic">
                💡 Astuce : cliquez sur une ligne payée pour voir le détail du pointage (date, compte, mode, référence…)
              </p>

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

      {/* POPUP DÉTAIL POINTAGE */}
      {paiementDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setPaiementDetail(null)}>
          <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Détail du pointage</h3>
                <p className="text-xs text-gray-500">
                  {paiementDetail.vehicule_immat} · Éch. {paiementDetail.numero_echeance} · {formatMoisLabel(paiementDetail.mois)}
                </p>
              </div>
              <button onClick={() => setPaiementDetail(null)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 mb-4 text-center">
                <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-medium mb-1">Montant encaissé</p>
                <p className="text-2xl font-semibold text-emerald-700">{formatMontant(paiementDetail.montant_paye || 0)} € TTC</p>
                <p className="text-[11px] text-emerald-700 mt-1">
                  {(paiementDetail.montant_paye || 0) >= (paiementDetail.montant_attendu_ttc || 0)
                    ? 'Échéance soldée'
                    : `Sur ${formatMontant(paiementDetail.montant_attendu_ttc || 0)} € attendus`}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <DetailRow icon={Calendar} label="Date prévue">
                  {(() => {
                    const dp = getDatePrevue(paiementDetail);
                    return dp ? formatDateLong(dp) : <span className="text-gray-400">—</span>;
                  })()}
                </DetailRow>
                <DetailRow icon={Calendar} label="Date d'encaissement">
                  <div>
                    {formatDateLong(paiementDetail.date_paiement)}
                    {(() => {
                      const ecart = getEcartJours(getDatePrevue(paiementDetail), paiementDetail.date_paiement);
                      if (ecart === null) return null;
                      if (ecart === 0) return <span className="ml-2 text-[11px] text-emerald-700 font-medium">✓ pile à l'heure</span>;
                      if (ecart < 0) return <span className="ml-2 text-[11px] text-emerald-700 font-medium">✓ payé {Math.abs(ecart)} jour{Math.abs(ecart) > 1 ? 's' : ''} en avance</span>;
                      return <span className="ml-2 text-[11px] text-amber-700 font-medium">⚠ payé {ecart} jour{ecart > 1 ? 's' : ''} en retard</span>;
                    })()}
                  </div>
                </DetailRow>
                <DetailRow icon={Building2} label="Mode de paiement">
                  {paiementDetail.mode_paiement ? (MODES_LABELS[paiementDetail.mode_paiement] || paiementDetail.mode_paiement) : <span className="text-gray-400">—</span>}
                </DetailRow>
                <DetailRow icon={Wallet} label="Compte bancaire">
                  {detailCompte ? (
                    <>
                      {detailCompte.nom}
                      {detailCompte.banque && <span className="text-[11px] text-gray-500 ml-1">({detailCompte.banque})</span>}
                    </>
                  ) : <span className="text-gray-400">—</span>}
                </DetailRow>
                <DetailRow icon={Hash} label="Référence">
                  {paiementDetail.reference_paiement
                    ? <span className="font-mono text-xs">{paiementDetail.reference_paiement}</span>
                    : <span className="text-gray-400">—</span>}
                </DetailRow>
                <DetailRow icon={User} label="Pointé par">
                  {paiementDetail.pointe_par
                    ? <PointeParNom userId={paiementDetail.pointe_par} />
                    : <span className="text-gray-400">—</span>}
                </DetailRow>
                <DetailRow icon={StickyNote} label="Notes">
                  {paiementDetail.notes
                    ? <span className="italic">{paiementDetail.notes}</span>
                    : <span className="text-gray-400 italic">Aucune note</span>}
                </DetailRow>
              </div>

              <div className="mt-4 bg-gray-50 rounded-md px-3 py-2 flex justify-between text-[11px] text-gray-500">
                <span>Saisi le</span>
                <span>{formatDateTime(paiementDetail.updated_at)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
              <button onClick={handleDepointer} disabled={depointing || generatingFacture}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50">
                {depointing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpLeft className="w-3 h-3" />}
                Dépointer
              </button>
              <div className="flex items-center gap-2">
                {factureSuccess && (
                  <span className="text-[11px] text-emerald-600 font-medium">✓ {factureSuccess}</span>
                )}
               <button
                  onClick={() => { setFactureSuccess(null); handleGenererFacture(paiementDetail!.id, false); }}
                  disabled={generatingFacture}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50">
                  {generatingFacture ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  Facture PDF
                </button>
                {paiementDetail!.montant_offert && paiementDetail!.montant_offert > 0 && (
                  <button
                    onClick={() => { setFactureSuccess(null); handleGenererFacture(paiementDetail!.id, false, true); }}
                    disabled={generatingFacture}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-600 border border-violet-300 rounded-md hover:bg-violet-50 disabled:opacity-50">
                    {generatingFacture ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                    Avoir PDF
                  </button>
                )}
                <button
                  onClick={() => { setFactureSuccess(null); handleGenererFacture(paiementDetail!.id, true); }}
                  disabled={generatingFacture}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-600 border border-emerald-300 rounded-md hover:bg-emerald-50 disabled:opacity-50">
                  {generatingFacture ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                  Envoyer email
                </button>
                <button onClick={() => { setPaiementDetail(null); setFactureSuccess(null); }}
                  className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POINTAGE */}
      {pointageId && paiementPointage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${paiementDetail?.statut === 'partiel' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                {paiementDetail?.statut === 'partiel'
                  ? <TrendingUp className="w-5 h-5 text-amber-600" />
                  : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {paiementDetail?.statut === 'partiel' ? 'Paiement partiel' : 'Détail du pointage'}
                </h3>
                <p className="text-xs text-gray-500">
                  {paiementPointage.vehicule_immat} · Éch. {paiementPointage.numero_echeance} · {formatMoisLabel(paiementPointage.mois)}
                </p>
              </div>
              <button onClick={() => setPointageId(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-md p-2.5 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Attendu</span><span className="font-medium">{formatMontant(recapAttendu)} € TTC</span></div>
                {recapDejaPaye > 0 && (
                  <div className="flex justify-between"><span className="text-gray-500">Déjà encaissé</span><span className="font-medium text-emerald-700">{formatMontant(recapDejaPaye)} €</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">Locataire</span><span>{paiementPointage.locataire_prenom} {paiementPointage.locataire_nom}</span></div>
              </div>

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

              <FormSection label="Mode de paiement" emoji="💳">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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

              {pointageMode !== 'offert' ? (
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
              ) : (
                <div className="bg-violet-50 border border-violet-200 rounded-md p-2.5 flex items-start gap-2">
                  <Gift className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-800">
                    <strong>Geste commercial</strong> — aucun encaissement bancaire. L'échéance sera marquée Payé.
                  </p>
                </div>
              )}

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

              {recapMontant > 0 && pointageMode && (pointageMode === 'offert' || pointageCompteId) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    <strong className="font-medium">{formatMontant(recapMontant)} € reçus {recapDateLabel}</strong> par {recapModeLabel} sur {recapCompteLabel}.<br />
                    Solde après pointage : {formatMontant(recapResteApres)} € · Échéance marquée <strong>{recapStatut}</strong>
                  </div>
                </div>
              )}
           {recapMontant > 0 && recapMontant < (recapAttendu - recapDejaPaye) && (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Paiement partiel — il restera {formatMontant(recapAttendu - recapDejaPaye - recapMontant)} € à encaisser
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-violet-50 border border-violet-200 rounded-md p-2">
                    <input
                      type="checkbox"
                      checked={offrirSolde}
                      onChange={(e) => {
                        setOffrirSolde(e.target.checked);
                        if (e.target.checked) {
                          setMontantOffert(String(Math.round((recapAttendu - recapDejaPaye - recapMontant) * 100) / 100));
                        } else {
                          setMontantOffert('');
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <Gift className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                    <span className="text-xs text-violet-800 font-medium">Offrir le solde restant</span>
                  </label>
                  {offrirSolde && (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={montantOffert}
                        onChange={(e) => setMontantOffert(e.target.value)}
                        className="w-full px-3 py-1.5 pr-8 text-sm border border-violet-300 rounded-md focus:ring-1 focus:ring-violet-500"
                        placeholder="Montant offert"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">€</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end px-5 py-3 border-t border-gray-200">
              <button onClick={() => setPointageId(null)} disabled={savingPointage}
                className="px-4 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleValiderPointage}
                disabled={savingPointage || !pointageMontant || !pointageMode || (pointageMode !== 'offert' && !pointageCompteId)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                {savingPointage ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</> : <><Check className="w-3.5 h-3.5" /> Valider le pointage</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {depointConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowUpLeft className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Dépointer cette échéance ?</h3>
                <p className="text-xs text-gray-500">Éch. {paiementDetail?.numero_echeance} · {paiementDetail?.vehicule_immat}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Le statut repassera à <span className="font-medium">À venir</span> et toutes les infos de pointage seront effacées. Cette action est <span className="font-medium">réversible</span>.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDepointConfirm(false); depointResolveRef.current?.(false); }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                Annuler
              </button>
              <button
                onClick={() => { setDepointConfirm(false); depointResolveRef.current?.(true); }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                Oui, dépointer
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

function DetailRow({ icon: Icon, label, children }: {
  icon: any; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 text-gray-500 min-w-[140px] flex-shrink-0">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-gray-900 text-sm flex-1">{children}</div>
    </div>
  );
}

function PointeParNom({ userId }: { userId: string }) {
  const [nom, setNom] = useState<string | null>(null);
  useEffect(() => {
    supabase
      .from('app_utilisateur')
      .select('nom, prenom')
      .eq('auth_user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setNom(`${data.prenom || ''} ${data.nom || ''}`.trim());
      });
  }, [userId]);
  return <span>{nom || <span className="font-mono text-[11px] text-gray-400">{userId.slice(0, 8)}…</span>}</span>;
}