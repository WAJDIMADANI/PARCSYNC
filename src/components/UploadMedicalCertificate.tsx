import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, FileText, CheckCircle, Loader, AlertCircle } from 'lucide-react';

export default function UploadMedicalCertificate() {
  const params = new URLSearchParams(window.location.search);
  const contractId = params.get('contract');

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contractData, setContractData] = useState<any>(null);

  useEffect(() => {
    if (!contractId) {
      setError('Lien invalide');
      setLoading(false);
      return;
    }
    loadContractData();
  }, [contractId]);

  const loadContractData = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('contrat')
        .select(`
          id,
          profil_id,
          certificat_medical_id,
          candidat:profil_id (
            nom,
            prenom,
            email
          )
        `)
        .eq('id', contractId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Contrat introuvable');

      if (data.certificat_medical_id) {
        setSuccess(true);
      }

      setContractData(data);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && !selectedFile.type.startsWith('image/')) {
        setError('Seuls les fichiers PDF et images sont acceptés');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file || !contractData) return;

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contractData.profil_id}/certificat-medical-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: docData, error: insertError } = await supabase
        .from('document')
        .insert([{
          proprietaire_type: 'profil',
          proprietaire_id: contractData.profil_id,
          type: 'certificat_medical',
          fichier_url: fileName,
          date_emission: null,
          date_expiration: null
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('contrat')
        .update({ certificat_medical_id: docData.id })
        .eq('id', contractId);

      if (updateError) throw updateError;

      setSuccess(true);
      setFile(null);
    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Certificat médical reçu !
            </h1>
            <p className="text-gray-600 mb-6">
              Merci ! Votre certificat médical a été téléchargé avec succès. Votre dossier est maintenant complet.
            </p>
            <p className="text-sm text-gray-500">
              Vous pouvez fermer cette page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Certificat médical requis
          </h1>
          <p className="text-gray-600">
            {contractData?.candidat ? `Bonjour ${contractData.candidat.prenom} ${contractData.candidat.nom}` : 'Bonjour'}
          </p>
        </div>

        {error && !file && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="font-semibold text-yellow-900 mb-2">📌 Document requis :</p>
          <p className="text-yellow-800 text-sm">
            Certificat médical de moins de 3 mois attestant que vous êtes apte à exercer votre fonction.
          </p>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-400 transition-colors">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <input
              type="file"
              id="certificate-file"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="certificate-file"
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Choisir un fichier
            </label>
            <p className="text-sm text-gray-500 mt-3">
              PDF ou image (JPG, PNG) - Maximum 10 Mo
            </p>
          </div>

          {file && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-purple-900 truncate">{file.name}</p>
                  <p className="text-sm text-purple-700">
                    {(file.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && file && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {uploading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Téléchargement en cours...
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                Télécharger le certificat
              </>
            )}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            Si vous rencontrez des difficultés, contactez le service RH
          </p>
        </div>
      </div>
    </div>
  );
}
