import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, CheckCircle, AlertCircle, Loader, FileText } from 'lucide-react';

interface SendMissingDocumentsReminderModalProps {
  profilId: string;
  employeeName: string;
  employeeEmail: string;
  missingDocuments: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  'permis_recto': 'Permis de conduire (Recto)',
  'permis_verso': 'Permis de conduire (Verso)',
  'cni_recto': 'Carte d\'identité (Recto)',
  'cni_verso': 'Carte d\'identité (Verso)',
  'carte_vitale': 'Carte vitale',
  'certificat_medical': 'Certificat médical',
  'rib': 'RIB',
};

export default function SendMissingDocumentsReminderModal({
  profilId,
  employeeName,
  employeeEmail,
  missingDocuments,
  onClose,
  onSuccess
}: SendMissingDocumentsReminderModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadLink, setUploadLink] = useState('');

  const handleSend = async () => {
    setSending(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Créer un token unique pour l'upload
      const token = crypto.randomUUID();

      // Créer le token dans la base de données
      const { data: tokenData, error: tokenError } = await supabase
        .from('upload_tokens')
        .insert({
          profil_id: profilId,
          token: token,
        })
        .select()
        .maybeSingle();

      if (tokenError) {
        throw new Error(`Erreur création token: ${tokenError.message}`);
      }

      // Générer le lien d'upload
      const appUrl = window.location.origin;
      const uploadLink = `${appUrl}/upload-all-documents?profil=${profilId}&token=${token}`;

      // Appeler la fonction send-missing-documents-email
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-missing-documents-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            profilId: profilId,
            employeeEmail,
            employeeName,
            missingDocuments
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      setUploadLink(uploadLink);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Erreur envoi email:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              Email envoyé avec succès !
            </h3>
          </div>

          <div className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-2">
              L'email de rappel a été envoyé à <strong>{employeeEmail}</strong>
            </p>
            {uploadLink && (
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Lien de téléchargement :</p>
                <p className="text-xs text-gray-500 break-all font-mono">{uploadLink}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Envoyer un rappel</h3>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-white hover:bg-white/10 rounded-lg p-2 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Vous êtes sur le point d'envoyer un email de rappel à :
            </p>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p className="font-bold text-gray-800">{employeeName}</p>
              <p className="text-gray-600">{employeeEmail}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Documents manquants ({missingDocuments.length})
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {missingDocuments.map((doc, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700">{DOCUMENT_LABELS[doc] || doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
            <p className="text-sm text-blue-800">
              📱 <strong>L'email contiendra :</strong> Un lien sécurisé permettant au salarié de télécharger tous les documents manquants. Sur mobile, il pourra utiliser sa caméra pour prendre les documents en photo directement.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-bold shadow-lg"
            >
              {sending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer le rappel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
