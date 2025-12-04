/**
 * Utilitaire de validation IBAN et récupération BIC
 * Utilisé dans OnboardingForm et EmployeeList
 */

export interface IbanValidationResult {
  valid: boolean;
  bic: string;
  cleanIban: string;
  error?: string;
}

/**
 * Table de correspondance des codes bancaires français vers BIC
 * Source: Codes bancaires principaux en France
 */
const BANK_CODES: { [key: string]: string } = {
  '20041': 'BNPAFRPP',      // BNP Paribas
  '30004': 'SOGEFRPP',      // Société Générale
  '30003': 'SOGEFRPP',      // Société Générale (autre code)
  '30002': 'CRLYFRPP',      // Crédit Lyonnais
  '30007': 'SOGEFRPP',      // Société Générale (autre code)
  '30066': 'SOGEFRPP',      // Société Générale Entreprises
  '10096': 'CMCIFR2A',      // Crédit Mutuel Île-de-France
  '10107': 'CMCIFRPP',      // Crédit Mutuel
  '10278': 'CMCIFRPP',      // Crédit Mutuel CIC
  '10738': 'CMCIFRPP',      // Crédit Mutuel Anjou
  '10758': 'CMCIFRPP',      // Crédit Mutuel Maine-Anjou
  '11315': 'AGRIFRPP',      // Crédit Agricole
  '11506': 'AGRIFRPP',      // Crédit Agricole Sud Rhône Alpes
  '11635': 'AGRIFRPP',      // Crédit Agricole Loire Haute-Loire
  '18315': 'AGRIFRPP',      // Crédit Agricole (autre code)
  '12135': 'CEPAFRPP',      // Caisse d'Épargne
  '13106': 'CEPAFRPP',      // Caisse d'Épargne Rhône Alpes
  '13335': 'CEPAFRPP',      // Caisse d'Épargne
  '13638': 'CEPAFRPP',      // Caisse d'Épargne Loire-Centre
  '16958': 'CEPAFRPP',      // Caisse d'Épargne Île-de-France
  '14707': 'CCFRFRPP',      // Banque Populaire Val de France
  '16307': 'CCFRFRPP',      // Banque Populaire Auvergne Rhône Alpes
  '17515': 'CCFRFRPP',      // Banque Populaire
  '18206': 'CCFRFRPP',      // Banque Populaire Loire et Lyonnais
  '15589': 'CMBRFR2BARK',   // Banque CIC
};

/**
 * Récupère le BIC à partir du code banque extrait d'un IBAN français
 * @param bankCode Code banque (5 chiffres)
 * @returns BIC correspondant ou chaîne vide
 */
export function getBicFromBankCode(bankCode: string): string {
  return BANK_CODES[bankCode] || '';
}

/**
 * Nettoie un IBAN en supprimant les espaces et en le convertissant en majuscules
 * @param iban IBAN brut saisi par l'utilisateur
 * @returns IBAN nettoyé
 */
export function cleanIban(iban: string): string {
  return iban.replace(/\s/g, '').toUpperCase();
}

/**
 * Valide un IBAN via l'API OpenIBAN et récupère le BIC
 * Utilise une base locale de codes BIC pour les IBAN français en cas d'échec API
 *
 * @param iban IBAN à valider
 * @returns Résultat de validation avec BIC
 */
export async function validateIban(iban: string): Promise<IbanValidationResult> {
  // Vérifier longueur minimale
  if (!iban || iban.length < 15) {
    return {
      valid: false,
      bic: '',
      cleanIban: iban,
      error: '',
    };
  }

  const cleanedIban = cleanIban(iban);

  try {
    // Appel API OpenIBAN pour validation
    const response = await fetch(
      `https://openiban.com/validate/${cleanedIban}?validateBankCode=true&getBIC=true`
    );
    const data = await response.json();

    if (data.valid) {
      let bic = data.bankData?.bic || '';

      // Si pas de BIC retourné et IBAN français, utiliser la base locale
      if (!bic && cleanedIban.startsWith('FR')) {
        const bankCode = cleanedIban.substring(4, 9);
        bic = getBicFromBankCode(bankCode);
      }

      return {
        valid: true,
        bic,
        cleanIban: cleanedIban,
      };
    } else {
      return {
        valid: false,
        bic: '',
        cleanIban: cleanedIban,
        error: 'IBAN invalide',
      };
    }
  } catch (error) {
    console.error('Erreur validation IBAN:', error);

    // Fallback: validation locale pour IBAN français
    if (cleanedIban.startsWith('FR') && cleanedIban.length === 27) {
      const bankCode = cleanedIban.substring(4, 9);
      const bic = getBicFromBankCode(bankCode);

      return {
        valid: true, // On considère valide si format correct
        bic,
        cleanIban: cleanedIban,
        error: 'Validation partielle (hors ligne)',
      };
    }

    return {
      valid: false,
      bic: '',
      cleanIban: cleanedIban,
      error: 'Erreur validation - vérifiez votre connexion',
    };
  }
}

/**
 * Formatte un IBAN pour l'affichage (avec espaces tous les 4 caractères)
 * @param iban IBAN à formatter
 * @returns IBAN formatté
 */
export function formatIban(iban: string): string {
  const cleaned = cleanIban(iban);
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
}
