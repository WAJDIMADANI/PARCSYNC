import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, CheckCircle, AlertCircle, Loader, Calendar } from 'lucide-react';

interface SendAbsenceJustificatifModalProps {
  absenceId: string;
  profilId: string;
  employeeName: string;
  dateDebut: string;
  dateFin: string | null;
  note: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendAbsenceJustificatifModal({
  absenceId,
  profilId,
  employeeName,
  dateDebut,
  dateFin,
  note,
  onClose,
  onSuccess,
}: SendAbsenceJustificatifModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(true);

  // Charger l'email du salarié depuis la table profil
  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profil')
          .select('email')
          .eq('id', profilId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (data?.email) {
          setEmployeeEmail(data.email);
        } else {
          setError('Aucun email trouvé pour ce salarié. Impossible d\'envoyer le rappel.');
        }
      } catch (err) {
        console.error('Erreur chargement email:', err);
        setError('Erreur lors de la récupération de l\'email du salarié.');
      } finally {
        setLoadingEmail(false);
      }
    };

    fetchEmail();
  }, [profilId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const handleSend = async () => {
    if (!employeeEmail) {
      setError('Email du salarié non disponible');
      return;
    }

    setSending(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-absence-justificatif-reminder`,
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
            absenceId,
            dateDebut,
            dateFin: dateFin || dateDebut,
            note,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

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
            <p className="text-gray-700">
              L'email de demande de justificatif a été envoyé à <strong>{employeeEmail}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">📩 Demander un justificatif</h3>
          <button onClick={onClose} disabled={sending} className="text-white hover:bg-white/10 rounded-lg p-2 disabled:opacity-50">
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

          {loadingEmail ? (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2" />
              <p className="text-gray-600">Chargement des informations...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Vous êtes sur le point d'envoyer un email de demande de justificatif à :
                </p>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="font-bold text-gray-800">{employeeName}</p>
                  <p className="text-gray-600">{employeeEmail || 'Email non renseigné'}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Absence concernée
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Du</strong> {formatDate(dateDebut)} <strong>au</strong> {dateFin ? formatDate(dateFin) : formatDate(dateDebut)}
                  </p>
                  {note && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Motif :</strong> {note}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                <p className="text-sm text-blue-800">
                  📱 <strong>L'email contiendra :</strong> Un lien sécurisé permettant au salarié d'envoyer son justificatif. Sur mobile, il pourra utiliser sa caméra pour prendre le document en photo directement.
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
                  disabled={sending || !employeeEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-bold shadow-lg"
                >
                  {sending ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Send className="w-5 h-5" /> Envoyer le rappel</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}