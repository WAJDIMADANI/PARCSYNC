import { useState, useRef, useEffect, useCallback } from 'react';
import { ClipboardList, X, Check, RefreshCw, Loader2, Camera, Trash2, Plus, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateEDL, EDLGenerationData } from '../lib/edlGenerator'; // 🆕 D5

export type EDLType = 'sortie' | 'entree';

interface EDLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  typeEdl: EDLType;
  attributionId: string;
  vehiculeId: string;
  profilId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  refTca: string | null;
  salarieNom: string;
  salariePrenom: string;
  kmInitial: number;
  adminId: string;
  adminNom: string;
  adminPrenom: string;
}

// ========== Types Photos ==========
interface PhotoSlot {
  id: string;
  angle: string;
  label: string;
  required: boolean; // recommandé mais pas bloquant
  previewUrl: string | null;
  storagePath: string | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

const FIXED_ANGLES: { angle: string; label: string }[] = [
  { angle: 'avant', label: 'Avant' },
  { angle: 'arriere', label: 'Arrière' },
  { angle: 'gauche', label: 'Côté gauche' },
  { angle: 'droite', label: 'Côté droit' },
  { angle: 'compteur', label: 'Compteur (km)' },
  { angle: 'interieur', label: 'Intérieur' },
  { angle: 'coffre', label: 'Coffre' },
];

// ========== Compression photo ==========
function compressImage(file: File, maxWidth: number = 1600, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas non disponible'));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression échouée'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}

// ========== SignaturePad ==========
interface SignaturePadProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  disabled?: boolean;
}

