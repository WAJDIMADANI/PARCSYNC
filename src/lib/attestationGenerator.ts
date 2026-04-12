import * as fflate from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export interface AttestationData {
  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  ref_tca: string | null;
  carte_essence_numero: string | null;
  licence_transport_numero: string | null;

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

  kmDepart: number;
  attributionId: string;

  // Signatures DÉPART (PNG dataURL)
  signatureChauffeurDataUrl?: string;
  signatureAdminDataUrl?: string;

  // ============ MODE RESTITUTION (RETOUR) ============
  isRestitution?: boolean;

  // Date départ originale (récupérée depuis BDD)
  dateDepartOriginale?: string;
  heureDepartOriginale?: string;

  // Données retour (saisies dans la modal restitution)
  kmRetour?: number;
  signatureChauffeurRetourDataUrl?: string;
  signatureAdminRetourDataUrl?: string;

  // Admin DÉPART d'origine (à réafficher en bas)
  adminNomDepartOrigine?: string;
  adminPrenomDepartOrigine?: string;
  dateDepartResponsableOrigine?: string;
}

export interface GenerationResult {
  success: boolean;
  pdfPath?: string;
  pdfBucket?: string;
  docxPath?: string;
  error?: string;
}

// ============================================================
// HELPERS
// ============================================================

function getCivilite(genre: string | null): string {
  if (!genre) return 'M. ';
  const g = genre.toLowerCase().trim();
  if (g.includes('f') || g.includes('mme')) return 'Mme ';
  return 'M. ';
}

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

