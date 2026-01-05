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
   * Supprime les caractères interdits en XML (mais garde \t \n \r)
   */
  const sanitizeForXml = (text: string): string => {
    // Supprimer 0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F (sauf 0x09=\t, 0x0A=\n, 0x0D=\r)
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  };

  /**
   * Encode les entités XML
   */
  const xmlEscape = (text: string): string => {
    const sanitized = sanitizeForXml(text);
    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  /**
   * Remplace les variables même si elles sont fragmentées entre plusieurs <w:t>
   * Utilise DOM parsing pour éviter de casser le XML
   */
  const replaceVariablesAcrossWT = (xmlContent: string, variables: Record<string, string>, xmlPath: string): string => {
    console.debug(`[replaceVariablesAcrossWT] Processing ${xmlPath}, variables:`, Object.keys(variables));

    // 1. Parser le XML avec DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');

    // Vérifier les erreurs de parsing
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error(`[replaceVariablesAcrossWT] Parse error in ${xmlPath}:`, parserError.textContent);
      throw new Error(`XML parse error in ${xmlPath}`);
    }

    // 2. Récupérer tous les nœuds <w:t>
    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    let textNodes = doc.getElementsByTagNameNS(wordNamespace, 't');

    // Fallback si le namespace ne fonctionne pas
    if (!textNodes || textNodes.length === 0) {
      textNodes = doc.getElementsByTagName('w:t');
    }

    if (!textNodes || textNodes.length === 0) {
      console.debug(`[replaceVariablesAcrossWT] No w:t nodes found in ${xmlPath}`);
      return xmlContent;
    }

    // 3. Construire segments avec les nodes et leur texte
    interface Segment {
      node: Element;
      text: string;
    }

    const segments: Segment[] = [];
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const text = node.textContent || '';
      segments.push({ node, text });
    }

    // 4. Reconstruire le plainText (garder NBSP pour correspondance exacte)
    const plainText = segments.map(s => s.text).join('');

    // 5. Trouver les placeholders
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
        console.debug(`[replaceVariablesAcrossWT] Found {{${varName}}} in ${xmlPath} = "${value}"`);
        replacements.push({
          startChar: varMatch.index,
          endChar: varMatch.index + varMatch[0].length,
          varName: varName,
          value: sanitizeForXml(value) // Sanitize ici
        });
      }
    }

    if (replacements.length === 0) {
      console.debug(`[replaceVariablesAcrossWT] No replacements needed in ${xmlPath}`);
      return xmlContent;
    }

    // Trier de droite à gauche
    replacements.sort((a, b) => b.startChar - a.startChar);

    // 6. Appliquer les remplacements
    replacements.forEach(replacement => {
      console.debug(`[replaceVariablesAcrossWT] Replacing {{${replacement.varName}}} in ${xmlPath}`);

      // Trouver les segments concernés
      let cumul = 0;
      let startSegIndex = -1;
      let startOffset = 0;
      let endSegIndex = -1;
      let endOffset = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segLen = seg.text.length;

        // Début du placeholder
        if (startSegIndex === -1 && cumul + segLen > replacement.startChar) {
          startSegIndex = i;
          startOffset = replacement.startChar - cumul;
        }

        // Fin du placeholder
        if (endSegIndex === -1 && cumul + segLen >= replacement.endChar) {
          endSegIndex = i;
          endOffset = replacement.endChar - cumul;
          break;
        }

        cumul += segLen;
      }

      if (startSegIndex === -1 || endSegIndex === -1) {
        console.warn(`[replaceVariablesAcrossWT] Could not locate segments for {{${replacement.varName}}}`);
        return;
      }

      // Modifier les textContent
      if (startSegIndex === endSegIndex) {
        // Même segment
        const seg = segments[startSegIndex];
        const prefix = seg.text.substring(0, startOffset);
        const suffix = seg.text.substring(endOffset);
        seg.node.textContent = prefix + replacement.value + suffix;
        seg.text = seg.node.textContent || '';
      } else {
        // Multiple segments
        const startSeg = segments[startSegIndex];
        const endSeg = segments[endSegIndex];

        const prefix = startSeg.text.substring(0, startOffset);
        const suffix = endSeg.text.substring(endOffset);

        startSeg.node.textContent = prefix + replacement.value;
        startSeg.text = startSeg.node.textContent || '';

        // Vider les segments intermédiaires
        for (let i = startSegIndex + 1; i < endSegIndex; i++) {
          segments[i].node.textContent = '';
          segments[i].text = '';
        }

        endSeg.node.textContent = suffix;
        endSeg.text = endSeg.node.textContent || '';
      }

      console.debug(`[replaceVariablesAcrossWT] Replaced {{${replacement.varName}}} in ${xmlPath}`);
    });

    // 7. Serializer
    const serializer = new XMLSerializer();
    const serializedXml = serializer.serializeToString(doc);

    // 8. Valider le résultat
    if (!validateXml(serializedXml)) {
      throw new Error(`XML invalide après serialization dans ${xmlPath}`);
    }

    return serializedXml;
  };

  /**
   * Valide le XML avec DOMParser
   */
  const validateXml = (xmlContent: string): boolean => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('[validateXml] XML parsing error detected:');
      console.error(parserError.textContent);

      // Extraire un extrait autour de l'erreur si possible
      const errorText = parserError.textContent || '';
      const match = errorText.match(/line (\d+)/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        const lines = xmlContent.split('\n');
        const start = Math.max(0, lineNum - 3);
        const end = Math.min(lines.length, lineNum + 2);
        console.error(`Context (lines ${start}-${end}):`);
        for (let i = start; i < end; i++) {
          console.error(`${i + 1}: ${lines[i].substring(0, 200)}`);
        }
      }

      return false;
    }

    return true;
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
              const replacedContent = replaceVariablesAcrossWT(xmlContent, options.variables, partPath);

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