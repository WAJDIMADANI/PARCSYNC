import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, RefreshCw, MapPin, Calendar, Euro, User, Building, ArrowLeft, ArrowRight, CheckCircle, X, Filter, AlertCircle, Clock, FileText, Layers } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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
  const [filterPaiement, setFilterPaiement] = useState<string>('all');
  const [filterEDL, setFilterEDL] = useState<string>('all');
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
      const dateDebut = new Date(loc.date_debut);
      const dateFin = loc.date_fin ? new Date(loc.date_fin) : null;
      let statut_calcule: 'a_venir' | 'en_cours' | 'en_retard' | 'terminee';

      if (loc.statut === 'terminee' || loc.statut === 'annulee') {
        statut_calcule = 'terminee';
      } else if (dateDebut > today) {
        statut_calcule = 'a_venir';
      } else if (dateFin && dateFin < today) {
        statut_calcule = 'terminee';
      } else if (nb_paiements_impayes_en_retard > 0) {
        statut_calcule = 'en_retard';
      } else {
        statut_calcule = 'en_cours';
      }

      return {
        ...loc,
        nb_paiements_total,
        nb_paiements_payes,
        nb_paiements_impayes_en_retard,
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

  const getStatutBadge = (statut: string) => {
    const badges = {
      en_cours: 'bg-green-100 text-green-800',
      terminee: 'bg-gray-100 text-gray-800',
      en_retard: 'bg-red-100 text-red-800',
      annulee: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      en_cours: 'En cours',
      terminee: 'Terminée',
      en_retard: 'En retard',
      annulee: 'Annulée'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[statut as keyof typeof badges] || badges.en_cours}`}>
        {labels[statut as keyof typeof labels] || statut}
      </span>
    );
  };

  // Détecte si une location est "à risque"
  const isAtRisk = (loc: Location): { atRisk: boolean; reasons: string[] } => {
    const reasons: string[] = [];

    // Critère 1 : impayés en retard
    if ((loc.nb_paiements_impayes_en_retard || 0) > 0) {
      const n = loc.nb_paiements_impayes_en_retard || 0;
      reasons.push(`${n} impayé${n > 1 ? 's' : ''}`);
    }

    // Critère 2 : en cours mais pas signé
    if (loc.statut_calcule === 'en_cours' && loc.signature_status !== 'signed') {
      reasons.push('non signé');
    }

    return { atRisk: reasons.length > 0, reasons };
  };

  // Détecte si la location finit dans les 30 jours
  const isToAnticipate = (loc: Location): boolean => {
    if (loc.statut_calcule !== 'en_cours') return false;
    if (!loc.date_fin) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateFin = new Date(loc.date_fin);
    const daysUntilEnd = Math.floor((dateFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return daysUntilEnd >= 0 && daysUntilEnd <= 30;
  };

  const getKpiData = () => {
    const total = locations.length;

    const enCours = locations.filter(l => l.statut_calcule === 'en_cours');
    const aVenir = locations.filter(l => l.statut_calcule === 'a_venir');
    const terminees = locations.filter(l => l.statut_calcule === 'terminee');

    const aRisque = locations.filter(l => isAtRisk(l).atRisk);
    const aAnticiper = locations.filter(l => isToAnticipate(l));

    const enCoursSignes = enCours.filter(l => l.signature_status === 'signed').length;
    const aVenirEnvoyes = aVenir.filter(l => l.signature_status === 'sent').length;

    const totalImpayes = locations.reduce((sum, l) => sum + (l.nb_paiements_impayes_en_retard || 0), 0);
    const totalNonSignes = enCours.filter(l => l.signature_status !== 'signed').length;

    return {
      total,
      enCours: { count: enCours.length, signes: enCoursSignes },
      aVenir: { count: aVenir.length, envoyes: aVenirEnvoyes },
      aRisque: { count: aRisque.length, impayes: totalImpayes, nonSignes: totalNonSignes },
      aAnticiper: { count: aAnticiper.length },
      terminees: { count: terminees.length },
    };
  };

  const filteredLocations = locations.filter(loc => {
    // Filtre tuile (incluant at_risk et to_anticipate)
    if (filterStatutCalcule) {
      if (filterStatutCalcule === 'at_risk') {
        if (!isAtRisk(loc).atRisk) return false;
      } else if (filterStatutCalcule === 'to_anticipate') {
        if (!isToAnticipate(loc)) return false;
      } else if (loc.statut_calcule !== filterStatutCalcule) {
        return false;
      }
    }

    // Filtre Type
    if (filterType !== 'all' && loc.type_location !== filterType) return false;

    // Filtre Signature
    if (filterSignature !== 'all') {
      const sig = loc.signature_status || 'draft';
      if (filterSignature === 'no_pdf') {
        if (loc.contrat_pdf_path) return false;
      } else if (sig !== filterSignature) {
        return false;
      }
    }

    // Filtre Santé contrat
    if (filterPaiement === 'sain') {
      if (isAtRisk(loc).atRisk) return false;
    } else if (filterPaiement === 'a_risque') {
      if (!isAtRisk(loc).atRisk) return false;
    }

    // Filtre EDL — TODO: nécessite jointure avec etat_des_lieux (B1.4)
    // Pour l'instant le filtre est dans l'UI mais ne filtre pas

    // Recherche texte
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        loc.vehicule?.immatriculation?.toLowerCase().includes(searchLower) ||
        loc.locataire?.nom?.toLowerCase().includes(searchLower) ||
        loc.locataire?.prenom?.toLowerCase().includes(searchLower) ||
        loc.locataire?.email?.toLowerCase().includes(searchLower) ||
        loc.reference_contrat?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setSearch('');
    setFilterStatutCalcule(null);
    setFilterType('all');
    setFilterSignature('all');
    setFilterPaiement('all');
    setFilterEDL('all');
  };

  const hasActiveFilters = !!filterStatutCalcule || filterType !== 'all' || filterSignature !== 'all' || filterPaiement !== 'all' || filterEDL !== 'all' || !!search;

  const kpi = getKpiData();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (view === 'list') {
    return (
      <div className="space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <button
            onClick={handleNouvelleLocation}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle location
          </button>
        </div>

        {/* KPI Tuiles cliquables - vue administrative/juridique */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total */}
          <button
            onClick={() => setFilterStatutCalcule(null)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              !filterStatutCalcule
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.total}</div>
            <div className="text-xs text-gray-500 mt-1">contrats</div>
          </button>

          {/* En cours */}
          <button
            onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'en_cours' ? null : 'en_cours')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              filterStatutCalcule === 'en_cours'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-500">En cours</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.enCours.count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {kpi.enCours.signes} signé{kpi.enCours.signes > 1 ? 's' : ''}
            </div>
          </button>

          {/* À venir */}
          <button
            onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'a_venir' ? null : 'a_venir')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              filterStatutCalcule === 'a_venir'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-500">À venir</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.aVenir.count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {kpi.aVenir.envoyes} envoyé{kpi.aVenir.envoyes > 1 ? 's' : ''}
            </div>
          </button>

          {/* À risque - mis en évidence visuellement */}
          <button
            onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'at_risk' ? null : 'at_risk')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              filterStatutCalcule === 'at_risk'
                ? 'border-red-600 bg-red-100 ring-2 ring-red-300'
                : kpi.aRisque.count > 0
                  ? 'border-red-400 bg-red-50 hover:border-red-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <AlertCircle className={`h-4 w-4 ${kpi.aRisque.count > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-semibold ${kpi.aRisque.count > 0 ? 'text-red-700' : 'text-gray-500'}`}>À risque</span>
            </div>
            <div className={`text-2xl font-bold ${kpi.aRisque.count > 0 ? 'text-red-700' : 'text-gray-900'}`}>{kpi.aRisque.count}</div>
            <div className={`text-xs mt-1 ${kpi.aRisque.count > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {kpi.aRisque.impayes > 0 && `${kpi.aRisque.impayes} impayé${kpi.aRisque.impayes > 1 ? 's' : ''}`}
              {kpi.aRisque.impayes > 0 && kpi.aRisque.nonSignes > 0 && ' · '}
              {kpi.aRisque.nonSignes > 0 && `${kpi.aRisque.nonSignes} non signé${kpi.aRisque.nonSignes > 1 ? 's' : ''}`}
              {kpi.aRisque.impayes === 0 && kpi.aRisque.nonSignes === 0 && 'aucun risque'}
            </div>
          </button>

          {/* À anticiper */}
          <button
            onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'to_anticipate' ? null : 'to_anticipate')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              filterStatutCalcule === 'to_anticipate'
                ? 'border-yellow-600 bg-yellow-100 ring-2 ring-yellow-300'
                : kpi.aAnticiper.count > 0
                  ? 'border-yellow-400 bg-yellow-50 hover:border-yellow-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Clock className={`h-4 w-4 ${kpi.aAnticiper.count > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <span className={`text-xs ${kpi.aAnticiper.count > 0 ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}>À anticiper</span>
            </div>
            <div className={`text-2xl font-bold ${kpi.aAnticiper.count > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>{kpi.aAnticiper.count}</div>
            <div className="text-xs text-gray-500 mt-1">fin &lt; 30j</div>
          </button>

          {/* Terminées */}
          <button
            onClick={() => setFilterStatutCalcule(filterStatutCalcule === 'terminee' ? null : 'terminee')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              filterStatutCalcule === 'terminee'
                ? 'border-gray-600 bg-gray-100'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-500">Terminées</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.terminees.count}</div>
            <div className="text-xs text-gray-500 mt-1">archivées</div>
          </button>
        </div>

        {/* Filtres avancés - administratifs et juridiques */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-gray-400" />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Type : Tous</option>
            <option value="location_pure">Location pure</option>
            <option value="location_vente_particulier">Loc-vente Particulier</option>
            <option value="location_vente_societe">Loc-vente Société</option>
            <option value="loa">LOA</option>
          </select>

          <select
            value={filterSignature}
            onChange={(e) => setFilterSignature(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Signature : Tous</option>
            <option value="signed">Signé</option>
            <option value="sent">Envoyé en attente</option>
            <option value="draft">Brouillon</option>
            <option value="declined">Refusé</option>
            <option value="no_pdf">Sans PDF</option>
          </select>

          <select
            value={filterPaiement}
            onChange={(e) => setFilterPaiement(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Santé : Tous</option>
            <option value="sain">✓ Sain</option>
            <option value="a_risque">⚠ À risque</option>
          </select>

          <select
            value={filterEDL}
            onChange={(e) => setFilterEDL(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">EDL : Tous</option>
            <option value="with_sortie">Avec EDL Sortie</option>
            <option value="with_retour">Avec EDL Retour</option>
            <option value="complete">EDL complet (Sortie + Retour)</option>
            <option value="none">Sans aucun EDL ⚠</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par véhicule ou locataire..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={fetchLocations}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Actualiser
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Aucune location trouvée
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {location.vehicule?.immatriculation || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {location.vehicule?.marque} {location.vehicule?.modele}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">
                          {location.locataire?.nom} {location.locataire?.prenom || ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          {location.locataire?.type === 'particulier' ? 'Particulier' : 'Entreprise'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.type_location === 'location_pure' ? 'Location pure' : 'LOA'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(location.date_debut).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.date_fin ? new Date(location.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.montant_mensuel ? `${location.montant_mensuel.toFixed(2)} €/mois` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatutBadge(location.statut)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedLocation(location)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLocation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Détails location</h3>
                <button onClick={() => setSelectedLocation(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500">Véhicule</p><p className="font-medium">{selectedLocation.vehicule?.immatriculation}</p></div>
                  <div><p className="text-xs text-gray-500">Locataire</p><p className="font-medium">{selectedLocation.locataire?.nom} {selectedLocation.locataire?.prenom || ''}</p></div>
                  <div><p className="text-xs text-gray-500">Type</p><p className="font-medium">{selectedLocation.type_location === 'location_pure' ? 'Location pure' : 'LOA'}</p></div>
                  <div><p className="text-xs text-gray-500">Statut</p><p className="font-medium">{selectedLocation.statut}</p></div>
                  <div><p className="text-xs text-gray-500">Date début</p><p className="font-medium">{new Date(selectedLocation.date_debut).toLocaleDateString('fr-FR')}</p></div>
                  <div><p className="text-xs text-gray-500">Date fin</p><p className="font-medium">{selectedLocation.date_fin ? new Date(selectedLocation.date_fin).toLocaleDateString('fr-FR') : '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Montant mensuel</p><p className="font-medium">{selectedLocation.montant_mensuel ? `${selectedLocation.montant_mensuel} €` : '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Dépôt de garantie</p><p className="font-medium">{selectedLocation.depot_garantie ? `${selectedLocation.depot_garantie} €` : '—'}</p></div>
                </div>
                {selectedLocation.notes && (
                  <div><p className="text-xs text-gray-500">Notes</p><p className="text-sm">{selectedLocation.notes}</p></div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setSelectedLocation(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
