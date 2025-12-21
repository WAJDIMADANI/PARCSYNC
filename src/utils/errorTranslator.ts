/**
 * Traduit les erreurs techniques en messages clairs et compréhensibles en français
 */
export function translateError(error: any): { title: string; message: string } {
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code;

  // Validation supprimée : Autoriser plusieurs contrats par salarié
  // Note: La contrainte ux_contrat_one_base_per_group a été supprimée de la base de données

  // Erreur de permission
  if (errorMessage.includes('permission denied') ||
      errorMessage.includes('RLS') ||
      errorCode === 'PGRST301') {
    return {
      title: 'Permission refusée',
      message: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.\n\nVeuillez contacter un administrateur.'
    };
  }

  // Erreur d'email invalide
  if (errorMessage.includes('email') && errorMessage.includes('invalid')) {
    return {
      title: 'Email invalide',
      message: 'L\'adresse email fournie n\'est pas valide.\n\nVeuillez vérifier et réessayer.'
    };
  }

  // Erreur Yousign
  if (errorMessage.includes('Yousign')) {
    return {
      title: 'Erreur de signature électronique',
      message: 'Une erreur s\'est produite lors de la création de la demande de signature électronique.\n\n' + errorMessage
    };
  }

  // Erreur de génération PDF
  if (errorMessage.includes('PDF') || errorMessage.includes('PDFShift') || errorMessage.includes('CloudConvert')) {
    return {
      title: 'Erreur de génération du document',
      message: 'Le document n\'a pas pu être généré.\n\n' + errorMessage
    };
  }

  // Erreur de dates
  if (errorMessage.includes('date')) {
    return {
      title: 'Erreur de dates',
      message: errorMessage
    };
  }

  // Erreur réseau
  if (errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch')) {
    return {
      title: 'Erreur de connexion',
      message: 'Impossible de se connecter au serveur.\n\nVéifiez votre connexion internet et réessayez.'
    };
  }

  // Erreur de champs manquants
  if (errorMessage.includes('required') ||
      errorMessage.includes('manquant') ||
      errorMessage.includes('missing')) {
    return {
      title: 'Informations manquantes',
      message: errorMessage
    };
  }

  // Erreur générique
  return {
    title: 'Une erreur est survenue',
    message: errorMessage || 'Une erreur inattendue s\'est produite. Veuillez réessayer.'
  };
}
