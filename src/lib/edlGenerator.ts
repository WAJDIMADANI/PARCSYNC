import * as fflate from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export interface EDLGenerationData {
  edlId: string;
  typeEdl: 'sortie' | 'entree';
  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  refTca: string | null;

  conducteurNom: string;
  conducteurPrenom: string;

  adminNom: string;
  adminPrenom: string;

  kilometrage: number;
  dateValiditeCt: string | null;
  dateDerniereVidange: string | null;
  dateProchaineRevision: string | null;

  carrosserieAvant: boolean;
  carrosserieArriere: boolean;
  carrosserieGauche: boolean;
  carrosserieDroite: boolean;
  vitres: boolean;
  retroviseurs: boolean;
  pneus: boolean;
  interieurSiege: boolean;
  interieurTableauBord: boolean;
  cricTriangleGilet: boolean;

  observations: string | null;
  nbPhotos: number;

  signatureAgentDataUrl: string;
  signatureChauffeurDataUrl: string;
}

export interface EDLGenerationResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
}

// ============================================================
// HELPERS (copiés de attestationGenerator.ts)
// ============================================================

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch {
    return '';
  }
}

function dateAujourdhuiFr(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function sanitizeForXml(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ============================================================
// REMPLACEMENT VARIABLES (gère fragmentation XML — copié de attestationGenerator.ts)
// ============================================================

function replaceVariablesAcrossWT(xmlContent: string, variables: Record<string, string>, xmlPath: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error(`XML parse error in ${xmlPath}`);

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  let textNodes = doc.getElementsByTagNameNS(ns, 't');
  if (!textNodes || textNodes.length === 0) textNodes = doc.getElementsByTagName('w:t');
  if (!textNodes || textNodes.length === 0) return xmlContent;

  interface Segment { node: Element; text: string; }
  const segments: Segment[] = [];
  for (let i = 0; i < textNodes.length; i++) {
    segments.push({ node: textNodes[i], text: textNodes[i].textContent || '' });
  }

  const plainText = segments.map(s => s.text).join('');
  const variableRegex = /\{\{[\s\u00A0]*([a-zA-Z0-9_]+)[\s\u00A0]*\}\}/g;
  const replacements: { startChar: number; endChar: number; varName: string; value: string }[] = [];

  let m;
  while ((m = variableRegex.exec(plainText)) !== null) {
    const varName = m[1].toLowerCase().trim();
    let value = '';
    for (const [key, val] of Object.entries(variables)) {
      if (key.toLowerCase() === varName) { value = val; break; }
    }
    replacements.push({
      startChar: m.index,
      endChar: m.index + m[0].length,
      varName,
      value: sanitizeForXml(value),
    });
  }

  if (replacements.length === 0) return xmlContent;
  replacements.sort((a, b) => b.startChar - a.startChar);

  replacements.forEach(rep => {
    let cumul = 0, startSegIdx = -1, startOff = 0, endSegIdx = -1, endOff = 0;
    for (let i = 0; i < segments.length; i++) {
      const segLen = segments[i].text.length;
      if (startSegIdx === -1 && cumul + segLen > rep.startChar) {
        startSegIdx = i;
        startOff = rep.startChar - cumul;
      }
      if (endSegIdx === -1 && cumul + segLen >= rep.endChar) {
        endSegIdx = i;
        endOff = rep.endChar - cumul;
        break;
      }
      cumul += segLen;
    }
    if (startSegIdx === -1 || endSegIdx === -1) return;

    if (startSegIdx === endSegIdx) {
      const seg = segments[startSegIdx];
      seg.node.textContent = seg.text.substring(0, startOff) + rep.value + seg.text.substring(endOff);
      seg.text = seg.node.textContent || '';
    } else {
      const startSeg = segments[startSegIdx];
      const endSeg = segments[endSegIdx];
      startSeg.node.textContent = startSeg.text.substring(0, startOff) + rep.value;
      startSeg.text = startSeg.node.textContent || '';
      for (let i = startSegIdx + 1; i < endSegIdx; i++) {
        segments[i].node.textContent = '';
        segments[i].text = '';
      }
      endSeg.node.textContent = endSeg.text.substring(endOff);
      endSeg.text = endSeg.node.textContent || '';
    }
  });

  return new XMLSerializer().serializeToString(doc);
}

// ============================================================
// COORDONNÉES SIGNATURES EDL (page A4 = 595.32 x 841.92)
// ⚠️ Ces coordonnées devront être calibrées après le premier test PDF
// ============================================================

const PAGE_HEIGHT = 841.92;

// Signature AGENT (colonne gauche, en bas du document)
const SIG_AGENT = { x: 60, yTop: 720, width: 180, height: 60 };

// Signature CHAUFFEUR (colonne droite, en bas du document)
const SIG_CHAUFFEUR = { x: 350, yTop: 720, width: 180, height: 60 };

async function stampSignaturesOnPdf(
  pdfBytes: Uint8Array,
  sigAgent: string,
  sigChauffeur: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  // Stamper sur la DERNIÈRE page (les signatures sont en bas du document)
  const page = pages[pages.length - 1];
  if (!page) throw new Error('PDF vide');

  const stamp = async (dataUrl: string, coords: { x: number; yTop: number; width: number; height: number }) => {
    if (!dataUrl) return;
    const img = await pdfDoc.embedPng(dataUrlToBytes(dataUrl));
    const y = PAGE_HEIGHT - coords.yTop - coords.height;
    page.drawImage(img, { x: coords.x, y, width: coords.width, height: coords.height });
  };

  if (sigAgent) await stamp(sigAgent, SIG_AGENT);
  if (sigChauffeur) await stamp(sigChauffeur, SIG_CHAUFFEUR);

  return pdfDoc.save();
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

const TEMPLATE_BUCKET = 'documents-vehicules';
const TEMPLATE_PATH = 'templates/edl.docx';
const OUTPUT_BUCKET = 'edl-documents';

export async function generateEDL(data: EDLGenerationData): Promise<EDLGenerationResult> {
  try {
    const typeLabel = data.typeEdl === 'sortie' ? 'SORTIE' : 'RETOUR';
    console.log(`[edlGenerator] Génération PDF EDL ${typeLabel} pour ${data.immatriculation}`);

    // 1. Construire les variables
    const conforme = '✓ Conforme';
    const nonConforme = '✗ Non conforme';

    const variables: Record<string, string> = {
      type_edl: typeLabel,
      date_edl: dateAujourdhuiFr(),
      realise_par: `${data.adminPrenom} ${data.adminNom}`.trim(),
      conducteur: `${data.conducteurPrenom} ${data.conducteurNom}`.trim(),
      vehicule: `${data.marque} ${data.modele}`.trim(),
      immatriculation: data.immatriculation,
      ref_tca: data.refTca || '',
      km_vehicule: String(data.kilometrage),
      date_validite_ct: formatDateFr(data.dateValiditeCt),
      date_derniere_vidange: formatDateFr(data.dateDerniereVidange),
      date_prochaine_revision: formatDateFr(data.dateProchaineRevision),
      observations: data.observations || 'RAS',
      nb_photos: String(data.nbPhotos),
      eq_carrosserie_avant: data.carrosserieAvant ? conforme : nonConforme,
      eq_carrosserie_arriere: data.carrosserieArriere ? conforme : nonConforme,
      eq_carrosserie_gauche: data.carrosserieGauche ? conforme : nonConforme,
      eq_carrosserie_droite: data.carrosserieDroite ? conforme : nonConforme,
      eq_vitres: data.vitres ? conforme : nonConforme,
      eq_retroviseurs: data.retroviseurs ? conforme : nonConforme,
      eq_pneus: data.pneus ? conforme : nonConforme,
      eq_interieur_siege: data.interieurSiege ? conforme : nonConforme,
      eq_interieur_tableau_bord: data.interieurTableauBord ? conforme : nonConforme,
      eq_cric_triangle_gilet: data.cricTriangleGilet ? conforme : nonConforme,
    };

    console.log('[edlGenerator] Variables construites:', Object.keys(variables).length);

    // 2. Télécharger le template
    const { data: templateData, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
    if (dlErr || !templateData) throw new Error(`Erreur téléchargement template EDL: ${dlErr?.message}`);
    const arrayBuffer = await templateData.arrayBuffer();

    // 3. Décompresser, remplacer, recompresser
    const filledDocxBlob = await new Promise<Blob>((resolve, reject) => {
      fflate.unzip(new Uint8Array(arrayBuffer), (err, unzipped) => {
        if (err) return reject(new Error(`Erreur décompression: ${err.message}`));
        if (!unzipped) return reject(new Error('Template vide'));

        try {
          const parts = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', 'word/footer.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];
          const decoder = new TextDecoder('utf-8');
          const encoder = new TextEncoder();
          parts.forEach(p => {
            const xmlData = unzipped[p];
            if (!xmlData) return;
            const replaced = replaceVariablesAcrossWT(decoder.decode(xmlData), variables, p);
            unzipped[p] = encoder.encode(replaced);
          });

          if (!unzipped['word/document.xml']) return reject(new Error('document.xml manquant'));

          fflate.zip(unzipped, (zErr, zData) => {
            if (zErr) return reject(new Error(`Erreur recompression: ${zErr.message}`));
            resolve(new Blob([zData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
          });
        } catch (e) { reject(e); }
      });
    });

    // 4. Upload DOCX
    const docxPath = `edl/${data.edlId}.docx`;
    const { error: upErr } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(docxPath, filledDocxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });
    if (upErr) throw new Error(`Erreur upload DOCX: ${upErr.message}`);

    // 5. Convertir en PDF via Edge Function
    const pdfPath = `edl/${data.edlId}.pdf`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session non disponible');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-docx-to-pdf`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceBucket: OUTPUT_BUCKET,
          sourcePath: docxPath,
          destBucket: OUTPUT_BUCKET,
          destPath: pdfPath,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Edge Function erreur: ${response.status} - ${errText}`);
    }

    const result = await response.json();
    if (!result.success) throw new Error(`Conversion échouée: ${result.error || 'erreur inconnue'}`);

    console.log('[edlGenerator] PDF généré');

    // 6. Tamponner les signatures
    if (data.signatureAgentDataUrl || data.signatureChauffeurDataUrl) {
      const { data: pdfFile, error: pdfErr } = await supabase.storage.from(OUTPUT_BUCKET).download(pdfPath);
      if (pdfErr || !pdfFile) throw new Error(`Erreur téléchargement PDF: ${pdfErr?.message}`);

      const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const stamped = await stampSignaturesOnPdf(
        pdfBytes,
        data.signatureAgentDataUrl,
        data.signatureChauffeurDataUrl
      );

      const { error: stampErr } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .upload(pdfPath, stamped, { contentType: 'application/pdf', upsert: true });
      if (stampErr) throw new Error(`Erreur upload PDF tamponné: ${stampErr.message}`);

      console.log('[edlGenerator] PDF tamponné et uploadé');
    }

    return { success: true, pdfPath };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[edlGenerator] Erreur:', msg);
    return { success: false, error: msg };
  }
}