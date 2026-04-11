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

  // Signatures (base64 PNG dataURL) - optionnelles
  signatureChauffeurDataUrl?: string;
  signatureAdminDataUrl?: string;
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

/**
 * Convertit un dataURL base64 en Uint8Array (pour pdf-lib)
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================
// REMPLACEMENT DES VARIABLES (gère la fragmentation XML)
// ============================================================

function replaceVariablesAcrossWT(
  xmlContent: string,
  variables: Record<string, string>,
  xmlPath: string
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parse error in ${xmlPath}`);
  }

  const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  let textNodes = doc.getElementsByTagNameNS(wordNamespace, 't');
  if (!textNodes || textNodes.length === 0) {
    textNodes = doc.getElementsByTagName('w:t');
  }
  if (!textNodes || textNodes.length === 0) {
    return xmlContent;
  }

  interface Segment {
    node: Element;
    text: string;
  }

  const segments: Segment[] = [];
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const text = node.textContent || '';
    segments.push({ node, text });
  }

  const plainText = segments.map((s) => s.text).join('');

  const variableRegex = /\{\{[\s\u00A0]*([a-zA-Z0-9_]+)[\s\u00A0]*\}\}/g;
  const replacements: {
    startChar: number;
    endChar: number;
    varName: string;
    value: string;
  }[] = [];

  let varMatch;
  while ((varMatch = variableRegex.exec(plainText)) !== null) {
    const varName = varMatch[1].toLowerCase().trim();
    let value = '';
    for (const [key, val] of Object.entries(variables)) {
      if (key.toLowerCase() === varName) {
        value = val;
        break;
      }
    }
    replacements.push({
      startChar: varMatch.index,
      endChar: varMatch.index + varMatch[0].length,
      varName,
      value: sanitizeForXml(value),
    });
  }

  if (replacements.length === 0) return xmlContent;

  replacements.sort((a, b) => b.startChar - a.startChar);

  replacements.forEach((replacement) => {
    let cumul = 0;
    let startSegIndex = -1;
    let startOffset = 0;
    let endSegIndex = -1;
    let endOffset = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segLen = seg.text.length;

      if (startSegIndex === -1 && cumul + segLen > replacement.startChar) {
        startSegIndex = i;
        startOffset = replacement.startChar - cumul;
      }

      if (endSegIndex === -1 && cumul + segLen >= replacement.endChar) {
        endSegIndex = i;
        endOffset = replacement.endChar - cumul;
        break;
      }

      cumul += segLen;
    }

    if (startSegIndex === -1 || endSegIndex === -1) return;

    if (startSegIndex === endSegIndex) {
      const seg = segments[startSegIndex];
      const prefix = seg.text.substring(0, startOffset);
      const suffix = seg.text.substring(endOffset);
      seg.node.textContent = prefix + replacement.value + suffix;
      seg.text = seg.node.textContent || '';
    } else {
      const startSeg = segments[startSegIndex];
      const endSeg = segments[endSegIndex];
      const prefix = startSeg.text.substring(0, startOffset);
      const suffix = endSeg.text.substring(endOffset);

      startSeg.node.textContent = prefix + replacement.value;
      startSeg.text = startSeg.node.textContent || '';

      for (let i = startSegIndex + 1; i < endSegIndex; i++) {
        segments[i].node.textContent = '';
        segments[i].text = '';
      }

      endSeg.node.textContent = suffix;
      endSeg.text = endSeg.node.textContent || '';
    }
  });

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

// ============================================================
// TAMPONNAGE DES SIGNATURES SUR LE PDF
// Coordonnées mesurées sur le PDF généré (page A4 = 595.32 x 841.92)
// ============================================================

const PAGE_HEIGHT = 841.92;

// Signature CHAUFFEUR : sous "Signature :" colonne DÉPART
const SIG_CHAUFFEUR = {
  x: 180,
  yTop: 547,
  width: 110,
  height: 45,
};

// Signature ADMIN : sous "Date & Signature responsable saisie : ..."
const SIG_ADMIN = {
  x: 250,
  yTop: 690,
  width: 120,
  height: 50,
};

async function stampSignaturesOnPdf(
  pdfBytes: Uint8Array,
  signatureChauffeurDataUrl: string,
  signatureAdminDataUrl: string
): Promise<Uint8Array> {
  console.log('[attestationGenerator] Tamponnage des signatures sur le PDF...');

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  if (!firstPage) {
    throw new Error('PDF vide, impossible de tamponner les signatures');
  }

  // Tamponner signature CHAUFFEUR
  if (signatureChauffeurDataUrl) {
    const sigChauffeurBytes = dataUrlToBytes(signatureChauffeurDataUrl);
    const sigChauffeurImage = await pdfDoc.embedPng(sigChauffeurBytes);

    // pdf-lib : y est le coin BAS de l'image, origine en bas-gauche
    const yPdfLib = PAGE_HEIGHT - SIG_CHAUFFEUR.yTop - SIG_CHAUFFEUR.height;

    firstPage.drawImage(sigChauffeurImage, {
      x: SIG_CHAUFFEUR.x,
      y: yPdfLib,
      width: SIG_CHAUFFEUR.width,
      height: SIG_CHAUFFEUR.height,
    });
    console.log('[attestationGenerator] Signature chauffeur tamponnée');
  }

  // Tamponner signature ADMIN
  if (signatureAdminDataUrl) {
    const sigAdminBytes = dataUrlToBytes(signatureAdminDataUrl);
    const sigAdminImage = await pdfDoc.embedPng(sigAdminBytes);

    const yPdfLib = PAGE_HEIGHT - SIG_ADMIN.yTop - SIG_ADMIN.height;

    firstPage.drawImage(sigAdminImage, {
      x: SIG_ADMIN.x,
      y: yPdfLib,
      width: SIG_ADMIN.width,
      height: SIG_ADMIN.height,
    });
    console.log('[attestationGenerator] Signature admin tamponnée');
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return modifiedPdfBytes;
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

const TEMPLATE_BUCKET = 'documents-vehicules';
const TEMPLATE_PATH = 'templates/attestation.docx';
const OUTPUT_BUCKET = 'documents-vehicules';

export async function generateAttestation(
  data: AttestationData
): Promise<GenerationResult> {
  try {
    console.log('[attestationGenerator] Démarrage génération pour véhicule', data.immatriculation);

    // 1. Construire les variables
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
      date_attribution: dateAujourdhuiFr(),
      km_depart: String(data.kmDepart || ''),
      km_retour: '',
      date_depart: dateAujourdhuiFr(),
      heure_depart: heureActuelle(),
      date_retour: '',
      heure_retour: '',
      date_responsable: dateAujourdhuiFr(),
      nom_responsable: `${data.adminPrenom} ${data.adminNom}`.trim(),
    };

    // 2. Télécharger le template
    const { data: templateData, error: downloadError } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .download(TEMPLATE_PATH);

    if (downloadError || !templateData) {
      throw new Error(`Erreur téléchargement template: ${downloadError?.message}`);
    }

    const arrayBuffer = await templateData.arrayBuffer();

    // 3. Décompresser + remplacer + recompresser
    const filledDocxBlob = await new Promise<Blob>((resolve, reject) => {
      fflate.unzip(new Uint8Array(arrayBuffer), (err, unzipped) => {
        if (err) {
          reject(new Error(`Erreur décompression: ${err.message}`));
          return;
        }
        if (!unzipped) {
          reject(new Error('Template vide ou corrompu'));
          return;
        }

        try {
          const partsToProcess = [
            'word/document.xml',
            'word/header1.xml',
            'word/header2.xml',
            'word/header3.xml',
            'word/footer1.xml',
            'word/footer2.xml',
            'word/footer3.xml',
          ];

          const decoder = new TextDecoder('utf-8');
          const encoder = new TextEncoder();

          partsToProcess.forEach((partPath) => {
            const xmlData = unzipped[partPath];
            if (!xmlData) return;
            const xmlContent = decoder.decode(xmlData);
            const replacedContent = replaceVariablesAcrossWT(xmlContent, variables, partPath);
            unzipped[partPath] = encoder.encode(replacedContent);
          });

          if (!unzipped['word/document.xml']) {
            reject(new Error('document.xml non trouvé'));
            return;
          }

          fflate.zip(unzipped, (zipErr, zipData) => {
            if (zipErr) {
              reject(new Error(`Erreur recompression: ${zipErr.message}`));
              return;
            }
            const blob = new Blob([zipData], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            resolve(blob);
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    // 4. Upload DOCX
    const docxPath = `attestations/${data.attributionId}.docx`;

    const { error: uploadError } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(docxPath, filledDocxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erreur upload DOCX: ${uploadError.message}`);
    }

    // 5. Convertir en PDF via Edge Function
    const pdfPath = `attestations/${data.attributionId}.pdf`;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Session non disponible');
    }

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
      const errorText = await response.text();
      throw new Error(`Edge Function erreur: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`Conversion échouée: ${result.error || 'erreur inconnue'}`);
    }

    console.log('[attestationGenerator] PDF généré');

    // 6. Tamponner les signatures (si fournies)
    if (data.signatureChauffeurDataUrl || data.signatureAdminDataUrl) {
      const { data: pdfFileData, error: pdfDownloadError } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .download(pdfPath);

      if (pdfDownloadError || !pdfFileData) {
        throw new Error(`Erreur téléchargement PDF pour tamponnage: ${pdfDownloadError?.message}`);
      }

      const pdfArrayBuffer = await pdfFileData.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfArrayBuffer);

      const stampedPdfBytes = await stampSignaturesOnPdf(
        pdfBytes,
        data.signatureChauffeurDataUrl || '',
        data.signatureAdminDataUrl || ''
      );

      const { error: stampUploadError } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .upload(pdfPath, stampedPdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (stampUploadError) {
        throw new Error(`Erreur upload PDF tamponné: ${stampUploadError.message}`);
      }

      console.log('[attestationGenerator] PDF tamponné et uploadé (écrase l\'ancien)');
    }

    return {
      success: true,
      pdfPath,
      pdfBucket: OUTPUT_BUCKET,
      docxPath,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[attestationGenerator] Erreur:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}