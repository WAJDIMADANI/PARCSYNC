import { useState, useRef, useEffect, useCallback } from 'react';
import { ClipboardList, X, Check, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // 🆕 D3 fix : pour récupérer user.id (auth.users.id)

// 🆕 ÉTAPE D3 : Modal de saisie d'un État Des Lieux (EDL).
// Version minimale : pas de photos, pas de PDF — juste sauvegarde en BDD.
// Photos en D4, PDF en D5, branchement restitution en D6.

export type EDLType = 'sortie' | 'retour';

interface EDLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;

  // Type d'EDL (déterminé par le contexte : attribution = sortie, restitution = retour)
  typeEdl: EDLType;

  // Liens
  attributionId: string;
  vehiculeId: string;
  profilId: string; // chauffeur

  // Affichage (lecture seule)
  immatriculation: string;
  marque: string;
  modele: string;
  refTca: string | null;
  salarieNom: string;
  salariePrenom: string;

  // Pré-remplissage km (depuis l'attestation)
  kmInitial: number;

  // Admin connecté qui réalise l'EDL
  adminId: string;
  adminNom: string;
  adminPrenom: string;
}

// ========== SignaturePad (copié à l'identique de AttestationSignatureModal) ==========
interface SignaturePadProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  disabled?: boolean;
}

function SignaturePad({ canvasRef, disabled }: SignaturePadProps) {
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    // 🆕 FIX MOBILE : pas de multiplication par scaleX/scaleY ici,
    // car ctx.scale(devicePixelRatio) s'en charge déjà dans le useEffect.
    // Sinon les coordonnées sont double-scalées et le trait sort de la zone visible sur mobile.
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio || 128;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const startDraw = (e: MouseEvent | TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      isDrawing.current = true;
      lastPos.current = getPos(e, canvas);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current || disabled) return;
      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.beginPath();
      if (lastPos.current) ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    };

    const stopDraw = () => {
      isDrawing.current = false;
      lastPos.current = null;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [canvasRef, disabled]);

  return (
<canvas
      ref={canvasRef}
      style={{ width: '100%', height: '128px', cursor: disabled ? 'not-allowed' : 'crosshair', touchAction: 'none' }}
      className="rounded-lg"
    />
  );
}

