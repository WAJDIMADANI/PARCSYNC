import { supabase } from './supabase';
import jsPDF from 'jspdf';

export const SYSTEM_VARIABLES: Record<string, string> = {
  'nom': 'Nom du salarié',
  'prenom': 'Prénom du salarié',
  'nom_complet': 'Nom complet',
  'matricule_tca': 'Matricule TCA',
  'email': 'Email',
  'tel': 'Téléphone',
  'adresse': 'Adresse',
  'complement_adresse': 'Complément d\'adresse',
  'code_postal': 'Code postal',
  'ville': 'Ville',
  'poste': 'Poste',
  'site_nom': 'Site',
  'secteur_nom': 'Secteur',
  'date_entree': 'Date d\'entrée',
  'date_sortie': 'Date de sortie',
  'date_naissance': 'Date de naissance',
  'lieu_naissance': 'Lieu de naissance',
  'nationalite': 'Nationalité',
  'numero_securite_sociale': 'N° Sécurité Sociale',
  'date_aujourd_hui': 'Date du jour',
  'nom_entreprise': 'Nom de l\'entreprise',
  'adresse_entreprise': 'Adresse de l\'entreprise',
  'siret_entreprise': 'SIRET',
  'prenom_signataire': 'Prénom du signataire',
  'nom_signataire': 'Nom du signataire',
  'fonction_signataire': 'Fonction du signataire'
};

export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [...template.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
}

export function classifyVariables(
  variables: string[],
  customVarNames: string[]
): { system: string[], custom: string[], unknown: string[] } {
  const system = variables.filter(v => SYSTEM_VARIABLES[v]);
  const custom = variables.filter(v => customVarNames.includes(v));
  const unknown = variables.filter(v => !SYSTEM_VARIABLES[v] && !customVarNames.includes(v));

  return { system, custom, unknown };
}

export function formatProfileData(profil: any): Record<string, string> {
  const today = new Date();

  return {
    nom: profil.nom || '',
    prenom: profil.prenom || '',
    nom_complet: `${profil.prenom || ''} ${profil.nom || ''}`.trim(),
    matricule_tca: profil.matricule_tca || '',
    email: profil.email || '',
    tel: profil.tel || '',
    adresse: profil.adresse || '',
    complement_adresse: profil.complement_adresse || '',
    code_postal: profil.code_postal || '',
    ville: profil.ville || '',
    poste: profil.poste || '',
    site_nom: profil.site?.nom || '',
    secteur_nom: profil.secteur?.nom || '',
    date_entree: profil.date_entree ? formatDate(profil.date_entree) : '',
    date_sortie: profil.date_sortie ? formatDate(profil.date_sortie) : '',
    date_naissance: profil.date_naissance ? formatDate(profil.date_naissance) : '',
    lieu_naissance: profil.lieu_naissance || '',
    nationalite: profil.nationalite || '',
    numero_securite_sociale: profil.numero_securite_sociale || '',
    date_aujourd_hui: formatDate(today.toISOString()),
    nom_entreprise: 'TRANSPORT CLASSE AFFAIRE',
    adresse_entreprise: '111 Avenue Victor Hugo, 75116 Paris',
    siret_entreprise: '50426507500029',
    prenom_signataire: '',
    nom_signataire: '',
    fonction_signataire: 'Direction des Ressources Humaines'
  };
}

export function replaceAllVariables(
  template: string,
  systemValues: Record<string, string>,
  customValues: Record<string, any>
): string {
  let result = template;

  Object.entries(systemValues).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '[Non renseigné]');
  });

  Object.entries(customValues).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const displayValue = formatCustomValue(value);
    result = result.replace(regex, displayValue);
  });

  return result;
}

function formatCustomValue(value: any): string {
  if (value === null || value === undefined || value === '') return '[Non renseigné]';
  if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
    return formatDate(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  return String(value);
}

function formatDate(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('fr-FR');
  } catch {
    return String(dateStr);
  }
}

export async function generatePDF(
  content: string,
  subject: string,
  employeeName: string
): Promise<Blob> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);

  let yPosition = margin;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(subject, margin, yPosition);
  yPosition += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const lines = content.split('\n');

  for (const line of lines) {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    if (line.trim() === '') {
      yPosition += 5;
      continue;
    }

    const wrappedLines = doc.splitTextToSize(line, maxWidth);

    wrappedLines.forEach((wrappedLine: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(wrappedLine, margin, yPosition);
      yPosition += 7;
    });
  }

  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  const footerText = `Document généré le ${new Date().toLocaleDateString('fr-FR')}`;
  doc.text(footerText, margin, pageHeight - 10);

  return doc.output('blob');
}

export async function uploadLetterPDF(
  blob: Blob,
  profilId: string,
  modeleName: string
): Promise<string> {
  const fileName = `${Date.now()}_${modeleName.replace(/\s+/g, '_')}.pdf`;
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const path = `${year}/${month}/${profilId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('courriers-generes')
    .upload(path, blob);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('courriers-generes')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function saveGeneratedLetter(
  profilId: string,
  modeleId: string | null,
  modeleName: string,
  subject: string,
  content: string,
  variables: Record<string, any>,
  pdfUrl: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('courrier_genere')
    .insert({
      profil_id: profilId,
      modele_courrier_id: modeleId,
      modele_nom: modeleName,
      sujet: subject,
      contenu_genere: content,
      variables_remplies: variables,
      fichier_pdf_url: pdfUrl,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export function validateAllVariablesReplaced(content: string): { valid: boolean, missing: string[] } {
  const remaining = extractVariables(content);
  return {
    valid: remaining.length === 0,
    missing: remaining
  };
}
