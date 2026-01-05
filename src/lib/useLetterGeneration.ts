import { useState } from 'react';
import * as fflate from 'fflate';
import { supabase } from '../lib/supabase';

export interface GenerationOptions {
  templateId: string;
  variables: Record<string, string>;
  outputFormat: 'docx' | 'pdf'; // Pour futur PDF
}

export function useLetterGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Décode les entités XML
   */
  const xmlUnescape = (text: string): string => {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  };

  /**
   * Encode les entités XML
   */
  const xmlEscape = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  /**
   * Remplace les variables même si elles sont fragmentées entre plusieurs <w:t>
   */
  const replaceVariablesAcrossWT = (xmlContent: string, variables: Record<string, string>): string => {
    console.debug('[replaceVariablesAcrossWT] Variables à remplacer:', Object.keys(variables));

    // 1. Extraire tous les <w:t ...>TEXT</w:t> avec leurs positions
    interface WTNode {
      fullMatch: string;
      openTag: string;
      text: string;
      closeTag: string;
      startIndex: number;
      endIndex: number;
    }

    const wtNodes: WTNode[] = [];
    const wtRegex = /(<w:t[^>]*>)(.*?)(<\/w:t>)/gs;
    let match;

    while ((match = wtRegex.exec(xmlContent)) !== null) {
      wtNodes.push({
        fullMatch: match[0],
        openTag: match[1],
        text: match[2],
        closeTag: match[3],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    if (wtNodes.length === 0) {
      return xmlContent;
    }

    // 2. Reconstruire le plainText en concaténant tous les TEXT
    const plainTextParts: string[] = [];
    const plainTextToNodeMap: { charIndex: number; nodeIndex: number; nodeCharIndex: number }[] = [];

    wtNodes.forEach((node, nodeIndex) => {
      const unescapedText = xmlUnescape(node.text);
      const startCharIndex = plainTextParts.join('').length;

      for (let i = 0; i < unescapedText.length; i++) {
        plainTextToNodeMap.push({
          charIndex: startCharIndex + i,
          nodeIndex: nodeIndex,
          nodeCharIndex: i
        });
      }

      plainTextParts.push(unescapedText);
    });

    const plainText = plainTextParts.join('');

    // 3. Chercher les variables dans le plainText
    const variableRegex = /\{\{[\s\u00A0]*([a-zA-Z0-9_]+)[\s\u00A0]*\}\}/g;
    const replacements: {
      startChar: number;
      endChar: number;
      varName: string;
      value: string;
    }[] = [];

    let varMatch;
    while ((varMatch = variableRegex.exec(plainText)) !== null) {
      const varName = varMatch[1].toLowerCase().trim();

      // Chercher la valeur (case-insensitive)
      let value = '';
      for (const [key, val] of Object.entries(variables)) {
        if (key.toLowerCase() === varName) {
          value = val;
          break;
        }
      }

      if (value) {
        console.debug(`[replaceVariablesAcrossWT] Found placeholder {{${varName}}} = "${value}"`);
        replacements.push({
          startChar: varMatch.index,
          endChar: varMatch.index + varMatch[0].length,
          varName: varName,
          value: value
        });
      }
    }

    if (replacements.length === 0) {
      return xmlContent;
    }

    // 4. Pour chaque remplacement, modifier les w:t concernés
    const modifiedNodes = [...wtNodes];

    replacements.forEach(replacement => {
      const startMapping = plainTextToNodeMap[replacement.startChar];
      const endMapping = plainTextToNodeMap[replacement.endChar - 1];

      if (!startMapping || !endMapping) {
        return;
      }

      const startNodeIndex = startMapping.nodeIndex;
      const endNodeIndex = endMapping.nodeIndex;

      console.debug(`[replaceVariablesAcrossWT] Replacing {{${replacement.varName}}} across nodes ${startNodeIndex} to ${endNodeIndex}`);

      // Reconstituer les textes originaux (unescaped)
      const nodeTexts = modifiedNodes.slice(startNodeIndex, endNodeIndex + 1).map(n => xmlUnescape(n.text));

      // Construire le nouveau texte complet
      const beforeVar = nodeTexts[0].substring(0, startMapping.nodeCharIndex);
      const afterVar = endNodeIndex === startNodeIndex
        ? nodeTexts[0].substring(endMapping.nodeCharIndex + 1)
        : nodeTexts[nodeTexts.length - 1].substring(endMapping.nodeCharIndex + 1);

      const newFullText = beforeVar + replacement.value + afterVar;

      // Mettre le nouveau texte dans le premier node, vider les autres
      modifiedNodes[startNodeIndex] = {
        ...modifiedNodes[startNodeIndex],
        text: xmlEscape(newFullText)
      };

      // Vider les nodes intermédiaires et le dernier (si différent du premier)
      for (let i = startNodeIndex + 1; i <= endNodeIndex; i++) {
        modifiedNodes[i] = {
          ...modifiedNodes[i],
          text: ''
        };
      }

      console.debug(`[replaceVariablesAcrossWT] Replaced {{${replacement.varName}}}`);
    });

    // 5. Rebuild le XML
    let result = xmlContent;

    // Remplacer en partant de la fin pour ne pas décaler les indices
    for (let i = modifiedNodes.length - 1; i >= 0; i--) {
      const original = wtNodes[i];
      const modified = modifiedNodes[i];

      const newTag = modified.openTag + modified.text + modified.closeTag;

      result = result.substring(0, original.startIndex) +
               newTag +
               result.substring(original.endIndex);
    }

    return result;
  };

  /**
   * Génère un courrier en remplaçant les variables
   */
  const generateLetter = async (
    options: GenerationOptions,
    templateStoragePath: string,
    templateFileName: string
  ): Promise<Blob> => {
    setLoading(true);
    setError(null);

    return new Promise(async (resolve, reject) => {
      try {
        // 1. Télécharger le fichier Word depuis Storage
        console.log('[useLetterGeneration] Téléchargement du template...');
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('letter-templates')
          .download(templateStoragePath);

        if (downloadError) {
          throw new Error(`Erreur téléchargement: ${downloadError.message}`);
        }

        // 2. Décompresser le ZIP
        console.log('[useLetterGeneration] Décompression du fichier Word...');
        const arrayBuffer = await fileData.arrayBuffer();
        
        fflate.unzip(new Uint8Array(arrayBuffer), (err, unzipped) => {
          if (err) {
            reject(new Error(`Erreur décompression: ${err.message}`));
            return;
          }

          if (!unzipped) {
            reject(new Error('Fichier vide ou corrompu'));
            return;
          }

          try {
            // 3. Lire et modifier document.xml + headers + footers
            console.log('[useLetterGeneration] Remplacement des variables...');

            const partsToProcess = [
              'word/document.xml',
              'word/header1.xml',
              'word/header2.xml',
              'word/header3.xml',
              'word/footer1.xml',
              'word/footer2.xml',
              'word/footer3.xml'
            ];

            const decoder = new TextDecoder('utf-8');
            const encoder = new TextEncoder();

            partsToProcess.forEach(partPath => {
              const xmlData = unzipped[partPath];
              if (!xmlData) return;

              const xmlContent = decoder.decode(xmlData);
              const replacedContent = replaceVariablesAcrossWT(xmlContent, options.variables);
              unzipped[partPath] = encoder.encode(replacedContent);
            });

            // Vérifier que document.xml a été traité
            if (!unzipped['word/document.xml']) {
              throw new Error('document.xml non trouvé');
            }

            // 4. Recompresser le ZIP avec le contenu modifié
            console.log('[useLetterGeneration] Recompression...');

            fflate.zip(unzipped, (err, zipData) => {
              if (err) {
                reject(new Error(`Erreur recompression: ${err.message}`));
                return;
              }

              // 5. Créer un Blob et retourner
              const blob = new Blob([zipData], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              });

              console.log('[useLetterGeneration] Génération réussie!', blob.size, 'bytes');
              resolve(blob);
            });
          } catch (error) {
            reject(error);
          }
        });
      } catch (err: any) {
        const errorMsg = err.message || 'Erreur génération';
        setError(errorMsg);
        reject(err);
      } finally {
        setLoading(false);
      }
    });
  };

  /**
   * Télécharge le fichier généré
   */
  const downloadGeneratedLetter = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    loading,
    error,
    generateLetter,
    downloadGeneratedLetter,
  };
}