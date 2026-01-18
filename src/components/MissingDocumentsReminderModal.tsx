import { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle, Loader, FileText } from 'lucide-react';

interface MissingDocumentsReminderModalProps {
  profilId: string;
  employeeName: string;
  employeeEmail: string;
  missingDocuments: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  'cni_recto': 'Carte d\'identité (Recto)',
  'cni_verso': 'Carte d\'identité (Verso)',
  'carte_vitale': 'Carte vitale',
  'casier_judiciaire': 'B3 casier judiciaire',
  'permis_recto': 'Permis de conduire (Recto)',
  'permis_verso': 'Permis de conduire (Verso)',
  'attestation_points': 'Point permis',
  'rib': 'RIB',
  'dpae': 'DPAE',
  'certificat_medical': 'Certificat médical',
  'titre_sejour': 'Titre de séjour'
};

export default function MissingDocumentsReminderModal({
  profilId,
  employeeName,
  employeeEmail,
  missingDocuments,
  onClose,
  onSuccess
}: MissingDocumentsReminderModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadLink, setUploadLink] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(missingDocuments)
  );

  const toggleDocumentSelection = (docType: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docType)) {
        newSet.delete(docType);
      } else {
        newSet.add(docType);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === missingDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(missingDocuments));
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const selectedDocsArray = Array.from(selectedDocuments);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-missing-documents-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            profilId,
            employeeEmail,
            employeeName,
            missingDocuments: selectedDocsArray
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setUploadLink(result.uploadLink);
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
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Sélectionner les documents à rappeler
              </h4>
              <button
                onClick={toggleSelectAll}
                type="button"
                className="text-sm text-orange-700 hover:text-orange-800 font-semibold transition-colors"
              >
                {selectedDocuments.size === missingDocuments.length
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
              {missingDocuments.map((doc) => (
                <label
                  key={doc}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200 hover:border-orange-300 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(doc)}
                    onChange={() => toggleDocumentSelection(doc)}
                    className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                  />
                  <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <span className="flex-1 text-gray-900 font-medium">
                    {DOCUMENT_LABELS[doc] || doc}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-3 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
              <p className="text-sm text-blue-800">
                <strong className="font-bold">{selectedDocuments.size}</strong> document{selectedDocuments.size > 1 ? 's' : ''}
                {selectedDocuments.size > 1 ? ' seront inclus' : ' sera inclus'} dans l'email de rappel
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
            <p className="text-sm text-blue-800">
              📱 <strong>L'email contiendra :</strong> Un lien sécurisé permettant au salarié de télécharger tous les documents sélectionnés. Sur mobile, il pourra utiliser sa caméra pour prendre les documents en photo directement.
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
              disabled={sending || selectedDocuments.size === 0}
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
                  {selectedDocuments.size > 0 && ` (${selectedDocuments.size})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
