import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Upload, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Contract {
  id: string;
  profil_id: string;
  modele_id: string;
  variables: Record<string, any>;
  date_envoi: string;
  date_signature: string | null;
  statut: string;
  certificat_medical_id: string | null;
  yousign_signature_request_id: string | null;
  modele: {
    nom: string;
    type_contrat: string;
  };
  profil: {
    prenom: string;
    nom: string;
    email: string;
  };
}

export default function ContractSignature() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [certificatUploaded, setCertificatUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const contractId = urlParams.get('contrat') || urlParams.get('id');

    if (!contractId) {
      setError('Lien invalide');
      setLoading(false);
      return;
    }

    fetchContract(contractId);
  }, []);

  const fetchContract = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('contrat')
        .select(`
          *,
          modele:modele_id(nom, type_contrat),
          profil:profil_id(prenom, nom, email)
        `)
        .eq('id', contractId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Contrat introuvable');
        return;
      }

      setContract(data);
      setSigned(data.statut === 'signe' || !!data.date_signature);
      setCertificatUploaded(!!data.certificat_medical_id);
    } catch (err) {
      console.error('Erreur chargement contrat:', err);
      setError('Erreur lors du chargement du contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleCertificatUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contract) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contract.profil_id}-certificat-${Date.now()}.${fileExt}`;
      const filePath = `certificats/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: docData, error: docError } = await supabase
        .from('document')
        .insert([{
          owner_type_document: 'profil',
          owner_id: contract.profil_id,
          type_document: 'certificat_medical',
          file_url: filePath,
          date_emission: null,
          date_expiration: null
        }])
        .select('id, owner_type, owner_id, type, file_url, created_at')
        .single();

      if (docError) throw docError;

      const { error: updateError } = await supabase
        .from('contrat')
        .update({ certificat_medical_id: docData.id })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      setCertificatUploaded(true);
    } catch (err) {
      console.error('Erreur upload certificat:', err);
      alert('Erreur lors de l\'upload du certificat médical');
    } finally {
      setUploading(false);
    }
  };

  const handleSign = async () => {
    if (!contract) return;

    // Vérifier qu'une demande Yousign n'existe pas déjà
    if (contract.yousign_signature_request_id) {
      alert('Une demande de signature a déjà été créée pour ce contrat. Veuillez vérifier vos emails.');
      return;
    }

    setSigning(true);
    try {
      // Créer la demande de signature Yousign
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-yousign-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            contractId: contract.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la création de la demande de signature');
      }

      const data = await response.json();

      if (data.success) {
        // Afficher un message de succès
        alert('Demande de signature créée avec succès ! Vous allez recevoir un email de Yousign avec le lien de signature.');

        // Recharger le contrat pour voir le nouveau statut
        fetchContract(contract.id);
      } else {
        throw new Error('Impossible de créer la demande de signature');
      }
    } catch (err: any) {
      console.error('Erreur signature Yousign:', err);
      alert(`Erreur : ${err.message || 'Impossible de créer la demande de signature'}`);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <LoadingSpinner size="xl" text="Chargement du contrat..." />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600">{error || 'Une erreur est survenue'}</p>
        </div>
      </div>
    );
  }

  if (signed || contract.statut === 'signe') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Contrat signé avec succès !</h1>
            <p className="text-gray-600 text-lg">
              Votre contrat a été signé et enregistré.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="font-semibold text-green-900 mb-3">Prochaines étapes</h2>
            <div className="text-left space-y-2 text-green-800">
              <p>✓ Contrat signé électroniquement</p>
              {certificatUploaded && <p>✓ Certificat médical uploadé</p>}
              <p className="pt-2 font-medium">
                Le service RH va maintenant valider votre dossier et uploader la DPAE. Vous serez contacté très prochainement pour finaliser votre intégration.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">Signature de contrat</h1>
            <p className="text-blue-100">
              {contract.modele.nom} - {contract.modele.type_contrat}
            </p>
          </div>

          <div className="p-8 space-y-8">
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="font-semibold text-blue-900 text-lg mb-3">Informations du contrat</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {contract.variables?.poste && (
                      <div>
                        <span className="text-blue-700 font-medium">Poste :</span>
                        <p className="text-blue-900">{contract.variables.poste}</p>
                      </div>
                    )}
                    {contract.variables?.salaire && (
                      <div>
                        <span className="text-blue-700 font-medium">Salaire :</span>
                        <p className="text-blue-900">{contract.variables.salaire}</p>
                      </div>
                    )}
                    {contract.variables?.heures_semaine && (
                      <div>
                        <span className="text-blue-700 font-medium">Heures/semaine :</span>
                        <p className="text-blue-900">{contract.variables.heures_semaine}h</p>
                      </div>
                    )}
                    {contract.variables?.date_debut && (
                      <div>
                        <span className="text-blue-700 font-medium">Date de début :</span>
                        <p className="text-blue-900">
                          {new Date(contract.variables.date_debut).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Étapes de signature</h2>

              <div className={`border-2 rounded-xl p-6 transition-all ${
                certificatUploaded
                  ? 'border-green-500 bg-green-50'
                  : 'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    certificatUploaded ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {certificatUploaded ? <CheckCircle className="w-6 h-6" /> : '1'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Télécharger du certificat médical
                    </h3>
                    <p className="text-gray-700 text-sm mb-4">
                      Veuillez uploader votre certificat médical d'aptitude au travail. Ce document est obligatoire pour finaliser votre contrat.
                    </p>
                    {certificatUploaded ? (
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        Certificat médical uploadé
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium shadow-lg">
                        <Upload className="w-5 h-5" />
                        {uploading ? 'Upload en cours...' : 'Choisir le fichier'}
                        <input
                          type="file"
                          onChange={handleCertificatUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-2 border-blue-500 bg-blue-50 rounded-xl p-6 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-blue-500">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Signature électronique via Yousign
                    </h3>
                    <p className="text-gray-700 text-sm mb-4">
                      En cliquant sur "Lancer la signature", vous recevrez un email de Yousign avec un lien sécurisé pour signer électroniquement votre contrat.
                    </p>

                    {contract.yousign_signature_request_id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 font-medium bg-blue-100 px-4 py-3 rounded-lg">
                          <AlertCircle className="w-5 h-5" />
                          Demande de signature créée - Vérifiez vos emails
                        </div>
                        <p className="text-sm text-gray-600">
                          Un email de Yousign a été envoyé à votre adresse. Cliquez sur le lien dans l'email pour signer votre contrat de manière sécurisée.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleSign}
                        disabled={signing}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                      >
                        {signing ? (
                          <LoadingSpinner size="sm" variant="white" text="Création en cours..." />
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Lancer la signature
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note importante :</strong> Après la signature, le service RH devra uploader votre DPAE
                (Déclaration Préalable À l'Embauche) pour finaliser votre activation en tant que salarié.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
