import * as fflate from 'fflate';

export interface VariableInfo {
  name: string;
  count: number;
}

export class LetterVariablesExtractor {
  /**
   * Reconstruit le texte plain d'un XML Word en concaténant tous les <w:t>
   */
  static extractPlainTextFromXml(xmlContent: string): string {
    const textNodes: string[] = [];

    // Extraire tous les <w:t>, <w:instrText>, <w:delText>
    const tagPatterns = [
      /<w:t[^>]*>(.*?)<\/w:t>/gs,
      /<w:instrText[^>]*>(.*?)<\/w:instrText>/gs,
      /<w:delText[^>]*>(.*?)<\/w:delText>/gs
    ];

    tagPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(xmlContent)) !== null) {
        if (match[1]) {
          // Décoder les entités XML
          const decoded = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
          textNodes.push(decoded);
        }
      }
    });

    return textNodes.join('');
  }

  /**
   * Normalise le texte en nettoyant les caractères invisibles
   */
  static normalizeText(text: string): string {
    return text
      // Remplacer espaces insécables par espaces normaux
      .replace(/\u00A0/g, ' ')
      // Supprimer zero-width characters
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  }

  /**
   * Extrait les variables {{...}} d'un texte
   */
  static extractVariablesFromText(text: string): VariableInfo[] {
    // Normaliser le texte
    const normalized = this.normalizeText(text);

    // Regex pour capturer {{variable}} avec espaces/\u00A0 optionnels
    const regex = /\{\{[\s\u00A0]*([a-zA-Z0-9_]+)[\s\u00A0]*\}\}/g;
    const matches = new Map<string, number>();

    let match;
    while ((match = regex.exec(normalized)) !== null) {
      // Normaliser le nom en lowercase
      const varName = match[1].toLowerCase().trim();
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

            const decoder = new TextDecoder('utf-8');
            const allVariables = new Map<string, number>();

            // Liste des parties à scanner
            const partsToScan = [
              { path: 'word/document.xml', name: 'Document principal' },
              { path: 'word/header1.xml', name: 'En-tête 1' },
              { path: 'word/header2.xml', name: 'En-tête 2' },
              { path: 'word/header3.xml', name: 'En-tête 3' },
              { path: 'word/footer1.xml', name: 'Pied de page 1' },
              { path: 'word/footer2.xml', name: 'Pied de page 2' },
              { path: 'word/footer3.xml', name: 'Pied de page 3' }
            ];

            // Scanner chaque partie
            partsToScan.forEach(part => {
              const xmlData = unzipped[part.path];
              if (!xmlData) {
                return; // Cette partie n'existe pas, continuer
              }

              const xmlContent = decoder.decode(xmlData);

              // Reconstruire le texte plain en concaténant tous les <w:t>
              const plainText = this.extractPlainTextFromXml(xmlContent);

              // Extraire les variables du texte reconstruit
              const variables = this.extractVariablesFromText(plainText);

              console.debug(`[${part.name}] ${variables.length} variable(s) trouvée(s):`,
                variables.map(v => v.name));

              // Fusionner dans la map globale
              variables.forEach(v => {
                const currentCount = allVariables.get(v.name) || 0;
                allVariables.set(v.name, currentCount + v.count);
              });
            });

            // Convertir en tableau final
            const finalVariables = Array.from(allVariables.entries()).map(([name, count]) => ({
              name,
              count
            }));

            console.log(`[LetterVariablesExtractor] TOTAL: ${finalVariables.length} variable(s) unique(s):`,
              finalVariables.map(v => v.name));

            resolve(finalVariables);
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