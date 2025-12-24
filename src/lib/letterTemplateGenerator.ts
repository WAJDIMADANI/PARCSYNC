import { supabase } from './supabase';
import jsPDF from 'jspdf';
import { sanitizeFileName } from '../utils/fileNameSanitizer';

export const SYSTEM_VARIABLES: Record<string, string> = {
  // Identité
  'nom': 'Nom du salarié',
  'prenom': 'Prénom du salarié',
  'nom_complet': 'Nom complet',
  'civilite': 'Civilité (Monsieur/Madame)',
  'matricule_tca': 'Matricule TCA',

  // Contact
  'email': 'Email',
  'tel': 'Téléphone',
  'adresse': 'Adresse',
  'complement_adresse': 'Complément d\'adresse',
  'code_postal': 'Code postal',
  'ville': 'Ville',

  // Professionnel
  'poste': 'Poste',
  'site_nom': 'Site',
  'secteur_nom': 'Secteur',
  'date_entree': 'Date d\'entrée',
  'date_sortie': 'Date de sortie',

  // Personnel
  'date_naissance': 'Date de naissance',
  'lieu_naissance': 'Lieu de naissance',
  'nationalite': 'Nationalité',
  'numero_securite_sociale': 'N° Sécurité Sociale',

  // Dates
  'date_aujourd_hui': 'Date du jour',

  // Entreprise
  'nom_entreprise': 'Nom de l\'entreprise',
  'adresse_entreprise': 'Adresse de l\'entreprise',
  'ville_entreprise': 'Ville de l\'entreprise',
  'tel_entreprise': 'Téléphone de l\'entreprise',
  'siret_entreprise': 'SIRET',
  'rcs_entreprise': 'RCS',
  'code_naf_entreprise': 'Code NAF',
  'groupe_entreprise': 'Groupe',

  // Signataire
  'prenom_signataire': 'Prénom du signataire',
  'nom_signataire': 'Nom du signataire',
  'fonction_signataire': 'Fonction du signataire',

  // Courrier disciplinaire
  'type_courrier': 'Type de courrier',
  'mode_envoi': 'Mode d\'envoi',
  'motif_avertissement': 'Motif de l\'avertissement',
  'periode_concernee': 'Période concernée',
  'resume_faits': 'Résumé des faits',
  'details_infractions': 'Détails des infractions',
  'total_km_non_autorises': 'Total km non autorisés',
  'nombre_incidents': 'Nombre d\'incidents',
  'date_avertissement_reference': 'Date avertissement de référence',
  'historique_avertissements': 'Historique des avertissements',
  'mesure_disciplinaire': 'Mesure disciplinaire',
  'risque_en_cas_de_recidive': 'Risque en cas de récidive',

  // Véhicule de service
  'type_vehicule': 'Type de véhicule',
  'immatriculation_vehicule': 'Immatriculation du véhicule',
  'modele_vehicule': 'Modèle du véhicule',
  'zone_autorisee': 'Zone autorisée',

  // Convocation à entretien
  'date_entretien': 'Date de l\'entretien',
  'heure_entretien': 'Heure de l\'entretien',
  'lieu_entretien': 'Lieu de l\'entretien',
  'type_entretien': 'Type d\'entretien',

  // Mise à pied conservatoire
  'date_debut_mise_a_pied': 'Date de début de mise à pied',
  'date_fin_mise_a_pied': 'Date de fin de mise à pied',

  // Licenciement
  'date_courrier_convocation_prealable': 'Date courrier convocation préalable',
  'date_entretien_prealable': 'Date entretien préalable',
  'lieu_entretien_prealable': 'Lieu entretien préalable',
  'motif_licenciement': 'Motif du licenciement'
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

  // Déterminer la civilité basée sur le genre
  let civilite = 'Madame, Monsieur'; // Valeur par défaut neutre
  if (profil.genre) {
    const genre = profil.genre.toLowerCase();
    if (genre === 'masculin' || genre === 'homme' || genre === 'm') {
      civilite = 'Monsieur';
    } else if (genre === 'féminin' || genre === 'femme' || genre === 'f') {
      civilite = 'Madame';
    }
  }

  return {
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
    nationalite: profil.nationalite || '',
    numero_securite_sociale: profil.nir || '',

    // Dates
    date_aujourd_hui: formatDate(today.toISOString()),

    // Entreprise
    nom_entreprise: 'TRANSPORT CLASSE AFFAIRE',
    adresse_entreprise: '111 Avenue Victor Hugo, 75116 Paris',
    ville_entreprise: 'Paris',
    tel_entreprise: '01.86.22.24.00',
    siret_entreprise: '50426507500029',
    rcs_entreprise: 'RCS PARIS B 504265075',
    code_naf_entreprise: '4939B – Autres transports routiers de voyageurs',
    groupe_entreprise: 'NKM HOLDING',

    // Signataire
    prenom_signataire: '',
    nom_signataire: '',
    fonction_signataire: 'Direction des Ressources Humaines',

    // Courrier disciplinaire (valeurs vides, à remplir par variables personnalisées)
    type_courrier: '',
    mode_envoi: '',
    motif_avertissement: '',
    periode_concernee: '',
    resume_faits: '',
    details_infractions: '',
    total_km_non_autorises: '',
    nombre_incidents: '',
    date_avertissement_reference: '',
    historique_avertissements: '',
    mesure_disciplinaire: '',
    risque_en_cas_de_recidive: '',

    // Véhicule de service
    type_vehicule: '',
    immatriculation_vehicule: '',
    modele_vehicule: '',
    zone_autorisee: '',

    // Convocation à entretien
    date_entretien: '',
    heure_entretien: '',
    lieu_entretien: '',
    type_entretien: '',

    // Mise à pied conservatoire
    date_debut_mise_a_pied: '',
    date_fin_mise_a_pied: '',

    // Licenciement
    date_courrier_convocation_prealable: '',
    date_entretien_prealable: '',
    lieu_entretien_prealable: '',
    motif_licenciement: ''
  };
}

