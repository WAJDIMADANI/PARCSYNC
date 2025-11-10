import { useState, useEffect } from 'react';
import { supabase, getStorageUrl } from '../lib/supabase';
import { Search, CheckCircle, Clock, Send, Eye } from 'lucide-react';
import { ContractViewModal } from './ContractViewModal';
import { ContractPreviewModal } from './ContractPreviewModal';

interface Employee {
  prenom: string;
  nom: string;
}

interface ModeleContrat {
  type_contrat: string;
}

interface Contract {
  id: string;
  profil_id: string;
  variables: {
    date_debut?: string;
    date_fin?: string;
    salaire?: string;
    heures_semaine?: string;
    nom_salarie?: string;
    email_salarie?: string;
    [key: string]: any;
  };
  date_signature: string | null;
  yousign_signed_at: string | null;
  fichier_contrat_url: string | null;
  fichier_signe_url: string | null;
  statut: string;
  created_at: string;
  profil?: Employee;
  modeles_contrats?: ModeleContrat;
}

export function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingContract, setSendingContract] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [modalContractUrl, setModalContractUrl] = useState<string>('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewingContract, setPreviewingContract] = useState<Contract | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('contrat')
        .select(`
          *,
          profil:profil_id(prenom, nom),
          modeles_contrats:modele_id(type_contrat)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsSigned = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contrat')
        .update({
          date_signature: new Date().toISOString(),
          statut: 'signe'
        })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const viewContract = async (contract: Contract) => {
    let url = contract.fichier_signe_url || contract.fichier_contrat_url;

    if (!url) {
      // Si pas de fichier, afficher l'aperçu du contrat
      setPreviewingContract(contract);
      return;
    }

    // Ouvrir le modal avec le PDF
    setModalContractUrl(getStorageUrl(url));
    setViewingContract(contract);
  };

  const resendContract = async (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    if (!contract.variables?.email_salarie) {
      alert('Email du salarié manquant. Impossible de renvoyer le contrat.');
      return;
    }

    if (!confirm('Voulez-vous renvoyer le contrat au candidat ?')) {
      return;
    }

    setSendingContract(contractId);
    try {
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
        throw new Error('Erreur lors de l\'envoi du contrat');
      }

      alert('Contrat renvoyé avec succès au candidat !');
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'envoi du contrat');
    } finally {
      setSendingContract(null);
    }
  };

  const filteredContracts = contracts.filter(c =>
    `${c.profil?.prenom || ''} ${c.profil?.nom || ''} ${c.modeles_contrats?.type_contrat || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-600 mt-1">{contracts.length} contrat(s)</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un contrat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun contrat trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salarié
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date début
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rémunération
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures/sem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signature
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contract.profil ? `${contract.profil.prenom} ${contract.profil.nom}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.modeles_contrats?.type_contrat ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        contract.modeles_contrats.type_contrat.toLowerCase() === 'cdi' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {contract.modeles_contrats.type_contrat.toUpperCase()}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {contract.variables?.date_debut ? new Date(contract.variables.date_debut).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {contract.variables?.date_fin ? new Date(contract.variables.date_fin).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.variables?.salaire ? `${parseFloat(contract.variables.salaire).toLocaleString()} €` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {contract.variables?.heures_semaine ? `${contract.variables.heures_semaine}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      {contract.date_signature || contract.yousign_signed_at ? (
                        <>
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Signé
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(contract.date_signature || contract.yousign_signed_at || '').toLocaleDateString('fr-FR')}
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center text-orange-600">
                          <Clock className="w-4 h-4 mr-1" />
                          En attente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Consulter le contrat - Toujours visible */}
                      <button
                        onClick={() => viewContract(contract)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50"
                        title="Consulter le contrat"
                      >
                        <Eye className="w-4 h-4" />
                        Consulter
                      </button>

                      {/* Actions pour contrats non signés */}
                      {!contract.date_signature && !contract.yousign_signed_at && (
                        <>
                          {/* Envoyer au candidat */}
                          <button
                            onClick={() => resendContract(contract.id)}
                            disabled={sendingContract === contract.id}
                            className="text-orange-600 hover:text-orange-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 disabled:opacity-50"
                            title="Renvoyer au candidat"
                          >
                            <Send className="w-4 h-4" />
                            {sendingContract === contract.id ? 'Envoi...' : 'Envoyer'}
                          </button>

                          {/* Marquer signé manuellement */}
                          <button
                            onClick={() => markAsSigned(contract.id)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50"
                            title="Marquer comme signé"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Marquer signé
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading overlay pendant la génération du PDF */}
      {generatingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg font-medium text-gray-900">Génération du contrat en cours...</p>
            <p className="text-sm text-gray-500">Veuillez patienter</p>
          </div>
        </div>
      )}

      {/* Modal de consultation PDF */}
      {viewingContract && (
        <ContractViewModal
          isOpen={true}
          onClose={() => {
            setViewingContract(null);
            setModalContractUrl('');
          }}
          contractUrl={modalContractUrl}
          contractId={viewingContract.id}
          employeeName={viewingContract.profil ? `${viewingContract.profil.prenom} ${viewingContract.profil.nom}` : viewingContract.variables?.nom_salarie || 'Salarié'}
          employeeEmail={viewingContract.variables?.email_salarie}
        />
      )}

      {/* Modal d'aperçu (quand pas de PDF) */}
      {previewingContract && (
        <ContractPreviewModal
          isOpen={true}
          onClose={() => setPreviewingContract(null)}
          contract={previewingContract}
          onDownloadPdf={async () => {
            setGeneratingPdf(true);
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract-pdf`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    contractId: previewingContract.id
                  })
                }
              );

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
              }

              const result = await response.json();

              if (result.url) {
                // Télécharger le PDF
                const pdfUrl = getStorageUrl(result.url);
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = `contrat-${previewingContract.profil?.prenom}-${previewingContract.profil?.nom}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Rafraîchir les données
                await fetchData();
                setPreviewingContract(null);
              } else {
                throw new Error('Aucune URL retournée');
              }
            } catch (error: any) {
              console.error('Erreur:', error);
              alert(`Erreur lors de la génération du PDF:\n${error.message}`);
            } finally {
              setGeneratingPdf(false);
            }
          }}
          onSendEmail={
            previewingContract.variables?.email_salarie
              ? async () => {
                  setGeneratingPdf(true);
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
                          contractId: previewingContract.id,
                          employeeEmail: previewingContract.variables.email_salarie,
                          employeeName: previewingContract.profil
                            ? `${previewingContract.profil.prenom} ${previewingContract.profil.nom}`
                            : previewingContract.variables.nom_salarie || 'Salarié'
                        })
                      }
                    );

                    if (!response.ok) {
                      throw new Error('Erreur lors de l\'envoi de l\'email');
                    }

                    alert('Email envoyé avec succès !');
                    setPreviewingContract(null);
                  } catch (error) {
                    console.error('Erreur:', error);
                    alert('Erreur lors de l\'envoi de l\'email');
                  } finally {
                    setGeneratingPdf(false);
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
