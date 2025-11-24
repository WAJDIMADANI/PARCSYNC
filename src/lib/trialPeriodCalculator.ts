/**
 * Calculateur de période d'essai selon les règles légales françaises
 */

/**
 * Calcule la durée d'un contrat en jours
 */
export function getContractDurationInDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Ajoute des mois à une date et retourne la veille
 * Exemple: 01/09/2025 + 2 mois = 31/10/2025 (la veille du 01/11/2025)
 */
export function addMonthsMinusOneDay(dateStr: string, months: number): string {
  const date = new Date(dateStr);

  // Ajouter les mois
  date.setMonth(date.getMonth() + months);

  // Soustraire 1 jour
  date.setDate(date.getDate() - 1);

  // Retourner au format YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

/**
 * Ajoute des jours à une date et retourne la veille
 * Exemple: 01/09/2025 + 14 jours = 14/09/2025 (la veille du 15/09/2025)
 */
export function addDaysMinusOneDay(dateStr: string, days: number): string {
  const date = new Date(dateStr);

  // Ajouter les jours - 1
  date.setDate(date.getDate() + days - 1);

  // Retourner au format YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

/**
 * Calcule la date de fin de période d'essai selon le type de contrat
 *
 * @param contractType - Type de contrat: "CDI", "CDD", etc.
 * @param startDate - Date de début (format YYYY-MM-DD)
 * @param endDate - Date de fin (obligatoire pour CDD, format YYYY-MM-DD)
 * @param renewTrial - Pour CDI: true = 4 mois, false = 2 mois (défaut: false)
 * @returns Objet avec la date de fin et une description
 */
export function calculateTrialEndDate(
  contractType: string,
  startDate: string,
  endDate?: string,
  renewTrial: boolean = false
): { endDate: string; description: string } | null {

  // Vérifier que la date de début est fournie
  if (!startDate) {
    console.warn('Date de début manquante');
    return null;
  }

  const upperType = contractType.toUpperCase();

  // ========== CDI ==========
  if (upperType === 'CDI') {
    const months = renewTrial ? 4 : 2;
    const trialEndDate = addMonthsMinusOneDay(startDate, months);
    const description = renewTrial ? '4 mois (renouvelée)' : '2 mois';

    return {
      endDate: trialEndDate,
      description: description
    };
  }

  // ========== CDD ==========
  if (upperType === 'CDD') {
    // Vérifier que la date de fin est fournie pour un CDD
    if (!endDate) {
      console.warn('Date de fin manquante pour un CDD');
      return null;
    }

    // Calculer la durée du CDD en jours
    const durationDays = getContractDurationInDays(startDate, endDate);

    // CDD de 6 mois ou plus (environ 180 jours)
    if (durationDays >= 180) {
      const trialEndDate = addMonthsMinusOneDay(startDate, 1);
      return {
        endDate: trialEndDate,
        description: '1 mois'
      };
    }

    // CDD de moins de 6 mois : 1 jour par semaine, max 14 jours
    const weeks = Math.floor(durationDays / 7);
    const trialDays = Math.min(weeks, 14); // Plafonné à 14 jours (2 semaines)

    if (trialDays < 1) {
      // CDD très court (moins d'une semaine)
      return {
        endDate: startDate,
        description: 'Aucune période d\'essai (CDD < 1 semaine)'
      };
    }

    const trialEndDate = addDaysMinusOneDay(startDate, trialDays);
    return {
      endDate: trialEndDate,
      description: `${trialDays} jour${trialDays > 1 ? 's' : ''}`
    };
  }

  // ========== Autres types ==========
  console.warn(`Type de contrat non géré: ${contractType}`);
  return null;
}

/**
 * Formate une date au format français DD/MM/YYYY
 */
export function formatDateFR(dateStr: string): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
