import * as fflate from 'fflate';

export interface VariableInfo {
  name: string;
  count: number;
}

export class LetterVariablesExtractor {
  /**
   * Extrait les variables {{...}} d'un texte
   */
  static extractVariablesFromText(text: string): VariableInfo[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = new Map<string, number>();
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const varName = match[1].trim();
      matches.set(varName, (matches.get(varName) || 0) + 1);
    }
    
    return Array.from(matches.entries()).map(([name, count]) => ({
      name,
      count
    }));
  }

  /**
   * Extrait les variables d'un fichier Word (.docx)
   * Les fichiers .docx sont des archives ZIP contenant du XML
   */
  static async extractVariablesFromWordFile(file: File): Promise<VariableInfo[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Impossible de lire le fichier'));
            return;
          }

          // Décompresser le ZIP
          fflate.unzip(new Uint8Array(arrayBuffer), (err, unzipped) => {
            if (err) {
              reject(new Error(`Erreur décompression: ${err.message}`));
              return;
            }

            if (!unzipped) {
              reject(new Error('Fichier vide ou corrompu'));
              return;
            }

            // Lire le document.xml
            const documentXml = unzipped['word/document.xml'];
            if (!documentXml) {
              reject(new Error('Fichier Word invalide: document.xml non trouvé'));
              return;
            }

            // Convertir en string
            const decoder = new TextDecoder('utf-8');
            const xmlContent = decoder.decode(documentXml);

            // Extraire les variables
            const variables = this.extractVariablesFromText(xmlContent);
            
            console.log(`[LetterVariablesExtractor] ${variables.length} variables trouvées:`, 
              variables.map(v => v.name));
            
            resolve(variables);
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lecture du fichier'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Analyse les variables et détermine lesquelles sont requises vs optionnelles
   * Les variables contenant "date", "heure" sont généralement requises
   * Les autres varient selon le contexte
   */
  static analyzeVariables(variables: VariableInfo[]): {
    requises: string[];
    optionnelles: string[];
  } {
    const dateTimeKeywords = ['date', 'heure', 'jour', 'mois', 'annee'];
    
    const requises: string[] = [];
    const optionnelles: string[] = [];

    variables.forEach(v => {
      const isDateTimeRelated = dateTimeKeywords.some(keyword => 
        v.name.toLowerCase().includes(keyword)
      );

      // Pour simplifier: on considère les variables date/heure comme requises
      // Les autres comme optionnelles
      if (isDateTimeRelated) {
        requises.push(v.name);
      } else {
        optionnelles.push(v.name);
      }
    });

    return { requises, optionnelles };
  }

  /**
   * Suggère un nom pour le modèle basé sur les variables
   */
  static suggestTemplateName(variables: VariableInfo[]): string {
    const varNames = variables.map(v => v.name);
    
    // Si c'est un avertissement (incident, km_non_autorises, etc.)
    if (varNames.some(v => v.includes('incident') || v.includes('km'))) {
      return 'Avertissement utilisation vehicule';
    }
    
    // Sinon, utiliser la première variable significative
    return varNames[0] || 'Nouveau modèle';
  }

  /**
   * Détecte le type de courrier basé sur les variables
   */
  static detectLetterType(variables: VariableInfo[]): string {
    const varNames = variables.map(v => v.name).join(' ').toLowerCase();

    if (varNames.includes('incident') || varNames.includes('km')) {
      return 'Avertissement';
    } else if (varNames.includes('contrat') || varNames.includes('cdi')) {
      return 'Contrat';
    } else if (varNames.includes('rupture') || varNames.includes('licenciement')) {
      return 'Licenciement';
    } else if (varNames.includes('demission')) {
      return 'Démission';
    }

    return 'Autre';
  }
}