export function replaceAllVariables(
  template: string,
  systemValues: Record<string, string>,
  customValues: Record<string, any>
): string {
  if (!template) return '';
  let result = template;

  // D'abord remplacer les variables système (sans formatage spécial)
  Object.entries(systemValues).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const displayValue = formatCustomValue(value) || '';
    result = result.replace(regex, displayValue);
  });

  // Ensuite remplacer les variables personnalisées (EN GRAS ET EN ROUGE)
  Object.entries(customValues).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const displayValue = formatCustomValue(value) || '';
    // Wrapper avec HTML pour affichage en gras et rouge
    const styledValue = `<b style="color: red;">${displayValue}</b>`;
    result = result.replace(regex, styledValue);
  });

  return result;
}

function formatCustomValue(value: any): string {
  if (value === null || value === undefined || value === '') return '[Non renseigné]';

  // Check if it's a Date object
  if (value instanceof Date) {
    return formatDate(value);
  }

  // Check if it's a date string (must contain -, /, or T for ISO format)
  if (typeof value === 'string' && (value.includes('-') || value.includes('/') || value.includes('T'))) {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
      return formatDate(value);
    }
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
  const sanitizedModelName = sanitizeFileName(modeleName);
  const fileName = `${Date.now()}_${sanitizedModelName}.pdf`;
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
  pdfUrl: string
): Promise<string> {
  // 1) Récupérer l'utilisateur authentifié
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[courrier] Auth error:', authError);
    throw authError || new Error('Utilisateur non authentifié');
  }
  console.log('[courrier] auth uid', user.id);

  // 2) Récupérer l'app_utilisateur.id correspondant
  const { data: appUser, error: appUserError } = await supabase
    .from('app_utilisateur')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (appUserError || !appUser) {
    console.error('[courrier] app_utilisateur introuvable:', appUserError);
    throw appUserError || new Error('app_utilisateur introuvable pour cet utilisateur');
  }
  console.log('[courrier] appUser.id', appUser.id);

  // 3) Insérer dans courrier_genere avec created_by = appUser.id (PAS auth.uid())
  const payload = {
    profil_id: profilId,
    modele_courrier_id: modeleId,
    modele_nom: modeleName,
    sujet: subject,
    contenu_genere: content,
    variables_remplies: variables,
    fichier_pdf_url: pdfUrl,
    created_by: appUser.id
  };

  console.log('[courrier] payload.created_by', payload.created_by);
  console.log('[courrier] payload complet:', JSON.stringify(payload, null, 2));

  const { data, error: dbError } = await supabase
    .from('courrier_genere')
    .insert(payload)
    .select()
    .single();

  if (dbError) {
    console.error('[courrier] insert error', dbError);
    throw dbError;
  }

  console.log('[courrier] Courrier enregistré avec succès, ID:', data.id);
  return data.id;
}

export function validateAllVariablesReplaced(content: string): { valid: boolean, missing: string[] } {
  const remaining = extractVariables(content);
  return {
    valid: remaining.length === 0,
    missing: remaining
  };
}
