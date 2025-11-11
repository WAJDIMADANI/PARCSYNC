import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Contract {
  id: string;
  profil_id: string;
  modele_id: string;
  statut: string;
  variables: string;
  date_signature?: string;
}

interface ContractViewModalProps {
  contract: Contract;
  onClose: () => void;
  onDownload?: () => void;
}

export default function ContractViewModal({
  contract,
  onClose,
  onDownload
}: ContractViewModalProps) {
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchContractData();
  }, [contract.id]);

  const fetchContractData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contrat')
        .select(`
          id,
          statut,
          variables,
          date_signature,
          modele:modele_id(
            id,
            nom,
            contenu_html
          ),
          profil:profil_id(
            nom,
            prenom,
            email
          )
        `)
        .eq('id', contract.id)
        .single();

      if (error) throw error;

      setContractData(data);

      // Générer le HTML avec les variables
      if (data.modele && data.modele.contenu_html && data.variables) {
        let html = data.modele.contenu_html;
        const variables = JSON.parse(data.variables);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Aperçu du contrat</h2>
            <p className="text-sm text-gray-500 mt-1">
              {contractData?.profil?.[0]?.prenom} {contractData?.profil?.[0]?.nom}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>

              {/* Contract Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Email du signataire</p>
                  <p className="font-medium text-gray-900">
                    {contractData?.profil?.[0]?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Modèle de contrat</p>
                  <p className="font-medium text-gray-900">
                    {contractData?.modele?.[0]?.nom}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}