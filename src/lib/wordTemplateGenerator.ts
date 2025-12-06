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
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error('Erreur lors du téléchargement du modèle');
  }
  return response.arrayBuffer();
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
 * Extract variables from a Word document template
 * This analyzes the XML content to find {{variable}} patterns
 */
export async function extractVariablesFromWordTemplate(
  templateArrayBuffer: ArrayBuffer
): Promise<string[]> {
  try {
    const zip = new PizZip(templateArrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Get all tags (variables) from the template
    const tags = doc.getFullText().match(/\{\{([^}]+)\}\}/g) || [];
    const uniqueTags = Array.from(new Set(tags.map(tag => tag.replace(/[{}]/g, '').trim())));

    return uniqueTags;
  } catch (error) {
    console.error('Erreur extraction variables:', error);
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
    'matricule',
    'email',
    'telephone',
    'adresse',
    'ville',
    'code_postal',
    'pays',
    'date_naissance',
    'lieu_naissance',
    'pays_naissance',
    'numero_securite_sociale',
    'iban',
    'poste',
    'site',
    'secteur',
    'date_debut',
    'date_fin',
    'salaire',
    'type_contrat',
    'duree_travail',
    'date_jour',
    'genre',
    'civilite',
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
 * Prepare template data from a profile/employee record
 */
export function prepareTemplateData(
  profile: any,
  customVariables: Record<string, any> = {}
): TemplateVariable {
  const data: TemplateVariable = {
    // Personal information
    nom: profile.nom || '',
    prenom: profile.prenom || '',
    matricule: profile.matricule || '',
    email: profile.email || '',
    telephone: profile.telephone || '',
    adresse: profile.adresse || '',
    ville: profile.ville || '',
    code_postal: profile.code_postal || '',
    pays: profile.pays || '',
    date_naissance: profile.date_naissance || '',
    lieu_naissance: profile.lieu_naissance || '',
    pays_naissance: profile.pays_naissance || '',
    numero_securite_sociale: profile.numero_securite_sociale || '',
    iban: profile.iban || '',
    genre: profile.genre || '',
    civilite: profile.genre === 'M' ? 'Monsieur' : profile.genre === 'F' ? 'Madame' : '',

    // Work information
    poste: profile.poste?.nom || '',
    site: profile.site?.nom || '',
    secteur: profile.secteur?.nom || '',
    salaire: profile.salaire || '',
    type_contrat: profile.type_contrat || '',
    duree_travail: profile.duree_travail || '',

    // Contract dates
    date_debut: profile.date_debut || '',
    date_fin: profile.date_fin || '',

    // Current date
    date_jour: new Date().toLocaleDateString('fr-FR'),

    // Add custom variables
    ...customVariables,
  };

  return data;
}
