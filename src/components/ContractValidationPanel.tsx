import { useState, useEffect } from 'react';
import { supabase, getStorageUrl } from '../lib/supabase';
import { Upload, CheckCircle, XCircle, FileText, AlertCircle, Check, X } from 'lucide-react';
import MedicalCertificateManager from './MedicalCertificateManager';
import { resolveDocUrl } from '../lib/documentStorage';

interface Contract {
  id: string;
  variables: Record<string, any>;
  date_envoi: string;
  date_signature: string | null;
  statut: string;
  certificat_medical_id: string | null;
  dpae_id: string | null;
  modele: {
    nom: string;
    type_contrat: string;
  };
  profil: {
    email: string;
  };
}

interface ContractValidationPanelProps {
  profilId: string;
  employeeName: string;
  onClose: () => void;
  onActivate: () => void;
}

export default function ContractValidationPanel({
  profilId,
  employeeName,
  onClose,
  onActivate
}: ContractValidationPanelProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [certificatUrl, setCertificatUrl] = useState<string | null>(null);
  const [dpaeUrl, setDpaeUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchContractData();
  }, [profilId]);

  const fetchContractData = async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contrat')
        .select(`
          *,
          modele:modele_id(nom, type_contrat),
          profil:profil_id(email)
        `)
        .eq('profil_id', profilId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contractError) throw contractError;

      setContract(contractData);

      if (contractData?.certificat_medical_id) {
        const { data: certDoc } = await supabase
          .from('document')
          .select('fichier_url, storage_path, bucket')
          .eq('id', contractData.certificat_medical_id)
          .maybeSingle();

        if (certDoc) {
          try {
            const url = await resolveDocUrl(certDoc);
            setCertificatUrl(url);
          } catch (error) {
            console.error('Erreur résolution URL certificat:', error);
            setCertificatUrl(getStorageUrl(certDoc.fichier_url || certDoc.storage_path || ''));
          }
        }
      }

      if (contractData?.dpae_id) {
        const { data: dpaeDoc } = await supabase
          .from('document')
          .select('fichier_url, storage_path, bucket')
          .eq('id', contractData.dpae_id)
          .maybeSingle();

        if (dpaeDoc) {
          try {
            const url = await resolveDocUrl(dpaeDoc);
            setDpaeUrl(url);
          } catch (error) {
            console.error('Erreur résolution URL DPAE:', error);
            setDpaeUrl(getStorageUrl(dpaeDoc.fichier_url || dpaeDoc.storage_path || ''));
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement contrat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDpaeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profilId}-dpae-${Date.now()}.${fileExt}`;
      const filePath = `dpae/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { data: docData, error: docError } = await supabase
        .from('document')
        .insert({
          proprietaire_id: profilId,
          proprietaire_type: 'profil',
          type: 'dpae',
          fichier_url: urlData.publicUrl
        })
        .select()
        .single();

      if (docError) throw docError;

      const { error: updateError } = await supabase
        .from('contrat')
        .update({ dpae_id: docData.id })
        .eq('id', contract!.id);

      if (updateError) throw updateError;

      setDpaeUrl(urlData.publicUrl);
      await fetchContractData();
    } catch (error) {
      console.error('Erreur upload DPAE:', error);
      alert('Erreur lors de l\'upload de la DPAE');
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async () => {
    if (!contract?.certificat_medical_id || !contract?.dpae_id) {
      alert('Le certificat médical et la DPAE sont obligatoires pour activer le salarié');
      return;
    }

    setActivating(true);
    try {
      const { error: contratError } = await supabase
        .from('contrat')
        .update({
          statut: 'valide',
          date_validation: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (contratError) throw contratError;

      const { error: profilError } = await supabase
        .from('profil')
        .update({
          statut: 'actif',
          date_entree: new Date().toISOString()
        })
        .eq('id', profilId);

      if (profilError) throw profilError;

      onActivate();
      onClose();
    } catch (error) {
      console.error('Erreur activation:', error);
      alert('Erreur lors de l\'activation du salarié');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun contrat trouvé</h3>
            <p className="text-gray-600 mb-6">Aucun contrat n'a été envoyé à ce salarié.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasCertificat = !!contract.certificat_medical_id;
  const hasDpae = !!contract.dpae_id;
  const isSigned = !!contract.date_signature;
  const canActivate = hasCertificat && hasDpae && isSigned;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Validation du contrat</h2>
            <p className="text-green-100 text-sm mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900">Contrat : {contract.modele.nom}</h3>
                <p className="text-sm text-blue-700 mt-1">Type : {contract.modele.type_contrat}</p>
                <p className="text-sm text-blue-700">
                  Envoyé le {new Date(contract.date_envoi).toLocaleDateString('fr-FR')}
                </p>
                {contract.variables?.poste && (
                  <p className="text-sm text-blue-700 font-medium mt-2">
                    Poste : {contract.variables.poste} | Salaire : {contract.variables.salaire}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`border-2 rounded-xl p-6 transition-all ${
              isSigned
                ? 'border-green-500 bg-green-50'
                : 'border-orange-300 bg-orange-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Signature</h3>
                {isSigned ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <p className={`text-sm ${isSigned ? 'text-green-700' : 'text-orange-700'}`}>
                {isSigned
                  ? `Signé le ${new Date(contract.date_signature!).toLocaleDateString('fr-FR')}`
                  : 'En attente de signature'
                }
              </p>
            </div>

            <div className={`border-2 rounded-xl p-6 transition-all ${
              hasCertificat
                ? 'border-green-500 bg-green-50'
                : 'border-orange-300 bg-orange-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Certificat médical</h3>
                {hasCertificat ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-orange-500" />
                )}
              </div>
              {hasCertificat && certificatUrl ? (
                <a
                  href={certificatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Voir le document
                </a>
              ) : (
                <p className="text-sm text-orange-700">Non reçu</p>
              )}
            </div>

            <div className={`border-2 rounded-xl p-6 transition-all ${
              hasDpae
                ? 'border-green-500 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">DPAE</h3>
                {hasDpae ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
              </div>
              {hasDpae && dpaeUrl ? (
                <a
                  href={dpaeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Voir le document
                </a>
              ) : (
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border-2 border-red-400 text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Upload...' : 'Uploader'}
                  <input
                    type="file"
                    onChange={handleDpaeUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <MedicalCertificateManager
              contractId={contract.id}
              employeeName={employeeName}
              employeeEmail={contract.profil?.email || ''}
              certificatMedicalId={contract.certificat_medical_id}
              onSuccess={() => {
                fetchContractData();
              }}
            />
          </div>

          {!canActivate && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Documents manquants</h4>
                  <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                    {!isSigned && <li>• Le contrat n'a pas encore été signé par le salarié</li>}
                    {!hasCertificat && <li>• Le certificat médical n'a pas été uploadé par le salarié</li>}
                    {!hasDpae && <li>• La DPAE doit être uploadée par vos soins</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {canActivate && (
            <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900">Tous les documents sont validés</h4>
                  <p className="text-sm text-green-800 mt-1">
                    Vous pouvez maintenant activer le salarié pour qu'il devienne opérationnel.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Fermer
            </button>
            <button
              onClick={handleActivate}
              disabled={!canActivate || activating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {activating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Activation...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Activer le salarié
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
