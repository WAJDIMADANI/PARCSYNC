import { useState, useRef, useEffect } from 'react';
import { FileUp, Loader2, X, Trash2 } from 'lucide-react';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface ProfileAvatarProps {
  profilId: string;
  prenom: string;
  nom: string;
  photoUrl?: string | null;
  onUploadSuccess?: (newPhotoUrl: string) => void;
  editable?: boolean;
}

/**
 * Composant Avatar de profil avec upload drag-and-drop
 * - Affiche la photo ou les initiales
 * - Support drag-and-drop et clic pour upload
 * - Animations fluides
 * - Gestion des erreurs
 */
export function ProfileAvatar({
  profilId,
  prenom,
  nom,
  photoUrl,
  onUploadSuccess,
  editable = true
}: ProfileAvatarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(photoUrl || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, deletePhoto, loading, error, setError } = useProfilePhoto();

  // Mettre à jour l'URL de la photo quand la prop change
  useEffect(() => {
    setCurrentPhotoUrl(photoUrl || null);
  }, [photoUrl]);

  // Afficher les messages d'erreur via toast
  useEffect(() => {
    if (error) {
      setShowToast({ type: 'error', message: error });
      // Nettoyer l'erreur après 5 secondes
      const timer = setTimeout(() => {
        setError(null);
        setShowToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  // Générer les initiales
  const getInitials = () => {
    const firstInitial = prenom?.charAt(0)?.toUpperCase() || '';
    const lastInitial = nom?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || '?';
  };

  // Gérer le drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (editable && !loading) {
      setIsDragging(true);
    }
  };

  // Gérer le drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Gérer le drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!editable || loading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  // Gérer le clic pour ouvrir le sélecteur de fichiers
  const handleClick = () => {
    if (editable && !loading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Gérer la sélection de fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
    // Reset input pour permettre de sélectionner le même fichier
    e.target.value = '';
  };

  // Upload le fichier
  const handleFileUpload = async (file: File) => {
    const result = await uploadFile(file, profilId);
    if (result) {
      setCurrentPhotoUrl(result);
      setShowToast({ type: 'success', message: 'Photo de profil mise à jour avec succès' });
      setTimeout(() => setShowToast(null), 3000);
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    }
  };

  // Gérer la suppression de la photo
  const handleDelete = async () => {
    const success = await deletePhoto(profilId, currentPhotoUrl || undefined);
    if (success) {
      setCurrentPhotoUrl(null);
      setShowToast({ type: 'success', message: 'Photo de profil supprimée' });
      setTimeout(() => setShowToast(null), 3000);
      if (onUploadSuccess) {
        onUploadSuccess('');
      }
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Container */}
      <div
        className="relative group"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Avatar Circle */}
        <div
          className={`
            relative overflow-hidden rounded-full transition-all duration-300
            w-64 h-64 md:w-80 md:h-80
            ${editable && !loading ? 'cursor-pointer' : 'cursor-default'}
            ${isDragging ? 'ring-4 ring-blue-500 ring-offset-4 scale-105' : 'ring-2 ring-gray-200'}
            shadow-xl
          `}
        >
          {/* Photo ou Initiales */}
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt={`${prenom} ${nom}`}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: loading ? 0.5 : 1 }}
              onError={(e) => {
                console.error('Erreur chargement photo:', currentPhotoUrl);
                // Si l'image ne charge pas, afficher les initiales
                setCurrentPhotoUrl(null);
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-8xl md:text-9xl">{getInitials()}</span>
            </div>
          )}

          {/* Overlay au survol (uniquement si editable) */}
          {editable && !loading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
              <FileUp className="w-16 h-16 md:w-20 md:h-20 text-white" />
              <span className="text-white text-base md:text-lg font-medium px-4">
                {currentPhotoUrl ? 'Changer la photo' : 'Ajouter une photo'}
              </span>
              <span className="text-white/80 text-sm md:text-base">
                JPG, PNG ou WebP (max 5MB)
              </span>
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-16 h-16 md:w-20 md:h-20 text-white animate-spin" />
            </div>
          )}

          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/80 flex items-center justify-center border-4 border-dashed border-white">
              <div className="text-center">
                <FileUp className="w-16 h-16 md:w-20 md:h-20 text-white mx-auto mb-3" />
                <span className="text-white text-xl md:text-2xl font-bold">Déposer ici</span>
              </div>
            </div>
          )}
        </div>

        {/* Bouton Supprimer (visible au survol si photo existe) */}
        {editable && currentPhotoUrl && !loading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="absolute top-2 right-2 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center transform hover:scale-110"
            title="Supprimer la photo"
          >
            <Trash2 className="w-7 h-7" />
          </button>
        )}

        {/* Input File (caché) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Nom et prénom sous l'avatar */}
      <div className="text-center">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
          {prenom} {nom}
        </h3>
      </div>

      {/* Toast de notification */}
      {showToast && (
        <div
          className={`
            fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl
            flex items-center gap-3 animate-slide-in-right
            ${showToast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
          `}
        >
          {showToast.type === 'error' && <X className="w-5 h-5" />}
          <span className="font-medium">{showToast.message}</span>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Supprimer la photo de profil
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.
                </p>
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
