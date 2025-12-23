/**
 * Extrait les variables {{variable}} d'un fichier Word (.docx)
 * Les fichiers .docx sont des archives ZIP contenant du XML
 */

import { Document } from 'docx';

/**
 * Extrait les variables {{ }} du contenu texte
 */
export function extractVariablesFromText(text: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = text.matchAll(variableRegex);
  const variables = new Set<string>();

  for (const match of matches) {
    const varName = match[1].trim();
    if (varName) {
      variables.add(varName);
    }
  }

  return Array.from(variables).sort();
}

/**
 * Analyse un fichier Word et extrait les variables
 * @param file - Fichier Word à analyser
 * @returns Variables trouvées
 */
export async function extractVariablesFromWordFile(file: File): Promise<{
  variables: string[];
  content: string;
}> {
  try {
    // Utiliser pako ou fflate pour décompresser le ZIP
    // Pour maintenant, on va utiliser une approche simplifiée
    // si la librairie docx est disponible

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Essayer de lire en tant que texte brut d'abord
    const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);

    // Extraire les variables
    const variables = extractVariablesFromText(text);

    return {
      variables,
      content: text
    };
  } catch (error) {
    console.error('Erreur extraction Word:', error);
    throw new Error('Impossible de lire le fichier Word');
  }
}

/**
 * Classe pour analyser les variables détectées
 */
export class VariableAnalyzer {
  private variables: string[];

  constructor(variables: string[]) {
    this.variables = variables;
  }

  /**
   * Classe les variables en optionnelles vs requises basé sur des heuristiques
   */
  classifyVariables(): {
    requises: string[];
    optionnelles: string[];
  } {
    const requises = new Set<string>();
    const optionnelles = new Set<string>();

    // Variables requises (données essentielles du salarié/courrier)
    const requiredPatterns = [
      'nom',
      'prenom',
      'civilite',
      'date',
      'employee',
      'salarié',
      'profil'
    ];

    // Variables optionnelles (détails spécifiques)
    const optionalPatterns = [
      'commentaire',
      'note',
      'description',
      'detail',
      'description_incident',
      'raison'
    ];

    for (const variable of this.variables) {
      const lowerVar = variable.toLowerCase();

      if (requiredPatterns.some(p => lowerVar.includes(p))) {
        requises.add(variable);
      } else if (optionalPatterns.some(p => lowerVar.includes(p))) {
        optionnelles.add(variable);
      } else {
        // Par défaut, considérer comme requise si on n'est pas sûr
        requises.add(variable);
      }
    }

    return {
      requises: Array.from(requises),
      optionnelles: Array.from(optionnelles)
    };
  }

  /**
   * Détecte le type de courrier basé sur le nom du fichier et les variables
   */
  detectLetterType(filename: string): string {
    const lowerFilename = filename.toLowerCase();

    if (lowerFilename.includes('avertissement')) return 'Avertissement';
    if (lowerFilename.includes('convocation')) return 'Convocation';
    if (lowerFilename.includes('attestation')) return 'Attestation';
    if (lowerFilename.includes('sanction')) return 'Sanction';
    if (lowerFilename.includes('félicitations')) return 'Félicitations';
    if (lowerFilename.includes('rappel')) return 'Rappel';

    return 'Autre';
  }

  /**
   * Génère un nom suggéré pour le modèle
   */
  suggestTemplateName(filename: string): string {
    // Enlever l'extension .docx
    const nameWithoutExtension = filename.replace(/\.docx$/i, '');

    // Capitaliser correctement
    return nameWithoutExtension
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}