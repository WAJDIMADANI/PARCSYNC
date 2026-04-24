import { useState, useEffect } from 'react';
import { FileText, X, ArrowRight, ArrowLeft, Check, Loader2, Search, Plus, User, Building, Euro } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// TYPES
// ============================================================

export type LocationType = 'location_pure' | 'location_vente_particulier' | 'location_vente_societe';

interface LocationContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    attributionId: string;
    locataireNom: string;
    locatairePrenom: string;
    kmDepart: number;
  }) => void;
  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  refTca: string | null;
  typeLocation: LocationType;
  dateDebut: string;
}

interface Locataire {
  id: string;
  nom: string;
  prenom: string | null;
  type: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  siret: string | null;
  date_naissance: string | null;
  nationalite: string | null;
  lieu_naissance: string | null;
  permis_numero: string | null;
  permis_validite: string | null;
}

// ============================================================
// LABELS
// ============================================================

const TYPE_LABELS: Record<LocationType, string> = {
  location_pure: 'Location pure',
  location_vente_particulier: 'Location-vente particulier',
  location_vente_societe: 'Location-vente société',
};

const isLocationVente = (t: LocationType) => t === 'location_vente_particulier' || t === 'location_vente_societe';
const isSociete = (t: LocationType) => t === 'location_vente_societe';

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function LocationContractModal(props: LocationContractModalProps) {
  const {
    isOpen, onClose, onSuccess,
    vehiculeId, immatriculation, marque, modele, refTca,
    typeLocation, dateDebut,
  } = props;

  const { user } = useAuth();

  // Navigation
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========== ÉTAPE 1 : Locataire ==========
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Locataire[]>([]);
  const [selectedLocataire, setSelectedLocataire] = useState<Locataire | null>(null);
  const [createNew, setCreateNew] = useState(false);

  // Champs nouveau locataire
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newTelephone, setNewTelephone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAdresse, setNewAdresse] = useState('');
  const [newSiret, setNewSiret] = useState('');
  const [newDateNaissance, setNewDateNaissance] = useState('');
  const [newNationalite, setNewNationalite] = useState('');
  const [newLieuNaissance, setNewLieuNaissance] = useState('');
  const [newPermisNumero, setNewPermisNumero] = useState('');
  const [newPermisValidite, setNewPermisValidite] = useState('');

  // ========== ÉTAPE 2 : Termes financiers ==========
  const [referenceContrat, setReferenceContrat] = useState('');
  const [dureeMois, setDureeMois] = useState('');
  const [jourPaiement, setJourPaiement] = useState('1');
  const [montantMensuelTtc, setMontantMensuelTtc] = useState('');
  const [depotGarantie, setDepotGarantie] = useState('');
  const [apportInitial, setApportInitial] = useState('');
  const [kmDepart, setKmDepart] = useState('');
  const [kmInclus, setKmInclus] = useState('');
  const [coutKmSupp, setCoutKmSupp] = useState('0.50');
  const [valeurResiduelle, setValeurResiduelle] = useState('');
  const [notes, setNotes] = useState('');

  // Franchises (location pure uniquement — valeurs par défaut du template)
  const [franchiseVol, setFranchiseVol] = useState('2000');
  const [franchiseNonRestitue, setFranchiseNonRestitue] = useState('2000');
  const [franchiseDommages, setFranchiseDommages] = useState('1500');
  const [franchisePartage, setFranchisePartage] = useState('750');
  const [franchiseBrisGlace, setFranchiseBrisGlace] = useState('500');

  // Calculs auto
  const mensuelTtc = parseFloat(montantMensuelTtc) || 0;
  const mensuelHt = Math.round((mensuelTtc / 1.20) * 100) / 100;
  const duree = parseInt(dureeMois) || 0;
  const totalTtc = mensuelTtc * duree;
  const totalHt = mensuelHt * duree;
  const apport = parseFloat(apportInitial) || 0;

  // Date de fin calculée
  const dateFin = (() => {
    if (!dateDebut || !duree) return '';
    const d = new Date(dateDebut);
    d.setMonth(d.getMonth() + duree);
    return d.toISOString().split('T')[0];
  })();

  // Recherche de locataires existants
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const typeFilter = isSociete(typeLocation) ? 'entreprise' : 'particulier';
        const { data } = await supabase
          .from('loueur')
          .select('*')
          .eq('actif', true)
          .eq('type', typeFilter)
          .or(`nom.ilike.%${searchQuery}%,prenom.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,siret.ilike.%${searchQuery}%`)
          .limit(5);
        setSearchResults(data || []);
      } catch (err) {
        console.error('Erreur recherche locataires:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeLocation]);

  if (!isOpen) return null;

  // ========== VALIDATIONS ==========
  const validateStep1 = (): boolean => {
    if (!selectedLocataire && !createNew) {
      setError('Veuillez sélectionner ou créer un locataire');
      return false;
    }
    if (createNew && !newNom.trim()) {
      setError(isSociete(typeLocation) ? 'La raison sociale est obligatoire' : 'Le nom est obligatoire');
      return false;
    }
    if (createNew && !isSociete(typeLocation) && !newPrenom.trim()) {
      setError('Le prénom est obligatoire');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!dureeMois || parseInt(dureeMois) <= 0) {
      setError('La durée en mois est obligatoire');
      return false;
    }
    if (!montantMensuelTtc || parseFloat(montantMensuelTtc) <= 0) {
      setError('Le montant mensuel TTC est obligatoire');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handlePrev = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  // ========== CRÉATION FINALE ==========
  const handleCreer = async () => {
    setError(null);
    setSaving(true);

    try {
      // 1. Créer ou récupérer le locataire
      let locataireId = selectedLocataire?.id || null;
      let locataireNom = selectedLocataire?.nom || '';
      let locatairePrenom = selectedLocataire?.prenom || '';

      if (createNew && !locataireId) {
        const typeLocataire = isSociete(typeLocation) ? 'entreprise' : 'particulier';
        const { data: newLoc, error: locErr } = await supabase
          .from('loueur')
          .insert({
            type: typeLocataire,
            nom: newNom.trim(),
            prenom: !isSociete(typeLocation) ? newPrenom.trim() : null,
            telephone: newTelephone || null,
            email: newEmail || null,
            adresse: newAdresse || null,
            siret: isSociete(typeLocation) ? newSiret || null : null,
            date_naissance: !isSociete(typeLocation) ? newDateNaissance || null : null,
            nationalite: newNationalite || null,
            lieu_naissance: newLieuNaissance || null,
            permis_numero: newPermisNumero || null,
            permis_validite: newPermisValidite || null,
            actif: true,
          })
          .select('id')
          .single();

        if (locErr || !newLoc) throw new Error(`Erreur création locataire: ${locErr?.message}`);
        locataireId = newLoc.id;
        locataireNom = newNom.trim();
        locatairePrenom = newPrenom.trim();
      }

      // 2. Créer l'attribution_vehicule avec loueur_id
      const { data: insertedAttribution, error: attrErr } = await supabase
        .from('attribution_vehicule')
        .insert({
          vehicule_id: vehiculeId,
          loueur_id: locataireId,
          profil_id: null,
          type_attribution: 'principal',
          date_debut: dateDebut,
          date_fin: null,
          statut_vehicule: typeLocation,
          notes: notes || null,
        })
        .select('id')
        .single();

      if (attrErr || !insertedAttribution) throw new Error(`Erreur attribution: ${attrErr?.message}`);

      const attributionId = insertedAttribution.id;

      // 3. INSERT dans locations
      const km = parseInt(kmDepart) || 0;
      const { data: insertedLocation, error: locInsertErr } = await supabase
        .from('locations')
        .insert({
          vehicule_id: vehiculeId,
          locataire_id: locataireId,
          type_location: typeLocation,
          reference_contrat: referenceContrat || null,
          date_debut: dateDebut,
          date_fin: dateFin || null,
          duree_mois: duree,
          jour_paiement: parseInt(jourPaiement) || 1,
          montant_mensuel: mensuelTtc, // ancien champ (compat)
          montant_mensuel_ht: mensuelHt,
          montant_mensuel_ttc: mensuelTtc,
          montant_total_ht: totalHt,
          montant_total_ttc: totalTtc,
          depot_garantie: parseFloat(depotGarantie) || null,
          apport_initial: isLocationVente(typeLocation) ? apport : null,
          valeur_residuelle: !isLocationVente(typeLocation) ? (parseFloat(valeurResiduelle) || null) : null,
          km_depart: km || null,
          km_inclus: !isLocationVente(typeLocation) ? (parseInt(kmInclus) || null) : null,
          cout_km_supplementaire: !isLocationVente(typeLocation) ? (parseFloat(coutKmSupp) || 0.50) : null,
          franchise_vol: !isLocationVente(typeLocation) ? (parseFloat(franchiseVol) || 2000) : null,
          franchise_non_restitue: !isLocationVente(typeLocation) ? (parseFloat(franchiseNonRestitue) || 2000) : null,
          franchise_dommages: !isLocationVente(typeLocation) ? (parseFloat(franchiseDommages) || 1500) : null,
          franchise_partage: !isLocationVente(typeLocation) ? (parseFloat(franchisePartage) || 750) : null,
          franchise_bris_glace: !isLocationVente(typeLocation) ? (parseFloat(franchiseBrisGlace) || 500) : null,
          penalite_retard: !isLocationVente(typeLocation) ? 50 : null,
          frais_gestion_amende: 15,
          mensualites_payees: 0,
          reste_a_payer_ht: totalHt,
          reste_a_payer_ttc: totalTtc,
          statut: 'en_cours',
          notes: notes || null,
          created_by: user?.id || null,
        })
        .select('id')
        .single();

      if (locInsertErr || !insertedLocation) throw new Error(`Erreur création location: ${locInsertErr?.message}`);

      // 4. Générer le tableau de paiements (1 ligne par mois)
      const paiements = [];
      for (let i = 1; i <= duree; i++) {
        const moisDate = new Date(dateDebut);
        moisDate.setMonth(moisDate.getMonth() + i);
        // Ajuster le jour de paiement
        const jour = parseInt(jourPaiement) || 1;
        moisDate.setDate(Math.min(jour, new Date(moisDate.getFullYear(), moisDate.getMonth() + 1, 0).getDate()));

        paiements.push({
          location_id: insertedLocation.id,
          numero_echeance: i,
          mois: moisDate.toISOString().split('T')[0],
          montant_attendu_ht: mensuelHt,
          montant_attendu_ttc: mensuelTtc,
          montant_paye: 0,
          statut: 'impaye',
        });
      }

      if (paiements.length > 0) {
        const { error: paiErr } = await supabase
          .from('paiements_location')
          .insert(paiements);

        if (paiErr) {
          console.warn('[LocationContractModal] Erreur génération paiements (non bloquant):', paiErr);
        } else {
          console.log(`[LocationContractModal] ${paiements.length} échéances générées`);
        }
      }

      // 5. Mettre à jour locataire_type dans vehicule
      await supabase
        .from('vehicule')
        .update({
          locataire_type: isSociete(typeLocation) ? 'entreprise_externe' : 'personne_externe',
        })
        .eq('id', vehiculeId);

      console.log('[LocationContractModal] Contrat créé avec succès');

      // 6. Appeler onSuccess pour chaîner l'EDL
      onSuccess({
        attributionId,
        locataireNom,
        locatairePrenom,
        kmDepart: km,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[LocationContractModal] Erreur:', msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };
  // ============================================================
  // RENDU
  // ============================================================

  const typeLabel = TYPE_LABELS[typeLocation];
  const isVente = isLocationVente(typeLocation);
  const estSociete = isSociete(typeLocation);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Contrat de {typeLabel}</h3>
            <p className="text-sm text-gray-500">{immatriculation} · {marque} {modele}{refTca ? ` · Réf. ${refTca}` : ''}</p>
          </div>
          <div className="text-sm font-medium text-gray-500">Étape {step}/3</div>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de progression */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* ========== ÉTAPE 1 : LOCATAIRE ========== */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-800">
              {estSociete ? '🏢 Locataire (Société)' : '👤 Locataire (Particulier)'}
            </h4>

            {!selectedLocataire && !createNew && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher un locataire existant</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={estSociete ? "Raison sociale, SIRET, email..." : "Nom, prénom, email..."}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                      {searchResults.map(loc => (
                        <button key={loc.id} type="button" onClick={() => { setSelectedLocataire(loc); setSearchQuery(''); setSearchResults([]); }}
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-sm">
                          <div className="font-medium">{loc.nom} {loc.prenom || ''}</div>
                          <div className="text-xs text-gray-500">{loc.email || loc.telephone || loc.siret || ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-400">ou</span>
                </div>
                <button type="button" onClick={() => setCreateNew(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors font-medium text-sm">
                  <Plus className="w-4 h-4" /> Créer un nouveau locataire
                </button>
              </>
            )}

            {selectedLocataire && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{selectedLocataire.nom} {selectedLocataire.prenom || ''}</div>
                    <div className="text-sm text-gray-600">{selectedLocataire.email || selectedLocataire.telephone || ''}</div>
                    {selectedLocataire.siret && <div className="text-xs text-gray-500">SIRET: {selectedLocataire.siret}</div>}
                    {selectedLocataire.adresse && <div className="text-xs text-gray-500">{selectedLocataire.adresse}</div>}
                  </div>
                  <button onClick={() => setSelectedLocataire(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {createNew && (
              <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-gray-700">Nouveau locataire</h5>
                  <button onClick={() => setCreateNew(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={estSociete ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{estSociete ? 'Raison sociale *' : 'Nom *'}</label>
                    <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  {!estSociete && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                      <input type="text" value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                    <input type="tel" value={newTelephone} onChange={(e) => setNewTelephone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
                    <input type="text" value={newAdresse} onChange={(e) => setNewAdresse(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  {estSociete && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">SIRET</label>
                      <input type="text" value={newSiret} onChange={(e) => setNewSiret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  )}
                  {!estSociete && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date de naissance</label>
                        <input type="date" value={newDateNaissance} onChange={(e) => setNewDateNaissance(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nationalité</label>
                        <input type="text" value={newNationalite} onChange={(e) => setNewNationalite(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Lieu de naissance</label>
                        <input type="text" value={newLieuNaissance} onChange={(e) => setNewLieuNaissance(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">N° permis</label>
                    <input type="text" value={newPermisNumero} onChange={(e) => setNewPermisNumero(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Validité permis</label>
                    <input type="date" value={newPermisValidite} onChange={(e) => setNewPermisValidite(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== ÉTAPE 2 : TERMES FINANCIERS ========== */}
        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-800">💰 Termes financiers</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Référence contrat</label>
                <input type="text" value={referenceContrat} onChange={(e) => setReferenceContrat(e.target.value)} placeholder="Ex: LOC-2026-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Km au départ</label>
                <input type="number" value={kmDepart} onChange={(e) => setKmDepart(e.target.value)} placeholder="Ex: 125000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Durée (mois) *</label>
                <input type="number" value={dureeMois} onChange={(e) => setDureeMois(e.target.value)} placeholder="Ex: 18" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin (calculée)</label>
                <input type="date" value={dateFin} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mensualité TTC (€) *</label>
                <input type="number" step="0.01" value={montantMensuelTtc} onChange={(e) => setMontantMensuelTtc(e.target.value)} placeholder="Ex: 1200" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mensualité HT (calculée)</label>
                <input type="text" value={mensuelHt ? `${mensuelHt.toFixed(2)} €` : ''} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jour de paiement</label>
                <input type="number" min="1" max="28" value={jourPaiement} onChange={(e) => setJourPaiement(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              {!isVente && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dépôt de garantie (€)</label>
                  <input type="number" step="0.01" value={depotGarantie} onChange={(e) => setDepotGarantie(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              )}
              {isVente && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Apport initial (€ TTC)</label>
                  <input type="number" step="0.01" value={apportInitial} onChange={(e) => setApportInitial(e.target.value)} placeholder="Ex: 3000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              )}
            </div>

            {/* Totaux calculés */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-emerald-800 mb-2">📊 Synthèse financière</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600">Total HT :</span> <strong>{totalHt.toFixed(2)} €</strong></div>
                <div><span className="text-gray-600">Total TTC :</span> <strong>{totalTtc.toFixed(2)} €</strong></div>
                {isVente && apport > 0 && (
                  <>
                    <div><span className="text-gray-600">Apport initial :</span> <strong>{apport.toFixed(2)} €</strong></div>
                    <div><span className="text-gray-600">Total avec apport :</span> <strong>{(totalTtc + apport).toFixed(2)} €</strong></div>
                  </>
                )}
              </div>
            </div>

            {/* Champs spécifiques Location pure */}
            {!isVente && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-semibold text-gray-700">🚗 Kilométrage et franchises</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valeur résiduelle (€)</label>
                    <input type="number" step="0.01" value={valeurResiduelle} onChange={(e) => setValeurResiduelle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Km inclus</label>
                    <input type="number" value={kmInclus} onChange={(e) => setKmInclus(e.target.value)} placeholder="Ex: 3500" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Coût km supp (€)</label>
                    <input type="number" step="0.01" value={coutKmSupp} onChange={(e) => setCoutKmSupp(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Franchise vol (€)</label>
                    <input type="number" value={franchiseVol} onChange={(e) => setFranchiseVol(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Non restitué (€)</label>
                    <input type="number" value={franchiseNonRestitue} onChange={(e) => setFranchiseNonRestitue(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Dommages (€)</label>
                    <input type="number" value={franchiseDommages} onChange={(e) => setFranchiseDommages(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Partage 50/50 (€)</label>
                    <input type="number" value={franchisePartage} onChange={(e) => setFranchisePartage(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bris de glace (€)</label>
                    <input type="number" value={franchiseBrisGlace} onChange={(e) => setFranchiseBrisGlace(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Informations complémentaires..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        )}

        {/* ========== ÉTAPE 3 : RÉCAP ========== */}
        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-800">✅ Récapitulatif</h4>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Type :</span> <strong>{typeLabel}</strong></div>
                <div><span className="text-gray-500">Véhicule :</span> <strong>{immatriculation}</strong></div>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <span className="text-gray-500">Locataire :</span>{' '}
                <strong>
                  {selectedLocataire ? `${selectedLocataire.nom} ${selectedLocataire.prenom || ''}` : `${newNom} ${newPrenom}`.trim()}
                </strong>
                {createNew && <span className="text-xs text-emerald-600 ml-1">(nouveau)</span>}
              </div>

              <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Durée :</span> <strong>{dureeMois} mois</strong></div>
                <div><span className="text-gray-500">Début :</span> <strong>{new Date(dateDebut).toLocaleDateString('fr-FR')}</strong></div>
                <div><span className="text-gray-500">Fin :</span> <strong>{dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : '—'}</strong></div>
                <div><span className="text-gray-500">Jour paiement :</span> <strong>le {jourPaiement} du mois</strong></div>
              </div>

              <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Mensualité TTC :</span> <strong>{mensuelTtc.toFixed(2)} €</strong></div>
                <div><span className="text-gray-500">Mensualité HT :</span> <strong>{mensuelHt.toFixed(2)} €</strong></div>
                <div><span className="text-gray-500">Total TTC :</span> <strong className="text-emerald-700">{totalTtc.toFixed(2)} €</strong></div>
                <div><span className="text-gray-500">Total HT :</span> <strong>{totalHt.toFixed(2)} €</strong></div>
                {isVente && apport > 0 && (
                  <div className="col-span-2"><span className="text-gray-500">Apport initial :</span> <strong>{apport.toFixed(2)} €</strong></div>
                )}
                {!isVente && depotGarantie && (
                  <div><span className="text-gray-500">Dépôt garantie :</span> <strong>{parseFloat(depotGarantie).toFixed(2)} €</strong></div>
                )}
              </div>

              {kmDepart && (
                <div className="border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Km au départ :</span> <strong>{parseInt(kmDepart).toLocaleString()} km</strong>
                </div>
              )}

              {referenceContrat && (
                <div className="border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Référence :</span> <strong>{referenceContrat}</strong>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Prochaine étape :</strong> Après validation, un état des lieux de sortie sera à remplir, et {duree} échéances de paiement seront générées automatiquement.
              </p>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 justify-between mt-6 pt-4 border-t border-gray-200">
          <button onClick={step === 1 ? onClose : handlePrev} disabled={saving}
            className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50">
            <ArrowLeft className="w-4 h-4 mr-1" /> {step === 1 ? 'Annuler' : 'Précédent'}
          </button>
          {step < 3 ? (
            <button onClick={handleNext}
              className="inline-flex items-center px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium">
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button onClick={handleCreer} disabled={saving}
              className="inline-flex items-center px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
              {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Création...</>) : (<><Check className="w-4 h-4 mr-1" /> Créer le contrat</>)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}