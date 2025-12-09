import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, CheckCircle, XCircle, AlertTriangle, Calendar, User, FileText, Loader2, FilePlus } from 'lucide-react';
import ContractSendModal from './ContractSendModal';

interface NotificationModalProps {
  notification: {
    id: string;
    type: 'titre_sejour' | 'visite_medicale' | 'permis_conduire' | 'contrat_cdd' | 'avenant_1' | 'avenant_2';
    profil_id: string;
    date_echeance: string;
    statut: string;
    email_envoye_at: string | null;
    metadata: any;
    profil?: {
      prenom: string;
      nom: string;
      email: string;
    };
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function NotificationModal({ notification, onClose, onUpdate }: NotificationModalProps) {
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [profilData, setProfilData] = useState<any>(null);

  useEffect(() => {
    if (['contrat_cdd', 'avenant_1', 'avenant_2'].includes(notification.type)) {
      fetchProfilData();
    }
  }, [notification.profil_id, notification.type]);

  const fetchProfilData = async () => {
    try {
      const { data: profil, error: profilError } = await supabase
        .from('profil')
        .select('*')
        .eq('id', notification.profil_id)
        .single();

      if (profilError) throw profilError;
      setProfilData(profil);
    } catch (error) {
      console.error('Error fetching profil data:', error);
    }
  };

  const calculateNextStartDate = () => {
    if (!notification.date_echeance) {
      console.log('notification.date_echeance is not defined');
      return '';
    }

    const endDate = new Date(notification.date_echeance);
    endDate.setDate(endDate.getDate() + 1);
    const nextStartDate = endDate.toISOString().split('T')[0];

    console.log('Calculated next start date:', nextStartDate, 'from date_echeance:', notification.date_echeance);
    return nextStartDate;
  };

  const isContractNotification = ['contrat_cdd', 'avenant_1', 'avenant_2'].includes(notification.type);

  const getDocumentLabel = () => {
    switch (notification.type) {
      case 'titre_sejour': return 'Titre de séjour';
      case 'visite_medicale': return 'Visite médicale';
      case 'permis_conduire': return 'Permis de conduire';
      case 'contrat_cdd': return 'Contrat CDD';
      case 'avenant_1': return 'Avenant 1';
      case 'avenant_2': return 'Avenant 2';
      default: return notification.type;
    }
  };

  const getEmailSubject = () => {
    const docLabel = getDocumentLabel();
    const dateStr = new Date(notification.date_echeance).toLocaleDateString('fr-FR');
    return `Rappel urgent: Renouvellement de votre ${docLabel} - Expire le ${dateStr}`;
  };

  const getEmailBody = () => {
    const docLabel = getDocumentLabel();
    const dateStr = new Date(notification.date_echeance).toLocaleDateString('fr-FR');
    const prenom = notification.profil?.prenom || '';

    return `Bonjour ${prenom},

Nous vous informons que votre ${docLabel} arrive à échéance le ${dateStr}.

Pour assurer la continuité de votre dossier administratif, nous vous remercions de nous transmettre le document renouvelé dans les meilleurs délais.

${notification.type === 'titre_sejour' ? 'Merci de nous faire parvenir une copie de votre nouveau titre de séjour dès que possible.' : ''}
${notification.type === 'visite_medicale' ? 'Merci de prendre rendez-vous pour votre visite médicale et de nous transmettre le certificat médical d\'aptitude.' : ''}
${notification.type === 'permis_conduire' ? 'Merci de nous transmettre une copie de votre permis de conduire renouvelé.' : ''}
${notification.type === 'contrat_cdd' ? 'Votre contrat à durée déterminée arrive à son terme. Nous prendrons contact avec vous prochainement concernant la suite.' : ''}
${notification.type === 'avenant_1' ? 'Votre Avenant 1 arrive à son terme. Nous prendrons contact avec vous prochainement pour discuter de la suite.' : ''}
${notification.type === 'avenant_2' ? 'Votre Avenant 2 arrive à son terme. Nous prendrons contact avec vous prochainement pour discuter de la suite.' : ''}

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
Le service RH`;
  };

  const handleSendReminder = async () => {
    if (!notification.profil?.email) {
      alert('Aucune adresse email trouvée pour ce salarié');
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: functionError } = await supabase.functions.invoke('send-expiration-reminder', {
        body: {
          notification_id: notification.id,
          profil_id: notification.profil_id,
          email: notification.profil.email,
          prenom: notification.profil.prenom,
          nom: notification.profil.nom,
          type: notification.type,
          date_echeance: notification.date_echeance,
          subject: getEmailSubject(),
          body: getEmailBody()
        }
      });

      if (functionError) throw functionError;

      const { error: updateError } = await supabase
        .from('notification')
        .update({
          statut: 'email_envoye',
          email_envoye_at: new Date().toISOString(),
          email_envoye_par: user?.id
        })
        .eq('id', notification.id);

      if (updateError) throw updateError;

      alert('Email de rappel envoyé avec succès');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      alert(`Erreur lors de l'envoi: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'resolue' | 'ignoree') => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('notification')
        .update({ statut: newStatus })
        .eq('id', notification.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const daysRemaining = Math.ceil(
    (new Date(notification.date_echeance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Détails de la notification</h2>
              <p className="text-blue-100 text-sm">{getDocumentLabel()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-lg text-gray-900">Informations du salarié</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                <p className="font-semibold text-gray-900">
                  {notification.profil?.prenom} {notification.profil?.nom}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="font-semibold text-gray-900">{notification.profil?.email}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-5 border-2 ${
            daysRemaining <= 0 ? 'bg-red-100 border-red-300' :
            daysRemaining <= 7 ? 'bg-red-50 border-red-200' :
            daysRemaining <= 15 ? 'bg-orange-50 border-orange-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-6 h-6 text-gray-700" />
              <h3 className="font-bold text-lg text-gray-900">Échéance du document</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Date d'expiration</p>
                <p className="font-bold text-xl text-gray-900">
                  {new Date(notification.date_echeance).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Temps restant</p>
                <p className={`font-bold text-xl ${
                  daysRemaining <= 0 ? 'text-red-700' :
                  daysRemaining <= 7 ? 'text-red-600' :
                  daysRemaining <= 15 ? 'text-orange-600' :
                  'text-yellow-700'
                }`}>
                  {daysRemaining <= 0 ? 'EXPIRÉ' : `${daysRemaining} jours`}
                </p>
              </div>
            </div>
          </div>

          {notification.email_envoye_at && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Email de rappel envoyé</p>
                <p className="text-sm text-green-700">
                  Le {new Date(notification.email_envoye_at).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(notification.email_envoye_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <button
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              className="text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              {showEmailPreview ? 'Masquer' : 'Prévisualiser'} le contenu de l'email
            </button>

            {showEmailPreview && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Objet:</p>
                  <p className="text-gray-900 font-semibold">{getEmailSubject()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Message:</p>
                  <pre className="text-gray-900 whitespace-pre-wrap font-sans text-sm">
                    {getEmailBody()}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {isContractNotification && (
            <div className="border-t pt-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 bg-green-100 rounded-xl">
                    <FilePlus className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Créer un nouveau contrat</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Le contrat arrive à échéance le <strong>{new Date(notification.date_echeance).toLocaleDateString('fr-FR')}</strong>.
                      Créez un nouveau contrat pour ce salarié avec le même workflow complet (génération PDF, envoi email, signature YouSign).
                    </p>
                    <p className="text-sm text-green-700 mb-4">
                      La date de début sera automatiquement fixée au <strong>{new Date(calculateNextStartDate()).toLocaleDateString('fr-FR')}</strong> (lendemain de la fin du contrat actuel).
                    </p>
                    <button
                      onClick={() => setShowContractModal(true)}
                      disabled={!profilData}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <FilePlus className="w-5 h-5" />
                      Créer un contrat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            {notification.statut !== 'email_envoye' && notification.statut !== 'resolue' && (
              <button
                onClick={handleSendReminder}
                disabled={sending || !notification.profil?.email}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Envoyer le rappel
                  </>
                )}
              </button>
            )}

            {notification.statut !== 'resolue' && (
              <button
                onClick={() => handleUpdateStatus('resolue')}
                disabled={updating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <CheckCircle className="w-5 h-5" />
                Marquer comme résolu
              </button>
            )}

            {notification.statut !== 'ignoree' && notification.statut !== 'resolue' && (
              <button
                onClick={() => handleUpdateStatus('ignoree')}
                disabled={updating}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <XCircle className="w-5 h-5" />
                Ignorer
              </button>
            )}
          </div>

          {daysRemaining <= 7 && daysRemaining > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Action urgente requise</p>
                  <p className="text-sm text-red-700">
                    Ce document expire dans moins de 7 jours. Veuillez contacter le salarié immédiatement.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showContractModal && profilData && (
        <ContractSendModal
          profilId={notification.profil_id}
          employeeName={`${notification.profil?.prenom || ''} ${notification.profil?.nom || ''}`}
          employeeEmail={notification.profil?.email || ''}
          onClose={() => setShowContractModal(false)}
          onSuccess={() => {
            setShowContractModal(false);
            onUpdate();
          }}
          initialDateDebut={calculateNextStartDate()}
        />
      )}
    </div>
  );
}
