import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, X, Check, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateAttestation, AttestationData } from '../lib/attestationGenerator';

interface RestitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;

  // ID de l'attribution active à clôturer
  attributionId: string;

  // Véhicule
  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  refTca: string | null;
  carteEssence: string | null;
  licenceTransport: string | null;

  // Chauffeur (depuis attribution active + profil)
  profilId: string;
  salarieNom: string;
  salariePrenom: string;
  salarieGenre: string | null;
  salarieMatriculeTca: string | null;
  salarieDateNaissance: string | null;
  salarieSecteurNom: string | null;

  // Données du DÉPART (depuis BDD)
  kmDepart: number;
  dateDepart: string;
  signatureChauffeurDepart: string;
  signatureAdminDepart: string;
  adminDepartNom: string;
  adminDepartPrenom: string;
  dateDepartResponsable: string;

  // Admin connecté qui fait la restitution
  adminId: string;
  adminNom: string;
  adminPrenom: string;
}

interface SignaturePadProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  disabled?: boolean;
}

function SignaturePad({ canvasRef, disabled }: SignaturePadProps) {
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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
      style={{ width: '100%', height: '128px', cursor: disabled ? 'not-allowed' : 'crosshair' }}
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

function formatDateFr(d: string): string {
  if (!d) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  const part = d.split('T')[0];
  const parts = part.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function RestitutionModal(props: RestitutionModalProps) {
  const {
    isOpen, onClose, onSuccess,
    attributionId, vehiculeId, immatriculation, marque, modele,
    refTca, carteEssence, licenceTransport,
    profilId, salarieNom, salariePrenom, salarieGenre, salarieMatriculeTca,
    salarieDateNaissance, salarieSecteurNom,
    kmDepart, dateDepart, signatureChauffeurDepart, signatureAdminDepart,
    adminDepartNom, adminDepartPrenom, dateDepartResponsable,
    adminId, adminNom, adminPrenom,
  } = props;

  const [kmRetour, setKmRetour] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const sigChauffeurRef = useRef<HTMLCanvasElement>(null);
  const sigAdminRef = useRef<HTMLCanvasElement>(null);

  const handleClearChauffeur = useCallback(() => clearCanvas(sigChauffeurRef.current), []);
  const handleClearAdmin = useCallback(() => clearCanvas(sigAdminRef.current), []);

  if (!isOpen) return null;

  const handleValider = async () => {
    setError(null);

    const kmR = parseInt(kmRetour, 10);
    if (!kmRetour || isNaN(kmR) || kmR < 0) {
      setError('Veuillez saisir un kilométrage de retour valide');
      return;
    }
    if (kmR < kmDepart) {
      setError(`Le km retour (${kmR}) doit être supérieur ou égal au km départ (${kmDepart})`);
      return;
    }
    if (isCanvasEmpty(sigChauffeurRef.current)) {
      setError('La signature du chauffeur est obligatoire');
      return;
    }
    if (isCanvasEmpty(sigAdminRef.current)) {
      setError('La signature du responsable est obligatoire');
      return;
    }

    setGenerating(true);

    try {
      const sigChauffeurRetour = sigChauffeurRef.current?.toDataURL('image/png') || '';
      const sigAdminRetour = sigAdminRef.current?.toDataURL('image/png') || '';

      // 1. Régénérer le PDF en mode RESTITUTION
      const data: AttestationData = {
        vehiculeId,
        immatriculation,
        marque,
        modele,
        ref_tca: refTca,
        carte_essence_numero: carteEssence,
        licence_transport_numero: licenceTransport,
        profilId,
        salarieNom,
        salariePrenom,
        salarieGenre,
        salarieMatriculeTca,
        salarieDateNaissance,
        salarieSecteurNom,
        adminId,
        adminNom,
        adminPrenom,
        kmDepart,
        attributionId,

        // Signatures DÉPART (depuis BDD)
        signatureChauffeurDataUrl: signatureChauffeurDepart,
        signatureAdminDataUrl: signatureAdminDepart,

        // Mode RESTITUTION
        isRestitution: true,
        kmRetour: kmR,
        signatureChauffeurRetourDataUrl: sigChauffeurRetour,
        signatureAdminRetourDataUrl: sigAdminRetour,

        // Données admin DÉPART d'origine (à réafficher en bas)
        adminNomDepartOrigine: adminDepartNom,
        adminPrenomDepartOrigine: adminDepartPrenom,
        dateDepartResponsableOrigine: formatDateFr(dateDepartResponsable),
        dateDepartOriginale: formatDateFr(dateDepart),
      };

      const result = await generateAttestation(data);

      if (!result.success || !result.pdfPath) {
        throw new Error(result.error || 'Erreur lors de la régénération du PDF');
      }

      // 2. Mettre à jour la BDD : clôture attribution + données retour
      const now = new Date();
      const dateRetour = now.toISOString().split('T')[0];
      const heureRetour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const { error: updateError } = await supabase
        .from('attribution_vehicule')
        .update({
          date_fin: dateRetour,
          km_retour: kmR,
          date_retour: dateRetour,
          heure_retour: heureRetour,
          signature_chauffeur_retour: sigChauffeurRetour,
          signature_admin_retour: sigAdminRetour,
          cloture_par: adminId,
        })
        .eq('id', attributionId);

      if (updateError) {
        throw new Error(`Erreur sauvegarde BDD: ${updateError.message}`);
      }

      // 3. Mettre véhicule en "sur_parc"
      const { error: vehUpdateError } = await supabase
        .from('vehicule')
        .update({ statut: 'sur_parc' })
        .eq('id', vehiculeId);

      if (vehUpdateError) {
        throw new Error(`Erreur statut véhicule: ${vehUpdateError.message}`);
      }

      console.log('[RestitutionModal] Restitution complète');
      setDone(true);
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[RestitutionModal] Erreur:', msg);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Restitution du véhicule
            </h3>
            <p className="text-sm text-gray-500">
              {immatriculation} · {marque} {modele} ← {salariePrenom} {salarieNom}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Infos départ en lecture seule */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">Données départ</p>
            <p className="text-sm text-blue-800">
              KM départ : <strong>{kmDepart}</strong> · Date départ : <strong>{formatDateFr(dateDepart)}</strong>
            </p>
          </div>

          {/* KM retour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kilométrage de retour <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={kmRetour}
              onChange={(e) => setKmRetour(e.target.value)}
              disabled={generating}
              placeholder={`Doit être ≥ ${kmDepart}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
            />
          </div>

          {/* Signature chauffeur retour */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Signature du chauffeur (RETOUR) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleClearChauffeur}
                disabled={generating}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" />
                Effacer
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <SignaturePad canvasRef={sigChauffeurRef} disabled={generating} />
            </div>
          </div>

          {/* Signature admin retour */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Signature du responsable RETOUR ({adminPrenom} {adminNom}) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleClearAdmin}
                disabled={generating}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" />
                Effacer
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <SignaturePad canvasRef={sigAdminRef} disabled={generating} />
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
              <p className="text-sm text-green-700">
                Véhicule restitué avec succès
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleValider}
            disabled={generating || done}
            className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement en cours...
              </>
            ) : done ? (
              <>
                <Check className="w-4 h-4" />
                Restitué
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Valider la restitution
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}