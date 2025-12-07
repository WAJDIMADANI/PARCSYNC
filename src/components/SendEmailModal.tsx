import { useState } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { supabase } from '../lib/supabase';

interface SendEmailModalProps {
  letter: {
    id: string;
    sujet: string;
    fichier_pdf_url: string | null;
  };
  profil: {
    prenom: string;
    nom: string;
    email: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function SendEmailModal({ letter, profil, onClose, onSuccess }: SendEmailModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [additionalMessage, setAdditionalMessage] = useState('');

  const handleSend = async () => {
    if (!profil.email) {
      setError('Le salarié n\'a pas d\'adresse email renseignée');
      return;
    }

    if (!letter.fichier_pdf_url) {
      setError('Le PDF doit être généré avant l\'envoi');
      return;
    }

    setSending(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-letter-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          letterId: letter.id,
          recipientEmail: profil.email,
          recipientName: `${profil.prenom} ${profil.nom}`,
          subject: letter.sujet,
          pdfUrl: letter.fichier_pdf_url,
          additionalMessage: additionalMessage || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'email');
      }

      // Mettre à jour le statut du courrier dans la base de données
      const { error: updateError } = await supabase
        .from('courrier_genere')
        .update({
          status: 'envoye',
          sent_to: profil.email,
          sent_at: new Date().toISOString(),
        })
        .eq('id', letter.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du statut:', updateError);
        throw new Error('Email envoyé mais erreur lors de la mise à jour du statut');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Erreur envoi email:', err);
      setError(err.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Envoyer par email</h2>
            </div>
            <button
              onClick={onClose}
              disabled={sending}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900 mb-2">Informations du destinataire</div>
            <div className="space-y-1">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Nom:</span> {profil.prenom} {profil.nom}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Email:</span> {profil.email || <span className="text-red-600">Non renseigné</span>}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Objet:</span> {letter.sujet}
              </div>
            </div>
          </div>

          {!profil.email && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-900">Email manquant</div>
                <div className="text-sm text-red-700 mt-1">
                  Vous devez renseigner l'adresse email du salarié avant de pouvoir envoyer le courrier.
                </div>
              </div>
            </div>
          )}

          {!letter.fichier_pdf_url && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-900">PDF non généré</div>
                <div className="text-sm text-yellow-700 mt-1">
                  Le PDF doit être généré avant l'envoi du courrier.
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message d'accompagnement (optionnel)
            </label>
            <textarea
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              rows={4}
              placeholder="Ajoutez un message personnel qui sera inclus dans l'email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-700 mb-2">Le courrier sera envoyé avec:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Le PDF du courrier en pièce jointe</li>
                <li>L'objet: "{letter.sujet}"</li>
                {additionalMessage && <li>Votre message d'accompagnement</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !profil.email || !letter.fichier_pdf_url}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <LoadingSpinner size="sm" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Envoyer le courrier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
