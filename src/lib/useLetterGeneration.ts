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
   * Remplace les variables dans le contenu XML
   */
  const replaceVariablesInXml = (xmlContent: string, variables: Record<string, string>): string => {
    let result = xmlContent;

    // Remplacer chaque variable {{nom}} par sa valeur
    Object.entries(variables).forEach(([varName, value]) => {
      // Échappe les caractères spéciaux pour la regex
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedVarName}\\s*\\}\\}`, 'g');
      
      // Remplace la variable par la valeur (échappe les caractères XML)
      const escapedValue = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      result = result.replace(regex, escapedValue);
    });

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
            // 3. Lire et modifier document.xml
            console.log('[useLetterGeneration] Remplacement des variables...');
            const documentXml = unzipped['word/document.xml'];
            if (!documentXml) {
              throw new Error('document.xml non trouvé');
            }

            const decoder = new TextDecoder('utf-8');
            let xmlContent = decoder.decode(documentXml);

            // Remplacer les variables
            xmlContent = this.replaceVariablesInXml(xmlContent, options.variables);

            // 4. Recompresser le ZIP avec le contenu modifié
            console.log('[useLetterGeneration] Recompression...');
            const encoder = new TextEncoder();
            unzipped['word/document.xml'] = encoder.encode(xmlContent);

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