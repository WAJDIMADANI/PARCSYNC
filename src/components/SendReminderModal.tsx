import { X, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface SendReminderModalProps {
  employeeName: string;
  employeeEmail: string;
  documentType: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function SendReminderModal({
  employeeName,
  employeeEmail,
  documentType,
  onConfirm,
  onCancel,
}: SendReminderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setStatus('sending');
    try {
      await onConfirm();
      setStatus('success');
      setTimeout(() => {
        onCancel();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'envoi');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Envoyer un rappel</h2>
              <p className="text-blue-100 text-sm mt-1">Confirmation requise</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {status === 'idle' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-gray-700 text-sm">
                  Vous êtes sur le point d'envoyer un rappel par email concernant un document expiré.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Destinataire</p>
                      <p className="font-semibold text-gray-900">{employeeName}</p>
                      <p className="text-sm text-gray-600">{employeeEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Document concerné</p>
                      <p className="font-semibold text-gray-900">{documentType}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  Le salarié recevra un email de rappel avec les détails du document expiré et les actions à entreprendre.
                </p>
              </div>
            </>
          )}

          {status === 'sending' && (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-lg font-semibold text-gray-900">Envoi en cours...</p>
              <p className="text-sm text-gray-600 mt-2">Veuillez patienter</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">Rappel envoyé avec succès !</p>
              <p className="text-sm text-gray-600 mt-2">L'email a été envoyé à {employeeName}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">Erreur lors de l'envoi</p>
              <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
            </div>
          )}
        </div>

        {status === 'idle' && (
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
            >
              Envoyer le rappel
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
