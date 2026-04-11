import * as fflate from 'fflate';
import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export interface AttestationData {
  // Données véhicule
  vehiculeId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  ref_tca: string | null;
  carte_essence_numero: string | null;
  licence_transport_numero: string | null;

  // Données salarié (chauffeur TCA)
  profilId: string;
  salarieNom: string;
  salariePrenom: string;
  salarieGenre: string | null;
  salarieMatriculeTca: string | null;
  salarieDateNaissance: string | null;
  salarieSecteurNom: string | null;

  // Données admin connecté
  adminId: string;
  adminNom: string;
  adminPrenom: string;

  // Données saisies dans le formulaire
  kmDepart: number;
  attributionId: string;
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

/**
 * Convertit "Féminin" / "femme" / "F" → "Mme", sinon → "M."
 */
function getCivilite(genre: string | null): string {
  if (!genre) return 'M.';
  const g = genre.toLowerCase().trim();
  if (g.includes('f') || g.includes('mme')) return 'Mme';
  return 'M.';
}

/**
 * Formate une date YYYY-MM-DD → DD/MM/YYYY
 * Gère aussi les timestamps ISO
 */
function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    // Si c'est déjà au format DD/MM/YYYY, retourne tel quel
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

    // Extraire la partie date (YYYY-MM-DD)
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch {
    return '';
  }
}

/**
 * Date du jour au format DD/MM/YYYY
 */
function dateAujourdhuiFr(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Heure actuelle au format HH:MM
 */
function heureActuelle(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Supprime les caractères XML interdits
 */
function sanitizeForXml(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// ============================================================
// REMPLACEMENT DES VARIABLES (gère la fragmentation XML)
// Logique reproduite depuis useLetterGeneration.ts
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
    // On accepte les valeurs vides (ex: km_retour à la création)
    replacements.push({
      startChar: varMatch.index,
      endChar: varMatch.index + varMatch[0].length,
      varName,
      value: sanitizeForXml(value),
    });
  }

  if (replacements.length === 0) return xmlContent;

  // Trier de droite à gauche pour ne pas décaler les indices
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
// FONCTION PRINCIPALE
// ============================================================

const TEMPLATE_BUCKET = 'documents-vehicules';
const TEMPLATE_PATH = 'templates/attestation.docx';
const OUTPUT_BUCKET = 'documents-vehicules';

/**
 * Génère l'attestation de mise à disposition pour un chauffeur TCA.
 *
 * Étapes :
 * 1. Construit l'objet des 20 variables depuis les données reçues
 * 2. Télécharge le template Word
 * 3. Remplace les variables via fflate
 * 4. Upload le DOCX rempli dans Storage
 * 5. Appelle l'Edge Function convert-docx-to-pdf
 * 6. Retourne l'URL du PDF
 */
export async function generateAttestation(
  data: AttestationData
): Promise<GenerationResult> {
  try {
    console.log('[attestationGenerator] Démarrage génération pour véhicule', data.immatriculation);

    // ============================================================
    // 1. CONSTRUIRE LES 20 VARIABLES
    // ============================================================
    const variables: Record<string, string> = {
      // EN-TÊTE
      matricule: data.salarieMatriculeTca || '',
      lot_entite: data.salarieSecteurNom || '',

      // CORPS
      civilite: getCivilite(data.salarieGenre),
      nom_complet: `${data.salariePrenom} ${data.salarieNom}`.trim(),
      date_naissance: formatDateFr(data.salarieDateNaissance),

      // VÉHICULE
      ref_tca: data.ref_tca || '',
      immatriculation: data.immatriculation || '',
      marque: data.marque || '',
      modele: data.modele || '',
      carte_essence: data.carte_essence_numero || '',
      licence_transport: data.licence_transport_numero || '',

      // DATE
      date_attribution: dateAujourdhuiFr(),

      // KM
      km_depart: String(data.kmDepart || ''),
      km_retour: '', // vide à la création, rempli à la restitution

      // DATES TABLEAU DÉPART
      date_depart: dateAujourdhuiFr(),
      heure_depart: heureActuelle(),

      // DATES TABLEAU RETOUR (vides à la création)
      date_retour: '',
      heure_retour: '',

      // RESPONSABLE SAISIE
      date_responsable: dateAujourdhuiFr(),
      nom_responsable: `${data.adminPrenom} ${data.adminNom}`.trim(),
    };

    console.log('[attestationGenerator] Variables construites:', variables);

    // ============================================================
    // 2. TÉLÉCHARGER LE TEMPLATE WORD
    // ============================================================
    console.log('[attestationGenerator] Téléchargement du template...');
    const { data: templateData, error: downloadError } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .download(TEMPLATE_PATH);

    if (downloadError || !templateData) {
      throw new Error(`Erreur téléchargement template: ${downloadError?.message}`);
    }

    const arrayBuffer = await templateData.arrayBuffer();
    console.log('[attestationGenerator] Template téléchargé, taille:', arrayBuffer.byteLength);

    // ============================================================
    // 3. DÉCOMPRESSER + REMPLACER VARIABLES + RECOMPRESSER
    // ============================================================
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
            reject(new Error('document.xml non trouvé dans le template'));
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
            console.log('[attestationGenerator] DOCX rempli, taille:', blob.size);
            resolve(blob);
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    // ============================================================
    // 4. UPLOAD DU DOCX REMPLI DANS STORAGE
    // ============================================================
    const docxPath = `attestations/${data.attributionId}.docx`;
    console.log('[attestationGenerator] Upload DOCX vers:', docxPath);

    const { error: uploadError } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(docxPath, filledDocxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erreur upload DOCX: ${uploadError.message}`);
    }

    // ============================================================
    // 5. APPELER L'EDGE FUNCTION CONVERT-DOCX-TO-PDF
    // ============================================================
    const pdfPath = `attestations/${data.attributionId}.pdf`;
    console.log('[attestationGenerator] Conversion DOCX -> PDF...');

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

    console.log('[attestationGenerator] PDF généré avec succès:', pdfPath);

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