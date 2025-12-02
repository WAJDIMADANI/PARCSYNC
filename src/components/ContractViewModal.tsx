import { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Contract {
  id: string;
  profil_id: string;
  modele_id: string;
  statut: string;
  variables?: string;
  date_signature?: string;
}

interface ContractViewModalProps {
  contract: Contract;
  onClose: () => void;
  onDownload?: () => void;
}

export default function ContractViewModal({
  contract,
  onClose
}: ContractViewModalProps) {
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => {
    fetchContractData();
  }, [contract.id]);

  const fetchContractData = async () => {
    try {
      setLoading(true);

      // 1. Récupère le contrat
      const { data: contractData, error: contractError } = await supabase
        .from('contrat')
        .select('*')
        .eq('id', contract.id)
        .single();

      if (contractError) throw contractError;

      console.log('📋 Contract data:', contractData);

      // 2. Récupère le profil (candidat) avec modele_contrat et secteur
      const { data: profil, error: profilError } = await supabase
        .from('profil')
        .select('nom, prenom, email, modele_contrat, secteur:secteur_id(nom)')
        .eq('id', contractData.profil_id)
        .single();

      if (profilError) throw profilError;
      console.log('👤 Profil data:', profil);

      // 3. Récupère le modèle
      const { data: modele, error: modeleError } = await supabase
        .from('modeles_contrats')
        .select('id, nom, contenu_html')
        .eq('id', contractData.modele_id)
        .single();

      if (modeleError) throw modeleError;
      console.log('📄 Modele data:', modele);

      // Fusionne les données
      const fullData = {
        ...contractData,
        profil: profil,
        modele: modele
      };

      console.log('✅ Full data merged:', fullData);
      setContractData(fullData);

      // Si le contrat a un PDF signé, générer l'URL signée
      if (fullData.fichier_signe_url) {
        await loadPdfUrl(fullData.fichier_signe_url);
      }

      // Génère le HTML avec les variables
      if (modele && modele.contenu_html && contractData.variables) {
        let html = modele.contenu_html;
        const variables = JSON.parse(contractData.variables);

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          html = html.replace(regex, String(value));
        });

        setHtmlContent(html);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPdfUrl = async (storagePath: string) => {
    try {
      setLoadingPdf(true);
      setPdfError(null);

      // Extraire le chemin sans le préfixe 'documents/'
      const path = storagePath.startsWith('documents/')
        ? storagePath.substring('documents/'.length)
        : storagePath;

      console.log('📄 Loading PDF from path:', path);

      // Générer une URL signée valide pour 120 secondes
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 120);

      if (error) {
        console.error('❌ Error creating signed URL:', error);
        setPdfError('Impossible de charger le PDF');
        return;
      }

      if (data?.signedUrl) {
        console.log('✅ PDF URL generated:', data.signedUrl);
        setPdfUrl(data.signedUrl);
      } else {
        setPdfError('URL du PDF non disponible');
      }
    } catch (error) {
      console.error('❌ Error loading PDF:', error);
      setPdfError('Erreur lors du chargement du PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  // ✅ FONCTION CORRIGÉE - Télécharge le PDF signé depuis Yousign
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-signed-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ contractId: contract.id })
        }
      );

      const data = await response.json();

      if (data.success && data.url) {
        // Ouvrir le PDF dans un nouvel onglet
        window.open(data.url, '_blank');
      } else {
        alert('Erreur: ' + (data.error || 'Impossible de télécharger le PDF'));
      }
    } catch (error: any) {
      alert('Erreur lors du téléchargement: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const hasPdf = contractData?.fichier_signe_url && pdfUrl && !pdfError;
  const shouldShowPdf = hasPdf && !showHtml;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Aperçu du contrat</h2>
            <p className="text-sm text-gray-500 mt-1">
              {contractData?.profil?.prenom} {contractData?.profil?.nom}
            </p>
            {hasPdf && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                Document signé disponible
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasPdf && (
              <>
                <button
                  onClick={() => setShowHtml(!showHtml)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  title={showHtml ? 'Voir le PDF' : 'Voir le modèle HTML'}
                >
                  <FileText size={20} />
                  {showHtml ? 'Voir PDF' : 'Voir modèle'}
                </button>
                <button
                  onClick={() => window.open(pdfUrl, '_blank')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={20} />
                </button>
              </>
            )}
            {contract.statut === 'signe' && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                title="Télécharger le PDF signé"
              >
                <Download size={20} />
                {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
              title="Fermer"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Chargement du contrat...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">Statut:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    contract.statut === 'signe'
                      ? 'bg-green-100 text-green-800'
                      : contract.statut === 'en_attente_signature'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {contract.statut === 'signe'
                    ? 'Signé'
                    : contract.statut === 'en_attente_signature'
                    ? 'En attente de signature'
                    : contract.statut}
                </span>
                {contract.date_signature && (
                  <span className="text-sm text-gray-500">
                    Signé le {new Date(contract.date_signature).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Contract Content */}
              {shouldShowPdf ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
                  {loadingPdf ? (
                    <div className="flex justify-center items-center h-[700px]">
                      <p className="text-gray-500">Chargement du PDF...</p>
                    </div>
                  ) : (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[700px] border-0"
                      title="Aperçu du contrat PDF"
                    />
                  )}
                </div>
              ) : pdfError ? (
                <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                  <p className="text-red-600 text-center">{pdfError}</p>
                  {htmlContent && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 text-center mb-4">Aperçu du modèle HTML:</p>
                      <div
                        className="prose prose-sm max-w-none bg-white p-4 rounded"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  {!hasPdf && (
                    <p className="text-sm text-amber-600 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      Aperçu du modèle (contrat non signé)
                    </p>
                  )}
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              )}

              {/* Contract Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Email du signataire</p>
                  <p className="font-medium text-gray-900">
                    {contractData?.profil?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Modèle de contrat</p>
                  <p className="font-medium text-gray-900">
                    {contractData?.modele?.nom}
                  </p>
                </div>
                {contractData?.profil?.modele_contrat && (
                  <div>
                    <p className="text-sm text-gray-600">Modèle de contrat signé</p>
                    <p className="font-medium text-gray-900">
                      {contractData.profil.modele_contrat}
                    </p>
                  </div>
                )}
                {contractData?.profil?.secteur?.nom && (
                  <div>
                    <p className="text-sm text-gray-600">Secteur</p>
                    <p className="font-medium text-gray-900">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">
                        {contractData.profil.secteur.nom}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}