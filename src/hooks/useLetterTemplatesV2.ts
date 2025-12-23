import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface LetterTemplateV2 {
  id: string;
  nom: string;
  type_courrier: string;
  description?: string;
  fichier_word_url: string;
  variables_detectees: string[];
  variables_optionnelles: string[];
  variables_requises: string[];
  actif: boolean;
  ordre_affichage: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useLetterTemplatesV2() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LetterTemplateV2[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupère tous les modèles actifs
   */
  const fetchTemplates = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('modele_courrier')
        .select('*')
        .order('ordre_affichage', { ascending: true })
        .order('created_at', { ascending: false });

      if (err) throw err;

      setTemplates((data as LetterTemplateV2[]) || []);
    } catch (err: any) {
      console.error('Erreur chargement modèles:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /**
   * Crée un nouveau modèle avec le fichier Word en Storage
   */
  const createTemplate = useCallback(
    async (templateData: {
      nom: string;
      type_courrier: string;
      description?: string;
      file: File;
      variables_detectees: string[];
      variables_optionnelles: string[];
      variables_requises: string[];
    }) => {
      if (!user) throw new Error('Non authentifié');

      setError(null);

      try {
        // 1. Upload le fichier Word dans Storage
        const fileName = `${Date.now()}_${templateData.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('letter_templates')
          .upload(fileName, templateData.file);

        if (uploadError) throw uploadError;

        // 2. Obtenir l'URL public du fichier
        const { data: publicData } = supabase.storage
          .from('letter_templates')
          .getPublicUrl(fileName);

        // 3. Créer l'entrée en BD
        const { error: dbError } = await supabase
          .from('modele_courrier')
          .insert({
            nom: templateData.nom,
            type_courrier: templateData.type_courrier,
            description: templateData.description || null,
            fichier_word_url: publicData.publicUrl,
            variables_detectees: templateData.variables_detectees,
            variables_optionnelles: templateData.variables_optionnelles,
            variables_requises: templateData.variables_requises,
            actif: true,
            created_by: user.id
          });

        if (dbError) throw dbError;

        // 4. Rafraîchir la liste
        await fetchTemplates();

        return { success: true };
      } catch (err: any) {
        const message = err.message || 'Erreur lors de la création du modèle';
        setError(message);
        throw err;
      }
    },
    [user, fetchTemplates]
  );

  /**
   * Met à jour un modèle
   */
  const updateTemplate = useCallback(
    async (
      templateId: string,
      updates: Partial<LetterTemplateV2>
    ) => {
      if (!user) throw new Error('Non authentifié');

      setError(null);

      try {
        const { error: err } = await supabase
          .from('modele_courrier')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId);

        if (err) throw err;

        await fetchTemplates();
        return { success: true };
      } catch (err: any) {
        const message = err.message || 'Erreur lors de la mise à jour';
        setError(message);
        throw err;
      }
    },
    [user, fetchTemplates]
  );

  /**
   * Active/désactive un modèle
   */
  const toggleTemplate = useCallback(
    async (templateId: string, actif: boolean) => {
      return updateTemplate(templateId, { actif });
    },
    [updateTemplate]
  );

  /**
   * Supprime un modèle
   */
  const deleteTemplate = useCallback(
    async (templateId: string, storagePath: string) => {
      if (!user) throw new Error('Non authentifié');

      setError(null);

      try {
        // 1. Supprimer le fichier du Storage
        if (storagePath) {
          const fileName = storagePath.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('letter_templates')
              .remove([fileName]);
          }
        }

        // 2. Supprimer de la BD
        const { error: err } = await supabase
          .from('modele_courrier')
          .delete()
          .eq('id', templateId);

        if (err) throw err;

        await fetchTemplates();
        return { success: true };
      } catch (err: any) {
        const message = err.message || 'Erreur lors de la suppression';
        setError(message);
        throw err;
      }
    },
    [user, fetchTemplates]
  );

  /**
   * Télécharge le fichier Word brut
   */
  const downloadTemplate = useCallback(async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      setError('Erreur lors du téléchargement');
      throw err;
    }
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
    downloadTemplate
  };
}