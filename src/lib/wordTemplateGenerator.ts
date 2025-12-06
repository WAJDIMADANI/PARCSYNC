import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';

export interface TemplateVariable {
  [key: string]: string | number | boolean | null;
}

/**
 * Download a Word template from Supabase Storage
 */
export async function downloadTemplate(templateUrl: string): Promise<ArrayBuffer> {
  try {
    // Extract the file path from the Supabase URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/letter-templates/{path}
    // or: https://{project}.supabase.co/storage/v1/object/authenticated/letter-templates/{path}
    const urlParts = templateUrl.split('/letter-templates/');
    if (urlParts.length < 2) {
      throw new Error('URL du template invalide');
    }
    const filePath = urlParts[1];

    console.log('Téléchargement du template depuis:', filePath);

    // Use Supabase Storage API with authentication
    const { data, error } = await supabase.storage
      .from('letter-templates')
      .download(filePath);

    if (error) {
      console.error('Erreur Supabase Storage:', error);
      throw new Error(`Erreur lors du téléchargement du modèle: ${error.message}`);
    }

    if (!data) {
      throw new Error('Le fichier template est vide ou introuvable');
    }

    console.log('Template téléchargé avec succès, taille:', data.size, 'bytes');

    // Convert Blob to ArrayBuffer
    return await data.arrayBuffer();
  } catch (error: any) {
    console.error('Erreur téléchargement template:', error);
    throw new Error(`Erreur lors du téléchargement du modèle: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Generate a Word document from a template with variable replacement
 */
export async function generateWordDocument(
  templateUrl: string,
  variables: TemplateVariable
): Promise<Blob> {
  try {
    // Download the template
    const templateData = await downloadTemplate(templateUrl);

    // Load the template with PizZip
    const zip = new PizZip(templateData);

    // Create a Docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '', // Return empty string for null/undefined values
    });

    // Set the template variables
    doc.setData(variables);

    // Render the document (replace all variables)
    doc.render();

    // Generate the output as a blob
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return output;
  } catch (error: any) {
    console.error('Erreur génération document Word:', error);
    if (error.properties && error.properties.errors) {
      console.error('Détails des erreurs:', error.properties.errors);
    }
    throw new Error('Erreur lors de la génération du document Word');
  }
}

/**
 * Upload a generated document to Supabase Storage
 */
export async function uploadGeneratedDocument(
  blob: Blob,
  filename: string
): Promise<string> {
  const file = new File([blob], filename, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const { data, error } = await supabase.storage
    .from('generated-letters')
    .upload(`${Date.now()}_${filename}`, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Erreur upload: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generated-letters')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Download a Word document to the user's computer
 */
export function downloadWordDocument(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

/**
 * Extract variables from a Word document template using XML parsing
 * This analyzes the raw XML content to find {{variable}} patterns even when fragmented
 */
export async function extractVariablesFromWordTemplate(
  templateArrayBuffer: ArrayBuffer
): Promise<string[]> {
  try {
    const zip = new PizZip(templateArrayBuffer);

    // Method 1: Try to extract from raw XML (more reliable)
    try {
      const documentXml = zip.file('word/document.xml')?.asText();
      if (documentXml) {
        const variables = extractVariablesFromXML(documentXml);
        if (variables.length > 0) {
          console.log('Variables extracted from XML:', variables);
          return variables;
        }
      }
    } catch (xmlError) {
      console.warn('XML extraction failed, trying fallback method:', xmlError);
    }

    // Method 2: Fallback to docxtemplater getFullText
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const fullText = doc.getFullText();
    const tags = fullText.match(/\{\{([^}]+)\}\}/g) || [];
    const uniqueTags = Array.from(new Set(tags.map(tag => tag.replace(/[{}]/g, '').trim())));

    console.log('Variables extracted from getFullText:', uniqueTags);
    return uniqueTags;
  } catch (error) {
    console.error('Erreur extraction variables:', error);
    return [];
  }
}

/**
 * Extract variables from Word XML content by merging fragmented text runs
 * Word often splits {{variable}} across multiple <w:t> tags, this function handles that
 */
function extractVariablesFromXML(xmlContent: string): string[] {
  try {
    // Extract all text content from <w:t> tags
    const textMatches = xmlContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    const textFragments: string[] = [];

    for (const match of textMatches) {
      textFragments.push(match[1]);
    }

    // Merge all text fragments into one string
    const mergedText = textFragments.join('');

    // Now extract variables from the merged text
    const variableMatches = mergedText.matchAll(/\{\{([^}]+)\}\}/g);
    const variables = new Set<string>();

    for (const match of variableMatches) {
      const varName = match[1].trim();
      if (varName) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  } catch (error) {
    console.error('Erreur parsing XML:', error);
    return [];
  }
}

/**
 * Get the system variables that can be auto-filled from employee/profile data
 */
export function getSystemVariables(): string[] {
  return [
    'nom',
    'prenom',
    'nom_complet',
    'civilite',
    'matricule_tca',
    'email',
    'tel',
    'adresse',
    'complement_adresse',
    'code_postal',
    'ville',
    'date_naissance',
    'lieu_naissance',
    'pays_naissance',
    'nationalite',
    'numero_securite_sociale',
    'iban',
    'poste',
    'site_nom',
    'secteur_nom',
    'date_entree',
    'date_sortie',
    'date_aujourd_hui',
    'nom_entreprise',
    'adresse_entreprise',
    'ville_entreprise',
    'tel_entreprise',
    'siret_entreprise',
    'rcs_entreprise',
    'code_naf_entreprise',
    'groupe_entreprise',
    'prenom_signataire',
    'nom_signataire',
    'fonction_signataire',
    'genre',
  ];
}

/**
 * Classify variables into system and custom variables
 */
export function classifyVariables(variables: string[]): {
  systeme: string[];
  personnalisees: string[];
} {
  const systemVars = getSystemVariables();
  const systeme: string[] = [];
  const personnalisees: string[] = [];

  variables.forEach(variable => {
    if (systemVars.includes(variable)) {
      systeme.push(variable);
    } else {
      personnalisees.push(variable);
    }
  });

  return { systeme, personnalisees };
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('fr-FR');
  } catch {
    return String(dateStr);
  }
}

/**
 * Format custom variables to ensure proper date/time formatting
 */
function formatCustomVariables(customVars: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {};

  Object.entries(customVars).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      formatted[key] = '';
      return;
    }

    if (key.toLowerCase().includes('date') && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      formatted[key] = formatDate(value);
    } else if (key.toLowerCase().includes('heure') && typeof value === 'string' && value.match(/^\d{2}:\d{2}/)) {
      formatted[key] = value;
    } else if (typeof value === 'boolean') {
      formatted[key] = value ? 'Oui' : 'Non';
    } else {
      formatted[key] = String(value);
    }
  });

  return formatted;
}

/**
 * Prepare template data from a profile/employee record
 * This matches the formatProfileData function from letterTemplateGenerator.ts
 */
export function prepareTemplateData(
  profil: any,
  customVariables: Record<string, any> = {}
): TemplateVariable {
  const today = new Date();

  // Déterminer la civilité basée sur le genre
  let civilite = '';
  if (profil.genre) {
    const genre = profil.genre.toLowerCase();
    if (genre === 'masculin' || genre === 'homme' || genre === 'm') {
      civilite = 'Monsieur';
    } else if (genre === 'féminin' || genre === 'femme' || genre === 'f') {
      civilite = 'Madame';
    }
  }

  const formattedCustomVars = formatCustomVariables(customVariables);

  const data: TemplateVariable = {
    // Identité
    nom: profil.nom || '',
    prenom: profil.prenom || '',
    nom_complet: `${profil.prenom || ''} ${profil.nom || ''}`.trim(),
    civilite: civilite,
    matricule_tca: profil.matricule_tca || '',

    // Contact
    email: profil.email || '',
    tel: profil.tel || '',
    adresse: profil.adresse || '',
    complement_adresse: profil.complement_adresse || '',
    code_postal: profil.code_postal || '',
    ville: profil.ville || '',

    // Professionnel
    poste: profil.poste || '',
    site_nom: profil.site?.nom || '',
    secteur_nom: profil.secteur?.nom || '',
    date_entree: profil.date_entree ? formatDate(profil.date_entree) : '',
    date_sortie: profil.date_sortie ? formatDate(profil.date_sortie) : '',

    // Personnel
    date_naissance: profil.date_naissance ? formatDate(profil.date_naissance) : '',
    lieu_naissance: profil.lieu_naissance || '',
    pays_naissance: profil.pays_naissance || '',
    nationalite: profil.nationalite || '',
    numero_securite_sociale: profil.numero_securite_sociale || '',
    iban: profil.iban || '',
    genre: profil.genre || '',

    // Dates
    date_aujourd_hui: formatDate(today.toISOString()),

    // Entreprise (données fixes)
    nom_entreprise: 'TRANSPORT CLASSE AFFAIRE',
    adresse_entreprise: '111 Avenue Victor Hugo, 75116 Paris',
    ville_entreprise: 'Paris',
    tel_entreprise: '01.86.22.24.00',
    siret_entreprise: '50426507500029',
    rcs_entreprise: 'RCS PARIS B 504265075',
    code_naf_entreprise: '4939B – Autres transports routiers de voyageurs',
    groupe_entreprise: 'NKM HOLDING',

    // Signataire (valeurs par défaut)
    prenom_signataire: '',
    nom_signataire: '',
    fonction_signataire: 'Direction des Ressources Humaines',

    // Add formatted custom variables
    ...formattedCustomVars,
  };

  return data;
}