function heureActuelle(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
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
// REMPLACEMENT VARIABLES (gère fragmentation XML)
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
// COORDONNÉES SIGNATURES (page A4 = 595.32 x 841.92)
// ============================================================

const PAGE_HEIGHT = 841.92;

// Signature CHAUFFEUR DÉPART (colonne 2 du tableau, sous "Signature :")
const SIG_CHAUFFEUR_DEPART = { x: 178, yTop: 540, width: 140, height: 60 };

// Signature CHAUFFEUR RETOUR (colonne 4 du tableau, sous "Signature :")
const SIG_CHAUFFEUR_RETOUR = { x: 425, yTop: 540, width: 140, height: 60 };

// Signature ADMIN DÉPART (sous "Date & Signature responsable saisie")
const SIG_ADMIN_DEPART = { x: 250, yTop: 690, width: 140, height: 60 };

// Signature ADMIN RETOUR (sous "Date & Signature responsable RETOUR")
const SIG_ADMIN_RETOUR = { x: 250, yTop: 760, width: 140, height: 60 };

async function stampSignaturesOnPdf(
  pdfBytes: Uint8Array,
  sigChauffeurDepart: string,
  sigAdminDepart: string,
  sigChauffeurRetour?: string,
  sigAdminRetour?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];
  if (!page) throw new Error('PDF vide');

  const stamp = async (dataUrl: string, coords: { x: number; yTop: number; width: number; height: number }) => {
    if (!dataUrl) return;
    const img = await pdfDoc.embedPng(dataUrlToBytes(dataUrl));
    const y = PAGE_HEIGHT - coords.yTop - coords.height;
    page.drawImage(img, { x: coords.x, y, width: coords.width, height: coords.height });
  };

  if (sigChauffeurDepart) await stamp(sigChauffeurDepart, SIG_CHAUFFEUR_DEPART);
  if (sigAdminDepart) await stamp(sigAdminDepart, SIG_ADMIN_DEPART);
  if (sigChauffeurRetour) await stamp(sigChauffeurRetour, SIG_CHAUFFEUR_RETOUR);
  if (sigAdminRetour) await stamp(sigAdminRetour, SIG_ADMIN_RETOUR);

  return pdfDoc.save();
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

const TEMPLATE_BUCKET = 'documents-vehicules';
const TEMPLATE_PATH = 'templates/attestation.docx';
const OUTPUT_BUCKET = 'documents-vehicules';

export async function generateAttestation(data: AttestationData): Promise<GenerationResult> {
  try {
    const isRetour = !!data.isRestitution;
    console.log(`[attestationGenerator] Mode: ${isRetour ? 'RETOUR' : 'DÉPART'} pour véhicule ${data.immatriculation}`);

    // 1. Construire les variables
    // En mode RETOUR : on remplit AUSSI les variables retour + responsable_retour
    const variables: Record<string, string> = {
      matricule: data.salarieMatriculeTca || '',
      lot_entite: data.salarieSecteurNom || '',
      civilite: getCivilite(data.salarieGenre),
      nom_complet: `${data.salariePrenom} ${data.salarieNom}`.trim(),
      date_naissance: formatDateFr(data.salarieDateNaissance),
      ref_tca: data.ref_tca || '',
      immatriculation: data.immatriculation || '',
      marque: data.marque || '',
      modele: data.modele || '',
      carte_essence: data.carte_essence_numero || '',
      licence_transport: data.licence_transport_numero || '',
      date_attribution: isRetour ? (data.dateDepartResponsableOrigine || dateAujourdhuiFr()) : dateAujourdhuiFr(),
      km_depart: String(data.kmDepart || ''),

      // Variables départ (toujours remplies, même en mode retour)
      date_depart: isRetour ? (data.dateDepartOriginale || dateAujourdhuiFr()) : dateAujourdhuiFr(),
      heure_depart: isRetour ? (data.heureDepartOriginale || heureActuelle()) : heureActuelle(),

      // Variables retour
      km_retour: isRetour ? String(data.kmRetour || '') : '',
      date_retour: isRetour ? dateAujourdhuiFr() : '',
      heure_retour: isRetour ? heureActuelle() : '',

      // Responsable saisie DÉPART (toujours rempli)
      date_responsable: isRetour
        ? (data.dateDepartResponsableOrigine || dateAujourdhuiFr())
        : dateAujourdhuiFr(),
      nom_responsable: isRetour
        ? `${data.adminPrenomDepartOrigine || data.adminPrenom} ${data.adminNomDepartOrigine || data.adminNom}`.trim()
        : `${data.adminPrenom} ${data.adminNom}`.trim(),

      // Responsable RETOUR (rempli seulement en mode retour)
      date_responsable_retour: isRetour ? dateAujourdhuiFr() : '',
      nom_responsable_retour: isRetour ? `${data.adminPrenom} ${data.adminNom}`.trim() : '',
    };

    console.log('[attestationGenerator] Variables construites', { isRetour, vars: Object.keys(variables).length });

    // 2. Télécharger le template
    const { data: templateData, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
    if (dlErr || !templateData) throw new Error(`Erreur téléchargement template: ${dlErr?.message}`);
    const arrayBuffer = await templateData.arrayBuffer();

    // 3. Décompresser, remplacer, recompresser
    const filledDocxBlob = await new Promise<Blob>((resolve, reject) => {
      fflate.unzip(new Uint8Array(arrayBuffer), (err, unzipped) => {
        if (err) return reject(new Error(`Erreur décompression: ${err.message}`));
        if (!unzipped) return reject(new Error('Template vide'));

        try {
          const parts = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];
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
    const docxPath = `attestations/${data.attributionId}.docx`;
    const { error: upErr } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(docxPath, filledDocxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });
    if (upErr) throw new Error(`Erreur upload DOCX: ${upErr.message}`);

    // 5. Convertir en PDF via Edge Function
    const pdfPath = `attestations/${data.attributionId}.pdf`;
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

    console.log('[attestationGenerator] PDF généré');

    // 6. Tamponner les signatures
    const hasAnySig = data.signatureChauffeurDataUrl || data.signatureAdminDataUrl || data.signatureChauffeurRetourDataUrl || data.signatureAdminRetourDataUrl;

    if (hasAnySig) {
      const { data: pdfFile, error: pdfErr } = await supabase.storage.from(OUTPUT_BUCKET).download(pdfPath);
      if (pdfErr || !pdfFile) throw new Error(`Erreur téléchargement PDF: ${pdfErr?.message}`);

      const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const stamped = await stampSignaturesOnPdf(
        pdfBytes,
        data.signatureChauffeurDataUrl || '',
        data.signatureAdminDataUrl || '',
        data.signatureChauffeurRetourDataUrl,
        data.signatureAdminRetourDataUrl
      );

      const { error: stampErr } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .upload(pdfPath, stamped, { contentType: 'application/pdf', upsert: true });
      if (stampErr) throw new Error(`Erreur upload PDF tamponné: ${stampErr.message}`);

      console.log('[attestationGenerator] PDF tamponné et uploadé');
    }

    return { success: true, pdfPath, pdfBucket: OUTPUT_BUCKET, docxPath };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[attestationGenerator] Erreur:', msg);
    return { success: false, error: msg };
  }
}