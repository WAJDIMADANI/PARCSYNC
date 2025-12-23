import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LetterVariablesExtractor, VariableInfo } from '../lib/LetterVariablesExtractor';

export interface LetterTemplateV2 {
  id?: string;
  nom: string;
  type_courrier: string;
  description?: string;
  variables_detectees: string[];
  variables_optionnelles: string[];
  variables_requises: string[];
  storage_path?: string;
  actif: boolean;
  created_at?: string;
  ordre_affichage?: number;
}

export function useLetterTemplatesV2() {
  const [templates, setTemplates] = useState<LetterTemplateV2[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge tous les modèles
   */
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('modele_courrier')
        .select('*')
        .order('ordre_affichage', { ascending: true })
        .order('created_at', { ascending: false });

      if (err) throw err;
      
      setTemplates(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur chargement templates:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crée un nouveau modèle avec extraction automatique des variables
   */
  const createTemplate = useCallback(async (file: File, templateData: Partial<LetterTemplateV2>) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Extraire les variables du fichier Word
      console.log('[useLetterTemplatesV2] Extraction des variables du fichier...');
      const extractedVariables = await LetterVariablesExtractor.extractVariablesFromWordFile(file);
      
      if (extractedVariables.length === 0) {
        throw new Error('Aucune variable détectée dans le fichier. Assurez-vous que vos variables sont au format {{nom_variable}}');
      }

      const variableNames = extractedVariables.map(v => v.name);
      console.log('[useLetterTemplatesV2] Variables trouvées:', variableNames);

      // 2. Analyser les variables
      const { requises, optionnelles } = LetterVariablesExtractor.analyzeVariables(extractedVariables);
      console.log('[useLetterTemplatesV2] Requises:', requises, 'Optionnelles:', optionnelles);

      // 3. Upload le fichier dans Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `templates/${fileName}`;
      
      console.log('[useLetterTemplatesV2] Upload fichier vers Storage...');
      const { error: uploadError } = await supabase.storage
        .from('letter-templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

      // 4. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('letter-templates')
        .getPublicUrl(filePath);

      console.log('[useLetterTemplatesV2] URL publique:', publicUrl);

      // 5. Insérer dans la base de données
      console.log('[useLetterTemplatesV2] Création en BD...');
      const { data, error: insertError } = await supabase
        .from('modele_courrier')
        .insert({
          nom: templateData.nom || '',
          type_courrier: templateData.type_courrier || 'Autre',
          description: templateData.description || '',
          variables_detectees: variableNames,
          variables_requises: requises,
          variables_optionnelles: optionnelles,
          storage_path: filePath,
          actif: true,
          ordre_affichage: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('[useLetterTemplatesV2] Modèle créé:', data);
      
      // 6. Recharger la liste
      await fetchTemplates();
      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur création modèle';
      setError(errorMsg);
      console.error('Erreur:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates]);

  /**
   * Analyse un fichier sans le créer (pour prévisualisation)
   */
  const analyzeFile = useCallback(async (file: File) => {
    try {
      const variables = await LetterVariablesExtractor.extractVariablesFromWordFile(file);
      const { requises, optionnelles } = LetterVariablesExtractor.analyzeVariables(variables);
      const suggestedName = LetterVariablesExtractor.suggestTemplateName(variables);
      const detectedType = LetterVariablesExtractor.detectLetterType(variables);

      return {
        variables: variables.map(v => v.name),
        requises,
        optionnelles,
        suggestedName,
        detectedType,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Met à jour un modèle
   */
  const updateTemplate = useCallback(async (id: string, updates: Partial<LetterTemplateV2>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('modele_courrier')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      
      await fetchTemplates();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates]);

  /**
   * Active/désactive un modèle
   */
  const toggleTemplate = useCallback(async (id: string, actif: boolean) => {
    return updateTemplate(id, { actif });
  }, [updateTemplate]);

  /**
   * Supprime un modèle
   */
  const deleteTemplate = useCallback(async (id: string, storagePath?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Supprimer du Storage
      if (storagePath) {
        await supabase.storage
          .from('letter-templates')
          .remove([storagePath]);
      }

      // Supprimer de la BD
      const { error: err } = await supabase
        .from('modele_courrier')
        .delete()
        .eq('id', id);

      if (err) throw err;
      
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates]);

  /**
   * Télécharge le fichier Word original
   */
  const downloadTemplate = useCallback(async (storagePath: string, fileName: string) => {
    try {
      const { data, error: err } = await supabase.storage
        .from('letter-templates')
        .download(storagePath);

      if (err) throw err;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    analyzeFile,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
    downloadTemplate,
  };
}