import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, FileText, Calendar, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { DOCUMENT_TYPES, DocumentTypeConfig } from '../constants/documentTypes';

interface ImportantDocumentUploadProps {
  profilId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export default function ImportantDocumentUpload({ profilId, onClose, onSuccess }: ImportantDocumentUploadProps) {
  const [documentType, setDocumentType] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const selectedDocType: DocumentTypeConfig | undefined = DOCUMENT_TYPES.find(dt => dt.value === documentType);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Type de fichier non autorisé. Utilisez PDF, JPG ou PNG uniquement.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Le fichier est trop volumineux. Taille maximum: 10 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      setError('Veuillez sélectionner un type de document et un fichier.');
      return;
    }

    if (selectedDocType?.requiresExpiration && !expirationDate) {
      setError('La date d\'expiration est requise pour ce type de document.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${profilId}_${documentType}_${timestamp}.${fileExt}`;
      const filePath = `documents-importants/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert document record
      const { error: insertError } = await supabase
        .from('document')
        .insert({
          owner_id: profilId,
          owner_type: 'profil',
          type_document: documentType,
          file_name: documentName || selectedFile.name,
          file_url: publicUrl,
          storage_path: filePath,
          bucket: 'documents',
          date_expiration: expirationDate || null,
          statut: 'valide'
        });

      if (insertError) throw insertError;

      // Update profil table with expiration dates if applicable
      if (selectedDocType?.expirationField && expirationDate) {
        const { error: updateError } = await supabase
          .from('profil')
          .update({ [selectedDocType.expirationField]: expirationDate })
          .eq('id', profilId);

        if (updateError) throw updateError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur upload document:', err);
      setError(err.message || 'Erreur lors de l\'upload du document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Ajouter un document important</h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type de document *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={uploading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">Sélectionnez un type</option>
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Name (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom du document (optionnel)
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              disabled={uploading}
              placeholder="Ex: Certificat médical 2024"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Expiration Date */}
          {selectedDocType?.requiresExpiration && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date d'expiration *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  disabled={uploading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Cette date sera automatiquement enregistrée dans le profil du salarié.
              </p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fichier *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Cliquez pour sélectionner un fichier
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG ou PNG (max 10 MB)
                </p>
              </label>
            </div>
            {selectedFile && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-700 font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl flex items-center justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !documentType}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <LoadingSpinner size="sm" variant="white" text="Upload en cours..." />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Uploader le document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
