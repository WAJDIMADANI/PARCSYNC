import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook pour gérer l'upload et la suppression de photos de profil
 * Stocke les photos dans le bucket 'profile-photos' de Supabase Storage
 * Met à jour la colonne 'photo_url' dans la table 'profil'
 */
export function useProfilePhoto() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload une photo de profil vers Supabase Storage
   * @param file Le fichier image à uploader
   * @param profilId L'ID du profil
   * @returns L'URL publique de la photo uploadée, ou null en cas d'erreur
   */
  const uploadFile = async (file: File, profilId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Validation du type de fichier
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Format de fichier invalide. Utilisez JPG, PNG ou WebP.');
      }

      // Validation de la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB en bytes
      if (file.size > maxSize) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 5MB.');
      }

      // Construire le chemin du fichier : profile-photos/{profilId}/photo
      const fileExt = file.name.split('.').pop();
      const filePath = `${profilId}/photo.${fileExt}`;

      // Supprimer l'ancienne photo si elle existe
      try {
        await supabase.storage
          .from('profile-photos')
          .remove([filePath]);
      } catch (deleteError) {
        // Ignorer l'erreur si le fichier n'existe pas
        console.log('Pas de photo existante à supprimer');
      }

      // Upload le nouveau fichier
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload : ${uploadError.message}`);
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Ajouter un timestamp pour éviter le cache
      const photoUrl = `${publicUrl}?t=${Date.now()}`;

      // Mettre à jour la colonne photo_url dans la table profil
      const { error: updateError } = await supabase
        .from('profil')
        .update({ photo_url: photoUrl })
        .eq('id', profilId);

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour du profil : ${updateError.message}`);
      }

      setLoading(false);
      return photoUrl;
    } catch (err: any) {
      const errorMessage = err.message || 'Une erreur est survenue lors de l\'upload';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  /**
   * Supprime la photo de profil
   * @param profilId L'ID du profil
   * @param currentPhotoUrl L'URL actuelle de la photo (pour extraire le path)
   * @returns true si la suppression a réussi, false sinon
   */
  const deletePhoto = async (profilId: string, currentPhotoUrl?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Extraire le path depuis l'URL si fournie
      if (currentPhotoUrl) {
        const urlParts = currentPhotoUrl.split('profile-photos/')[1];
        if (urlParts) {
          const filePath = urlParts.split('?')[0]; // Enlever le timestamp

          // Supprimer le fichier du storage
          const { error: deleteError } = await supabase.storage
            .from('profile-photos')
            .remove([filePath]);

          if (deleteError) {
            console.error('Erreur suppression fichier:', deleteError);
            // Continue quand même pour mettre à jour la base
          }
        }
      }

      // Mettre à jour la colonne photo_url à null
      const { error: updateError } = await supabase
        .from('profil')
        .update({ photo_url: null })
        .eq('id', profilId);

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour du profil : ${updateError.message}`);
      }

      setLoading(false);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Une erreur est survenue lors de la suppression';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  };

  return {
    uploadFile,
    deletePhoto,
    loading,
    error,
    setError
  };
}
