import { X, Mail, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ContractViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractUrl: string;
  contractId: string;
  employeeName: string;
  employeeEmail?: string;
}

export function ContractViewModal({
  isOpen,
  onClose,
  contractUrl,
  contractId,
  employeeName,
  employeeEmail
}: ContractViewModalProps) {
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSendEmail = async () => {
    if (!employeeEmail) {
      alert('Email du salarié non disponible');
      return;
    }

    if (!confirm(`Envoyer le contrat par email à ${employeeEmail} ?`)) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contract-email`,
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

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      alert('Email envoyé avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-signed-contract`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ contractId })
        }
      );

      const data = await response.json();

      if (data.success && data.fileUrl) {
        window.open(data.fileUrl, '_blank');
      } else {
        alert('Erreur: ' + (data.error || 'Impossible de télécharger le PDF'));
      }
    } catch (error: any) {
      alert('Erreur lors du téléchargement: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Contrat de {employeeName}
            </h2>
            {employeeEmail && (
              <p className="text-sm text-gray-500 mt-1">{employeeEmail}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            src={contractUrl}
            className="w-full h-full border-0"
            title="Contrat PDF"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Télécharger
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
            {employeeEmail && (
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Envoyer par email
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