function SignaturePad({ canvasRef, disabled }: SignaturePadProps) {
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
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

  const [kilometrage, setKilometrage] = useState<string>(String(kmInitial || ''));
  const [dateValiditeCt, setDateValiditeCt] = useState<string>('');
  const [dateDerniereVidange, setDateDerniereVidange] = useState<string>('');
  const [dateProchaineRevision, setDateProchaineRevision] = useState<string>('');

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
  const { user } = useAuth();

  // 🆕 D4 : État des photos
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(() =>
    FIXED_ANGLES.map((a) => ({
      id: `fixed-${a.angle}`,
      angle: a.angle,
      label: a.label,
      required: true,
      previewUrl: null,
      storagePath: null,
      uploading: false,
      uploaded: false,
      error: null,
    }))
  );
  const [freePhotoCount, setFreePhotoCount] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleClearAgent = useCallback(() => clearCanvas(sigAgentRef.current), []);
  const handleClearChauffeur = useCallback(() => clearCanvas(sigChauffeurRef.current), []);

  // Pré-remplissage des dates depuis BDD (Option B)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const prefillDates = async () => {
      setLoadingPrefill(true);
      try {
        const { data: docCt } = await supabase
          .from('document_vehicule')
          .select('date_expiration, type_document')
          .eq('vehicule_id', vehiculeId)
          .eq('actif', true)
          .or('type_document.ilike.%controle%technique%,type_document.ilike.%controle_technique%,type_document.ilike.ct,type_document.ilike.CT')
          .order('date_expiration', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && docCt?.date_expiration) setDateValiditeCt(docCt.date_expiration);

        const { data: maintVidange } = await supabase
          .from('maintenance')
          .select('date_intervention, type')
          .eq('vehicule_id', vehiculeId)
          .ilike('type', '%vidange%')
          .order('date_intervention', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && maintVidange?.date_intervention) setDateDerniereVidange(maintVidange.date_intervention);

        const { data: maintRevision } = await supabase
          .from('maintenance')
          .select('prochain_controle_date')
          .eq('vehicule_id', vehiculeId)
          .not('prochain_controle_date', 'is', null)
          .order('prochain_controle_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && maintRevision?.prochain_controle_date) setDateProchaineRevision(maintRevision.prochain_controle_date);
      } catch (err) {
        console.warn('[EDLModal] Pré-remplissage dates échoué:', err);
      } finally {
        if (!cancelled) setLoadingPrefill(false);
      }
    };
    prefillDates();
    return () => { cancelled = true; };
  }, [isOpen, vehiculeId]);

  if (!isOpen) return null;

  // 🆕 D4 : Upload immédiat d'une photo avec compression
  const handlePhotoSelect = async (slotId: string, file: File) => {
    // Mettre à jour le state : uploading
    setPhotoSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, uploading: true, error: null, previewUrl: URL.createObjectURL(file) } : s))
    );

    try {
      // Compresser
      const compressed = await compressImage(file, 1600, 0.8);
      const slot = photoSlots.find((s) => s.id === slotId);
      if (!slot) return;

      // Chemin : edl-photos/{vehiculeId}/{timestamp}_{angle}.jpg
      const timestamp = Date.now();
      const path = `${vehiculeId}/${timestamp}_${slot.angle}.jpg`;

      // Upload vers Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('edl-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      // Succès
      setPhotoSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, uploading: false, uploaded: true, storagePath: path } : s))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      setPhotoSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, uploading: false, error: msg } : s))
      );
    }
  };

  // 🆕 D4 : Supprimer une photo uploadée
  const handlePhotoDelete = async (slotId: string) => {
    const slot = photoSlots.find((s) => s.id === slotId);
    if (!slot) return;

    // Supprimer de Storage si déjà uploadée
    if (slot.storagePath) {
      await supabase.storage.from('edl-photos').remove([slot.storagePath]);
    }

    // Revoquer l'URL de preview
    if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);

    // Si c'est un slot libre, le supprimer complètement
    if (!slot.required) {
      setPhotoSlots((prev) => prev.filter((s) => s.id !== slotId));
    } else {
      // Si c'est un slot fixe, le réinitialiser
      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, previewUrl: null, storagePath: null, uploaded: false, uploading: false, error: null } : s
        )
      );
    }
  };

  // 🆕 D4 : Ajouter un slot photo libre
  const handleAddFreePhoto = () => {
    const newCount = freePhotoCount + 1;
    setFreePhotoCount(newCount);
    setPhotoSlots((prev) => [
      ...prev,
      {
        id: `libre-${newCount}`,
        angle: `libre`,
        label: `Photo libre n°${newCount}`,
        required: false,
        previewUrl: null,
        storagePath: null,
        uploading: false,
        uploaded: false,
        error: null,
      },
    ]);
  };

  const handleValider = async () => {
    setError(null);

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
      setError("La signature de l'agent est obligatoire");
      return;
    }
    if (isCanvasEmpty(sigChauffeurRef.current)) {
      setError('La signature du chauffeur est obligatoire');
      return;
    }

    // 🆕 D4 : Vérifier qu'aucun upload n'est en cours
    const stillUploading = photoSlots.some((s) => s.uploading);
    if (stillUploading) {
      setError("Des photos sont encore en cours d'upload. Veuillez patienter.");
      return;
    }

    setSaving(true);

    try {
      const sigAgent = sigAgentRef.current?.toDataURL('image/png') || '';
      const sigChauffeur = sigChauffeurRef.current?.toDataURL('image/png') || '';

      // 🆕 D4 : Compter les photos uploadées
      const uploadedPhotos = photoSlots.filter((s) => s.uploaded && s.storagePath);

      // 1. INSERT dans etat_des_lieux
      const { data: insertedEdl, error: insertError } = await supabase
        .from('etat_des_lieux')
        .insert({
          vehicule_id: vehiculeId,
         profil_id: profilId || null,
          attribution_id: attributionId || null,
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
          created_by: user?.id || null,
          statut: 'finalise',
        })
        .select('id')
        .single();

      if (insertError || !insertedEdl) {
        throw new Error(`Erreur sauvegarde EDL: ${insertError?.message || 'Pas d\'ID retourné'}`);
      }

      const edlId = insertedEdl.id;

      // 🆕 D4 : INSERT des photos dans etat_des_lieux_photos
      if (uploadedPhotos.length > 0) {
        const photoRecords = uploadedPhotos.map((p) => ({
          edl_id: edlId,
          angle: p.angle,
          photo_path: p.storagePath!,
        }));

        const { error: photoInsertError } = await supabase
          .from('etat_des_lieux_photos')
          .insert(photoRecords);

        if (photoInsertError) {
          // Non bloquant : EDL est sauvé, les photos sont dans Storage, juste la ref BDD a échoué
          console.warn('[EDLModal] Erreur insertion photos BDD:', photoInsertError);
        }
      }

// 🆕 D5 : Génération du PDF EDL (non bloquant — si ça plante, l'EDL est quand même sauvé)
      try {
        const uploadedPhotos2 = photoSlots.filter((s) => s.uploaded && s.storagePath);
        const edlPdfData: EDLGenerationData = {
          edlId,
          typeEdl,
          vehiculeId,
          immatriculation,
          marque,
          modele,
          refTca,
          conducteurNom: salarieNom,
          conducteurPrenom: salariePrenom,
          adminNom,
          adminPrenom,
          kilometrage: km,
          dateValiditeCt: dateValiditeCt || null,
          dateDerniereVidange: dateDerniereVidange || null,
          dateProchaineRevision: dateProchaineRevision || null,
          carrosserieAvant,
          carrosserieArriere,
          carrosserieGauche,
          carrosserieDroite,
          vitres,
          retroviseurs,
          pneus,
          interieurSiege,
          interieurTableauBord,
          cricTriangleGilet,
          observations: observations || null,
          nbPhotos: uploadedPhotos2.length,
          signatureAgentDataUrl: sigAgent,
          signatureChauffeurDataUrl: sigChauffeur,
        };

        const pdfResult = await generateEDL(edlPdfData);

        if (pdfResult.success && pdfResult.pdfPath) {
          // Sauver le chemin PDF dans etat_des_lieux
          await supabase
            .from('etat_des_lieux')
            .update({ pdf_path: pdfResult.pdfPath })
            .eq('id', edlId);
          console.log('[EDLModal] PDF EDL généré et sauvé:', pdfResult.pdfPath);
        } else {
          console.warn('[EDLModal] Génération PDF échouée (non bloquant):', pdfResult.error);
        }
      } catch (pdfErr) {
        console.warn('[EDLModal] Erreur génération PDF (non bloquant):', pdfErr);
      }

      // 2. Mise à jour kilometrage_actuel du véhicule
      const { error: kmUpdateError } = await supabase
        .from('vehicule')
        .update({
          kilometrage_actuel: km,
          derniere_maj_kilometrage: new Date().toISOString().split('T')[0],
        })
        .eq('id', vehiculeId);

      if (kmUpdateError) {
        console.warn('[EDLModal] MAJ kilometrage_actuel échouée:', kmUpdateError);
      }

      console.log(`[EDLModal] EDL enregistré avec ${uploadedPhotos.length} photo(s)`);
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

  // 🆕 D4 : Compteur photos
  const nbPhotosUploaded = photoSlots.filter((s) => s.uploaded).length;
  const nbPhotosTotal = photoSlots.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{titre}</h3>
            <p className="text-sm text-gray-500">
              {immatriculation} · {marque} {modele}
              {refTca && ` · Réf. ${refTca}`}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage <span className="text-red-500">*</span></label>
            <input type="number" value={kilometrage} onChange={(e) => setKilometrage(e.target.value)} disabled={saving} placeholder={`Min : ${kmInitial}`} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
          </div>

          {/* 3 dates */}
          {loadingPrefill && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Recherche des informations véhicule...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date validité CT</label>
              <input type="date" value={dateValiditeCt} onChange={(e) => setDateValiditeCt(e.target.value)} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dernière vidange</label>
              <input type="date" value={dateDerniereVidange} onChange={(e) => setDateDerniereVidange(e.target.value)} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine révision</label>
              <input type="date" value={dateProchaineRevision} onChange={(e) => setDateProchaineRevision(e.target.value)} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
            </div>
          </div>

          {/* Équipements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Équipements vérifiés (cocher si conforme)</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={carrosserieAvant} onChange={(e) => setCarrosserieAvant(e.target.checked)} disabled={saving} className="w-4 h-4" /> Carrosserie avant</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={carrosserieArriere} onChange={(e) => setCarrosserieArriere(e.target.checked)} disabled={saving} className="w-4 h-4" /> Carrosserie arrière</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={carrosserieGauche} onChange={(e) => setCarrosserieGauche(e.target.checked)} disabled={saving} className="w-4 h-4" /> Carrosserie côté gauche</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={carrosserieDroite} onChange={(e) => setCarrosserieDroite(e.target.checked)} disabled={saving} className="w-4 h-4" /> Carrosserie côté droit</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={vitres} onChange={(e) => setVitres(e.target.checked)} disabled={saving} className="w-4 h-4" /> Vitres</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={retroviseurs} onChange={(e) => setRetroviseurs(e.target.checked)} disabled={saving} className="w-4 h-4" /> Rétroviseurs</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={pneus} onChange={(e) => setPneus(e.target.checked)} disabled={saving} className="w-4 h-4" /> Pneus</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={interieurSiege} onChange={(e) => setInterieurSiege(e.target.checked)} disabled={saving} className="w-4 h-4" /> Intérieur — Sièges</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={interieurTableauBord} onChange={(e) => setInterieurTableauBord(e.target.checked)} disabled={saving} className="w-4 h-4" /> Intérieur — Tableau de bord</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={cricTriangleGilet} onChange={(e) => setCricTriangleGilet(e.target.checked)} disabled={saving} className="w-4 h-4" /> Cric / Triangle / Gilet</label>
            </div>
          </div>

          {/* 🆕 D4 : PHOTOS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="w-4 h-4 inline mr-1" />
              Photos du véhicule ({nbPhotosUploaded}/{nbPhotosTotal})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photoSlots.map((slot) => (
                <div key={slot.id} className="relative">
                  {slot.previewUrl ? (
                    // Photo prise — affichage thumbnail
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={slot.previewUrl} alt={slot.label} className="w-full h-full object-cover" />
                      {slot.uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                      {slot.uploaded && (
                        <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {slot.error && (
                        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
                          Erreur
                        </div>
                      )}
                      {!saving && !slot.uploading && (
                        <button
                          onClick={() => handlePhotoDelete(slot.id)}
                          className="absolute top-1 left-1 bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 text-center truncate">
                        {slot.label}
                      </div>
                    </div>
                  ) : (
                    // Slot vide — bouton pour prendre/choisir photo
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[slot.id]?.click()}
                      disabled={saving}
                      className="aspect-[4/3] w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500 text-center px-1 leading-tight">{slot.label}</span>
                    </button>
                  )}
                  {/* Input file caché */}
                  <input
                    ref={(el) => { fileInputRefs.current[slot.id] = el; }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoSelect(slot.id, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              ))}

              {/* Bouton + Photo libre */}
              <button
                type="button"
                onClick={handleAddFreePhoto}
                disabled={saving}
                className="aspect-[4/3] w-full border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <Plus className="w-6 h-6 text-blue-400" />
                <span className="text-xs text-blue-500 font-medium">Photo libre</span>
              </button>
            </div>
            {nbPhotosUploaded === 0 && (
              <p className="text-xs text-amber-600 mt-1">Les photos sont recommandées mais pas obligatoires</p>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} disabled={saving} rows={3} placeholder="Remarques particulières..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none disabled:bg-gray-50" />
          </div>

          {/* Signature agent */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Signature de l'agent ({adminPrenom} {adminNom}) <span className="text-red-500">*</span></label>
              <button type="button" onClick={handleClearAgent} disabled={saving} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"><RefreshCw className="w-3 h-3" /> Effacer</button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <SignaturePad canvasRef={sigAgentRef} disabled={saving} />
            </div>
          </div>

          {/* Signature chauffeur */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Signature du chauffeur ({salariePrenom} {salarieNom}) <span className="text-red-500">*</span></label>
              <button type="button" onClick={handleClearChauffeur} disabled={saving} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"><RefreshCw className="w-3 h-3" /> Effacer</button>
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
              <p className="text-sm text-green-700">État des lieux enregistré avec succès ({nbPhotosUploaded} photo{nbPhotosUploaded > 1 ? 's' : ''} jointe{nbPhotosUploaded > 1 ? 's' : ''})</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50">Annuler</button>
          <button
            onClick={handleValider}
            disabled={saving || done}
            className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
            ) : done ? (
              <><Check className="w-4 h-4" /> EDL enregistré</>
            ) : (
              <><ClipboardList className="w-4 h-4" /> Valider l'EDL</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}