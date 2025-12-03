import React from 'react';
import { Mail, X, Loader2 } from 'lucide-react';

interface ConfirmSendContractModalProps {
  employeeName: string;
  employeeEmail: string;
  contractType: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSending: boolean;
}

export default function ConfirmSendContractModal({
  employeeName,
  employeeEmail,
  contractType,
  onConfirm,
  onCancel,
  isSending
}: ConfirmSendContractModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Confirmer l'envoi</h2>
          </div>
          {!isSending && (
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Voulez-vous vraiment envoyer le contrat par email à ce salarié ?
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold min-w-[80px]">Salarié :</span>
              <span className="text-gray-800 font-medium">{employeeName}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold min-w-[80px]">Email :</span>
              <span className="text-gray-800">{employeeEmail}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold min-w-[80px]">Contrat :</span>
              <span className="text-gray-800">{contractType}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSending}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isSending}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
