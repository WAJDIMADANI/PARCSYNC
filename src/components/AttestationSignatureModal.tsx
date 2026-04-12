import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, X, Check, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateAttestation, AttestationData } from '../lib/attestationGenerator';

interface AttestationSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pdfPath: string, kmDepart: number) => void;

  attributionId: string;

  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  refTca: string | null;
  carteEssence: string | null;
  licenceTransport: string | null;

  profilId: string;
  salarieNom: string;
  salariePrenom: string;
  salarieGenre: string | null;
  salarieMatriculeTca: string | null;
  salarieDateNaissance: string | null;
  salarieSecteurNom: string | null;

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
      if (lastPos.current) {
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
      }
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

export function AttestationSignatureModal(props: AttestationSignatureModalProps) {
  const {
    isOpen,
    onClose,
    onSuccess,
    attributionId,
    vehiculeId,
    immatriculation,
    marque,
    modele,
    refTca,
    carteEssence,
    licenceTransport,
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
  } = props;

  const [kmDepart, setKmDepart] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  const sigChauffeurRef = useRef<HTMLCanvasElement>(null);
  const sigAdminRef = useRef<HTMLCanvasElement>(null);

  const handleClearChauffeur = useCallback(() => clearCanvas(sigChauffeurRef.current), []);
  const handleClearAdmin = useCallback(() => clearCanvas(sigAdminRef.current), []);

  if (!isOpen) return null;

  const handleGenerer = async () => {
    setError(null);

    const km = parseInt(kmDepart, 10);
    if (!kmDepart || isNaN(km) || km < 0) {
      setError('Veuillez saisir un kilométrage de départ valide');
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
      const signatureChauffeurDataUrl = sigChauffeurRef.current?.toDataURL('image/png') || '';
      const signatureAdminDataUrl = sigAdminRef.current?.toDataURL('image/png') || '';

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

        kmDepart: km,
        attributionId,
        signatureChauffeurDataUrl,
        signatureAdminDataUrl,
      };

      const result = await generateAttestation(data);

      if (!result.success || !result.pdfPath) {
        throw new Error(result.error || 'Erreur lors de la génération du PDF');
      }

      const { error: updateError } = await supabase
        .from('attribution_vehicule')
        .update({
          document_pdf_path: result.pdfPath,
          signature_chauffeur: signatureChauffeurDataUrl,
          signature_admin: signatureAdminDataUrl,
          km_depart: km,
          attribue_par: adminId,
        })
        .eq('id', attributionId);

      if (updateError) {
        throw new Error(`Erreur sauvegarde BDD: ${updateError.message}`);
      }

      setPdfPath(result.pdfPath);
      onSuccess(result.pdfPath, km);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Attestation de mise à disposition
            </h3>
            <p className="text-sm text-gray-500">
              {immatriculation} · {marque} {modele} → {salariePrenom} {salarieNom}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kilométrage de départ <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={kmDepart}
              onChange={(e) => setKmDepart(e.target.value)}
              disabled={generating}
              placeholder="Ex: 12500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Signature du chauffeur <span className="text-red-500">*</span>
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
            <p className="text-xs text-gray-400 mt-1">
              Le chauffeur signe avec le doigt ou la souris
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Signature du responsable ({adminPrenom} {adminNom}){' '}
                <span className="text-red-500">*</span>
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

          {pdfPath && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">
                Attestation générée avec succès
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
            onClick={handleGenerer}
            disabled={generating || !!pdfPath}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération en cours...
              </>
            ) : pdfPath ? (
              <>
                <Check className="w-4 h-4" />
                Attestation générée
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Générer l'attestation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}