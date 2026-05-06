import { supabase } from './supabase';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

interface ContractData {
  locationId: string;
  reference: string;
  dateContrat: string;
  // Locataire
  locataireCivilite: string;
  locataireNom: string;
  locatairePrenom: string;
  locataireDateNaissance: string;
  locataireLieuNaissance: string;
  locataireNationalite: string;
  locataireAdresse: string;
  // Vehicule
  marque: string;
  modele: string;
  immatriculation: string;
  carburant: string;
  date1ereImmat: string;
  valeurResiduelle: string;
  // Contrat
  dateDebut: string;
  dateFin: string;
  dureeMois: string;
  mensualiteTtc: string;
  depotGarantie: string;
  kmInclus: string;
  dateSignature: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function replaceInXml(xml: string, variables: Record<string, string>): string {
  let result = xml;
  for (const [key, value] of Object.entries(variables)) {
    const escaped = escapeXml(value || '');
    // Handle cases where Word splits {{VAR}} across multiple XML runs
    // First try simple replacement
    const simplePattern = '{{' + key + '}}';
    if (result.includes(simplePattern)) {
      result = result.split(simplePattern).join(escaped);
      continue;
    }
    // Try with XML tags potentially splitting the variable
    const regex = new RegExp(
      '\\{\\{' +
      key.split('').join('(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?') +
      '\\}\\}',
      'g'
    );
    result = result.replace(regex, escaped);
    // Also try with just the braces split
    const regex2 = new RegExp(
      '\\{(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\{' +
      key.split('').join('(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?') +
      '\\}(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\}',
      'g'
    );
    result = result.replace(regex2, escaped);
  }
  return result;
}

export async function generateContractLocationPurePdf(data: ContractData): Promise<string | null> {
  try {
    console.log('[ContractGen] Debut generation contrat location pure...');

    // 1. Telecharger le template DOCX
    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('documents-vehicules')
      .download('templates/contrat_location_pure.docx');

    if (downloadError || !templateFile) {
      console.error('[ContractGen] Erreur telechargement template:', downloadError);
      throw new Error('Impossible de telecharger le template');
    }

    // 2. Decompresser le DOCX (c est un ZIP)
    const arrayBuffer = await templateFile.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const unzipped = unzipSync(uint8);

    // 3. Preparer les variables de remplacement
    const variables: Record<string, string> = {
      'REFERENCE': data.reference,
      'DATE_CONTRAT': data.dateContrat,
      'LOCATAIRE_CIVILITE': data.locataireCivilite,
      'LOCATAIRE_NOM': data.locataireNom,
      'LOCATAIRE_PRENOM': data.locatairePrenom,
      'LOCATAIRE_DATE_NAISSANCE': data.locataireDateNaissance,
      'LOCATAIRE_LIEU_NAISSANCE': data.locataireLieuNaissance,
      'LOCATAIRE_NATIONALITE': data.locataireNationalite,
      'LOCATAIRE_ADRESSE': data.locataireAdresse,
      'MARQUE': data.marque,
      'MODELE': data.modele,
      'IMMATRICULATION': data.immatriculation,
      'CARBURANT': data.carburant,
      'DATE_1ERE_IMMAT': data.date1ereImmat,
      'VALEUR_RESIDUELLE': data.valeurResiduelle,
      'DATE_DEBUT': data.dateDebut,
      'DATE_FIN': data.dateFin,
      'DUREE_MOIS': data.dureeMois,
      'MENSUALITE_TTC': data.mensualiteTtc,
      'DEPOT_GARANTIE': data.depotGarantie,
      'KM_INCLUS': data.kmInclus,
      'DATE_SIGNATURE': data.dateSignature,
    };

    // 4. Remplacer dans tous les fichiers XML du DOCX
    const newFiles: Record<string, Uint8Array> = {};
    for (const [filename, content] of Object.entries(unzipped)) {
      if (filename.endsWith('.xml') || filename.endsWith('.rels')) {
        let xmlStr = strFromU8(content as Uint8Array);
        xmlStr = replaceInXml(xmlStr, variables);
        newFiles[filename] = strToU8(xmlStr);
      } else {
        newFiles[filename] = content as Uint8Array;
      }
    }

    // 5. Recompresser en DOCX
    const newZip = zipSync(newFiles);
    const docxBlob = new Blob([newZip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    // 6. Uploader le DOCX temporaire
    const tempDocxPath = 'location-documents/contrats/temp_' + data.locationId + '.docx';
    const { error: uploadDocxError } = await supabase.storage
      .from('edl-documents')
      .upload(tempDocxPath, docxBlob, { upsert: true, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    if (uploadDocxError) {
      console.error('[ContractGen] Erreur upload DOCX:', uploadDocxError);
      throw new Error('Erreur upload DOCX temporaire');
    }

    // 7. Obtenir URL signee pour CloudConvert
    const { data: signedDocx } = await supabase.storage
      .from('edl-documents')
      .createSignedUrl(tempDocxPath, 600);

    if (!signedDocx?.signedUrl) {
      throw new Error('Impossible de creer URL signee pour le DOCX');
    }

    // 8. Convertir en PDF via Edge Function
    console.log('[ContractGen] Conversion DOCX -> PDF via CloudConvert...');
    const { data: conversionResult, error: conversionError } = await supabase.functions.invoke('convert-docx-to-pdf', {
      body: { fileUrl: signedDocx.signedUrl, fileName: 'contrat_' + data.locationId + '.docx' },
    });

    if (conversionError || !conversionResult?.pdfBase64) {
      console.error('[ContractGen] Erreur conversion:', conversionError, conversionResult);
      throw new Error('Erreur conversion PDF');
    }

    // 9. Decoder le PDF base64
    const pdfBinary = atob(conversionResult.pdfBase64);
    const pdfArray = new Uint8Array(pdfBinary.length);
    for (let i = 0; i < pdfBinary.length; i++) {
      pdfArray[i] = pdfBinary.charCodeAt(i);
    }
    const pdfBlob = new Blob([pdfArray], { type: 'application/pdf' });

    // 10. Stocker le PDF final
    const pdfPath = 'location-documents/contrats/' + data.locationId + '.pdf';
    const { error: uploadPdfError } = await supabase.storage
      .from('edl-documents')
      .upload(pdfPath, pdfBlob, { upsert: true, contentType: 'application/pdf' });

    if (uploadPdfError) {
      console.error('[ContractGen] Erreur upload PDF:', uploadPdfError);
      throw new Error('Erreur upload PDF final');
    }

    // 11. Mettre a jour la BDD
    await supabase
      .from('locations')
      .update({ contrat_pdf_path: pdfPath })
      .eq('id', data.locationId);

    // 12. Supprimer le DOCX temporaire
    await supabase.storage.from('edl-documents').remove([tempDocxPath]);

    console.log('[ContractGen] Contrat PDF genere avec succes:', pdfPath);
    return pdfPath;

  } catch (error) {
    console.error('[ContractGen] Erreur generation contrat:', error);
    throw error;
  }
}

// Helper pour formater une date en francais
export function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
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