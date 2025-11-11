import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, Mail, Loader, FileText, CheckCircle } from 'lucide-react';

interface MedicalCertificateManagerProps {
  contractId: string;
  employeeName: string;
  employeeEmail: string;
  certificatMedicalId: string | null;
  onSuccess: () => void;
}

type Mode = 'choice' | 'upload' | 'email';

export default function MedicalCertificateManager({
  contractId,
  employeeName,
  employeeEmail,
  certificatMedicalId,
  onSuccess
}: MedicalCertificateManagerProps) {
  const [mode, setMode] = useState<Mode>('choice');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);

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
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contrat')
        .select('profil_id')
        .eq('id', contractId)
        .maybeSingle();

      if (contractError) throw contractError;
      if (!contractData) throw new Error('Contrat introuvable');

      const fileExt = file.name.split('.').pop();
      const fileName = `${contractData.profil_id}/certificat-medical-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

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
        .select('id, proprietaire_type, proprietaire_id, type, fichier_url, created_at')
        .single();

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('contrat')
        .update({ certificat_medical_id: docData.id })
        .eq('id', contractId);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-medical-certificate-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            contractId,
            employeeEmail,
            employeeName
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi de l\'email');
      }

      alert('Email envoyé avec succès ! Le salarié va recevoir un lien pour uploader son certificat médical.');
      onSuccess();
    } catch (err) {
      console.error('Erreur envoi email:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  if (certificatMedicalId) {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-green-900">Certificat médical reçu</h4>
            <p className="text-sm text-green-700 mt-1">Le certificat médical a été uploadé avec succès.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">Certificat médical</h3>
        {mode !== 'choice' && (
          <button
            onClick={() => setMode('choice')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Changer de méthode
          </button>
        )}
      </div>

      {mode === 'choice' && (
        <ChoiceMode onSelectMode={setMode} />
      )}

      {mode === 'upload' && (
        <UploadMode
          file={file}
          uploading={uploading}
          error={error}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          onCancel={() => setMode('choice')}
        />
      )}

      {mode === 'email' && (
        <EmailMode
          employeeName={employeeName}
          employeeEmail={employeeEmail}
          sending={sending}
          error={error}
          onSendEmail={handleSendEmail}
          onCancel={() => setMode('choice')}
        />
      )}
    </div>
  );
}

function ChoiceMode({ onSelectMode }: { onSelectMode: (mode: Mode) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-700 mb-6">
        Comment souhaitez-vous ajouter le certificat médical ?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onSelectMode('upload')}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-1">Upload direct</h3>
            <p className="text-sm text-gray-600">Télécharger le document maintenant</p>
          </div>
        </button>

        <button
          onClick={() => onSelectMode('email')}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-1">Envoyer un email</h3>
            <p className="text-sm text-gray-600">Le salarié uploadera lui-même</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function UploadMode({
  file,
  uploading,
  error,
  onFileSelect,
  onUpload,
  onCancel
}: {
  file: File | null;
  uploading: boolean;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <input
          type="file"
          id="certificate-file"
          accept=".pdf,image/*"
          onChange={onFileSelect}
          className="hidden"
        />
        <label
          htmlFor="certificate-file"
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Choisir un fichier
        </label>
        <p className="text-sm text-gray-500 mt-2">PDF ou image (max 10 Mo)</p>
      </div>

      {file && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">{file.name}</p>
              <p className="text-sm text-blue-700">
                {(file.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onUpload}
          disabled={!file || uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Upload...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Uploader
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function EmailMode({
  employeeName,
  employeeEmail,
  sending,
  error,
  onSendEmail,
  onCancel
}: {
  employeeName: string;
  employeeEmail: string;
  sending: boolean;
  error: string;
  onSendEmail: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-purple-900 mb-2">
          Un email sera envoyé à <strong>{employeeName}</strong> ({employeeEmail}) avec un lien pour uploader son certificat médical.
        </p>
        <p className="text-sm text-purple-700">
          Le salarié recevra des instructions claires pour télécharger son document.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onSendEmail}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Envoyer l'email
            </>
          )}
        </button>
      </div>
    </div>
  );
}