function isCanvasEmpty(canvas: HTMLCanvasElement | null): boolean {
  if (!canvas) return true;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false;
  }
  return true;
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ========== EDLModal ==========
export function EDLModal(props: EDLModalProps) {
  const {
    isOpen, onClose, onSuccess,
    typeEdl, attributionId, vehiculeId, profilId,
    immatriculation, marque, modele, refTca,
    salarieNom, salariePrenom,
    kmInitial,
    adminId, adminNom, adminPrenom,
  } = props;

  // États formulaire
  const [kilometrage, setKilometrage] = useState<string>(String(kmInitial || ''));
  const [dateValiditeCt, setDateValiditeCt] = useState<string>('');
  const [dateDerniereVidange, setDateDerniereVidange] = useState<string>('');
  const [dateProchaineRevision, setDateProchaineRevision] = useState<string>('');

  // Équipements (10 booléens — exactement comme la BDD)
  const [carrosserieAvant, setCarrosserieAvant] = useState(false);
  const [carrosserieArriere, setCarrosserieArriere] = useState(false);
  const [carrosserieGauche, setCarrosserieGauche] = useState(false);
  const [carrosserieDroite, setCarrosserieDroite] = useState(false);
  const [vitres, setVitres] = useState(false);
  const [retroviseurs, setRetroviseurs] = useState(false);
  const [pneus, setPneus] = useState(false);
  const [interieurSiege, setInterieurSiege] = useState(false);
  const [interieurTableauBord, setInterieurTableauBord] = useState(false);
  const [cricTriangleGilet, setCricTriangleGilet] = useState(false);

  const [observations, setObservations] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(true);

  const sigAgentRef = useRef<HTMLCanvasElement>(null);
  const sigChauffeurRef = useRef<HTMLCanvasElement>(null);

  // 🆕 D3 fix : etat_des_lieux.created_by a une FK vers auth.users(id), donc on doit
  // passer l'ID Supabase Auth (= user.id) et NON adminId qui est l'ID métier app_utilisateur.
  const { user } = useAuth();

  const handleClearAgent = useCallback(() => clearCanvas(sigAgentRef.current), []);
  const handleClearChauffeur = useCallback(() => clearCanvas(sigChauffeurRef.current), []);

  // 🆕 ÉTAPE D3 : Pré-remplissage des dates depuis BDD (Option B — défensif)
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const prefillDates = async () => {
      setLoadingPrefill(true);
      try {
        // 1. Date validité CT — chercher dans document_vehicule
        // Stratégie défensive : LIKE pour tolérer plusieurs nommages possibles
        const { data: docCt } = await supabase
          .from('document_vehicule')
          .select('date_expiration, type_document')
          .eq('vehicule_id', vehiculeId)
          .eq('actif', true)
          .or('type_document.ilike.%controle%technique%,type_document.ilike.%controle_technique%,type_document.ilike.ct,type_document.ilike.CT')
          .order('date_expiration', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && docCt?.date_expiration) {
          setDateValiditeCt(docCt.date_expiration);
        }

        // 2. Date dernière vidange — chercher dans maintenance (la plus récente avec type contenant "vidange")
        const { data: maintVidange } = await supabase
          .from('maintenance')
          .select('date_intervention, type')
          .eq('vehicule_id', vehiculeId)
          .ilike('type', '%vidange%')
          .order('date_intervention', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && maintVidange?.date_intervention) {
          setDateDerniereVidange(maintVidange.date_intervention);
        }

        // 3. Date prochaine révision — chercher dans maintenance (prochain_controle_date la plus récente)
        const { data: maintRevision } = await supabase
          .from('maintenance')
          .select('prochain_controle_date')
          .eq('vehicule_id', vehiculeId)
          .not('prochain_controle_date', 'is', null)
          .order('prochain_controle_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && maintRevision?.prochain_controle_date) {
          setDateProchaineRevision(maintRevision.prochain_controle_date);
        }
      } catch (err) {
        // Stratégie défensive : si erreur, on laisse les champs vides, l'admin remplira
        console.warn('[EDLModal] Pré-remplissage dates partiellement échoué:', err);
      } finally {
        if (!cancelled) setLoadingPrefill(false);
      }
    };

    prefillDates();
    return () => { cancelled = true; };
  }, [isOpen, vehiculeId]);

  if (!isOpen) return null;

  const handleValider = async () => {
    setError(null);

    // Validations
    const km = parseInt(kilometrage, 10);
    if (!kilometrage || isNaN(km) || km < 0) {
      setError('Veuillez saisir un kilométrage valide');
      return;
    }
    if (km < kmInitial) {
      setError(`Le kilométrage (${km}) doit être ≥ au km de l'attribution (${kmInitial})`);
      return;
    }
    if (isCanvasEmpty(sigAgentRef.current)) {
      setError('La signature de l\'agent est obligatoire');
      return;
    }
    if (isCanvasEmpty(sigChauffeurRef.current)) {
      setError('La signature du chauffeur est obligatoire');
      return;
    }

    setSaving(true);

    try {
      const sigAgent = sigAgentRef.current?.toDataURL('image/png') || '';
      const sigChauffeur = sigChauffeurRef.current?.toDataURL('image/png') || '';

      // 1. INSERT dans etat_des_lieux
      const { error: insertError } = await supabase
        .from('etat_des_lieux')
        .insert({
          vehicule_id: vehiculeId,
          profil_id: profilId,
          attribution_id: attributionId,
          type_edl: typeEdl,
          kilometrage: km,
          date_validite_ct: dateValiditeCt || null,
          date_derniere_vidange: dateDerniereVidange || null,
          date_prochaine_revision: dateProchaineRevision || null,
          carrosserie_avant: carrosserieAvant,
          carrosserie_arriere: carrosserieArriere,
          carrosserie_gauche: carrosserieGauche,
          carrosserie_droite: carrosserieDroite,
          vitres: vitres,
          retroviseurs: retroviseurs,
          pneus: pneus,
          interieur_siege: interieurSiege,
          interieur_tableau_bord: interieurTableauBord,
          cric_triangle_gilet: cricTriangleGilet,
          observations: observations || null,
          signature_agent: sigAgent,
          signature_chauffeur: sigChauffeur,
          created_by: user?.id || null, // 🆕 D3 fix : auth.users.id (FK exige cet ID)
          statut: 'finalise', // 🆕 D3 fix : valeurs autorisées par contrainte CHECK = 'en_cours' | 'finalise'
        });

      if (insertError) {
        throw new Error(`Erreur sauvegarde EDL: ${insertError.message}`);
      }

      // 2. 🆕 ÉTAPE D3 - Option A : Mise à jour kilometrage_actuel du véhicule
      const { error: kmUpdateError } = await supabase
        .from('vehicule')
        .update({
          kilometrage_actuel: km,
          derniere_maj_kilometrage: new Date().toISOString().split('T')[0],
        })
        .eq('id', vehiculeId);

      if (kmUpdateError) {
        // Non bloquant : on log juste, l'EDL est sauvegardé
        console.warn('[EDLModal] MAJ kilometrage_actuel échouée:', kmUpdateError);
      }

      console.log('[EDLModal] EDL enregistré avec succès');
      setDone(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[EDLModal] Erreur:', msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const titre = typeEdl === 'sortie' ? 'État des lieux — Sortie' : 'État des lieux — Retour';
  const colorMain = typeEdl === 'sortie' ? 'emerald' : 'orange';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 bg-${colorMain}-100 rounded-full flex items-center justify-center`}>
            <ClipboardList className={`w-5 h-5 text-${colorMain}-600`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{titre}</h3>
            <p className="text-sm text-gray-500">
              {immatriculation} · {marque} {modele}
              {refTca && ` · Réf. ${refTca}`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bloc lecture seule */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Conducteur :</span> <strong>{salariePrenom} {salarieNom}</strong></div>
            <div><span className="text-gray-500">Réalisé par :</span> <strong>{adminPrenom} {adminNom}</strong></div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Kilométrage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kilométrage <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={kilometrage}
              onChange={(e) => setKilometrage(e.target.value)}
              disabled={saving}
              placeholder={`Min : ${kmInitial}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* 3 dates */}
          {loadingPrefill && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Recherche des informations véhicule...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date validité CT</label>
              <input
                type="date"
                value={dateValiditeCt}
                onChange={(e) => setDateValiditeCt(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dernière vidange</label>
              <input
                type="date"
                value={dateDerniereVidange}
                onChange={(e) => setDateDerniereVidange(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine révision</label>
              <input
                type="date"
                value={dateProchaineRevision}
                onChange={(e) => setDateProchaineRevision(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Équipements — checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Équipements vérifiés (cocher si conforme)
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={carrosserieAvant} onChange={(e) => setCarrosserieAvant(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Carrosserie avant
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={carrosserieArriere} onChange={(e) => setCarrosserieArriere(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Carrosserie arrière
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={carrosserieGauche} onChange={(e) => setCarrosserieGauche(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Carrosserie côté gauche
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={carrosserieDroite} onChange={(e) => setCarrosserieDroite(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Carrosserie côté droit
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={vitres} onChange={(e) => setVitres(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Vitres
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={retroviseurs} onChange={(e) => setRetroviseurs(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Rétroviseurs
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={pneus} onChange={(e) => setPneus(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Pneus
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={interieurSiege} onChange={(e) => setInterieurSiege(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Intérieur — Sièges
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={interieurTableauBord} onChange={(e) => setInterieurTableauBord(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Intérieur — Tableau de bord
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cricTriangleGilet} onChange={(e) => setCricTriangleGilet(e.target.checked)} disabled={saving} className="w-4 h-4" />
                Cric / Triangle / Gilet
              </label>
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Remarques particulières..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none disabled:bg-gray-50"
            />
          </div>

          {/* Signature agent */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Signature de l'agent ({adminPrenom} {adminNom}) <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={handleClearAgent} disabled={saving} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
                <RefreshCw className="w-3 h-3" />
                Effacer
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <SignaturePad canvasRef={sigAgentRef} disabled={saving} />
            </div>
          </div>

          {/* Signature chauffeur */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Signature du chauffeur ({salariePrenom} {salarieNom}) <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={handleClearChauffeur} disabled={saving} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50">
                <RefreshCw className="w-3 h-3" />
                Effacer
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <SignaturePad canvasRef={sigChauffeurRef} disabled={saving} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {done && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">État des lieux enregistré avec succès</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleValider}
            disabled={saving || done}
            className={`px-4 py-2 text-white bg-${colorMain}-600 rounded-lg hover:bg-${colorMain}-700 font-medium disabled:opacity-50 flex items-center gap-2`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : done ? (
              <>
                <Check className="w-4 h-4" />
                EDL enregistré
              </>
            ) : (
              <>
                <ClipboardList className="w-4 h-4" />
                Valider l'EDL
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}