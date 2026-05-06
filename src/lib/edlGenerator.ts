import * as fflate from 'fflate';
import { supabase } from './supabase';

interface ContractData {
  locationId: string;
  reference: string;
  dateContrat: string;
  locataireCivilite: string;
  locataireNom: string;
  locatairePrenom: string;
  locataireDateNaissance: string;
  locataireLieuNaissance: string;
  locataireNationalite: string;
  locataireAdresse: string;
  marque: string;
  modele: string;
  immatriculation: string;
  carburant: string;
  date1ereImmat: string;
  valeurResiduelle: string;
  dateDebut: string;
  dateFin: string;
  dureeMois: string;
  mensualiteTtc: string;
  depotGarantie: string;
  kmInclus: string;
  dateSignature: string;
}

function sanitizeForXml(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

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

const TEMPLATE_BUCKET = 'documents-vehicules';
const TEMPLATE_PATH = 'templates/contrat_location_pure.docx';
const OUTPUT_BUCKET = 'edl-documents';

export async function generateContractLocationPurePdf(data: ContractData): Promise<string | null> {
  try {
    console.log('[ContractGen] Debut generation contrat location pure...');

    const variables: Record<string, string> = {
      reference: data.reference,
      date_contrat: data.dateContrat,
      locataire_civilite: data.locataireCivilite,
      locataire_nom: data.locataireNom,
      locataire_prenom: data.locatairePrenom,
      locataire_date_naissance: data.locataireDateNaissance,
      locataire_lieu_naissance: data.locataireLieuNaissance,
      locataire_nationalite: data.locataireNationalite,
      locataire_adresse: data.locataireAdresse,
      marque: data.marque,
      modele: data.modele,
      immatriculation: data.immatriculation,
      carburant: data.carburant,
      date_1ere_immat: data.date1ereImmat,
      valeur_residuelle: data.valeurResiduelle,
      date_debut: data.dateDebut,
      date_fin: data.dateFin,
      duree_mois: data.dureeMois,
      mensualite_ttc: data.mensualiteTtc,
      depot_garantie: data.depotGarantie,
      km_inclus: data.kmInclus,
      date_signature: data.dateSignature,
    };

    console.log('[ContractGen] Variables construites:', Object.keys(variables).length);

    const { data: templateData, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
    if (dlErr || !templateData) throw new Error(`Erreur telechargement template: ${dlErr?.message}`);
    const arrayBuffer = await templateData.arrayBuffer();

    const filledDocxBlob = await new Promise<Blob>((resolve, reject) => {
      fflate.unzip(new Uint8Array(arrayBuffer), (err, unzipped) => {
        if (err) return reject(new Error(`Erreur decompression: ${err.message}`));
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

    const docxPath = `contrats/${data.locationId}.docx`;
    const { error: upErr } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(docxPath, filledDocxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });
    if (upErr) throw new Error(`Erreur upload DOCX: ${upErr.message}`);

    const pdfPath = `contrats/${data.locationId}.pdf`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session non disponible');

    console.log('[ContractGen] Conversion DOCX -> PDF via CloudConvert...');
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
    if (!result.success) throw new Error(`Conversion echouee: ${result.error || 'erreur inconnue'}`);

    await supabase
      .from('locations')
      .update({ contrat_pdf_path: pdfPath })
      .eq('id', data.locationId);

    console.log('[ContractGen] Contrat PDF genere avec succes:', pdfPath);
    return pdfPath;

  } catch (error) {
    console.error('[ContractGen] Erreur generation contrat:', error);
    throw error;
  }
}

export function formatDateFr(dateStr: string | null): string {
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

export function formatDateLongFr(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}