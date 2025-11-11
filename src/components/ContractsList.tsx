import React, { useState, useEffect } from 'react';
import { Download, Eye, Trash2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ContractViewModal from './ContractViewModal';

interface Contract {
  id: string;
  profil_id: string;
  modele_id: string;
  statut: string;
  date_envoi: string;
  date_signature?: string;
  candidat?: {
    nom: string;
    prenom: string;
    email: string;
  };
  modele?: {
    nom: string;
  };
}

interface Candidate {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export default function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contrat')
        .select(`
          id,
          profil_id,
          modele_id,
          statut,
          date_envoi,
          date_signature,
          candidat:profil_id(nom, prenom, email),
          modele:modele_id(nom)
        `)
        .order('date_envoi', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      'en_attente_signature': { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      'signe': { color: 'bg-green-100 text-green-800', label: 'Signé' },
      'refuse': { color: 'bg-red-100 text-red-800', label: 'Refusé' },
      'expire': { color: 'bg-gray-100 text-gray-800', label: 'Expiré' },
      'contrat_envoye': { color: 'bg-blue-100 text-blue-800', label: 'Envoyé' }
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>;
  };

  const onDeleteContract = async (contractId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) return;

    try {
      const { error } = await supabase
        .from('contrat')
        .delete()
        .eq('id', contractId);

      if (error) throw error;
      setContracts(contracts.filter(c => c.id !== contractId));
      alert('Contrat supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du contrat');
    }
  };

  // ✅ FONCTION CORRIGÉE - Télécharge le PDF signé depuis Yousign
  const onDownloadPdf = async (contractId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-signed-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ contractId })
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
    }
  };

  const onViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setShowModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Contrats</h1>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun contrat trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date d'envoi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {contract.candidat?.[0]?.prenom} {contract.candidat?.[0]?.nom}
                      </p>
                      <p className="text-gray-500">{contract.candidat?.[0]?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.modele?.[0]?.nom || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(contract.statut)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contract.date_envoi).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => onViewContract(contract)}
                      className="inline-flex items-center px-3 py-1 rounded-md text-blue-600 hover:bg-blue-50"
                      title="Voir le contrat"
                    >
                      <Eye size={18} />
                    </button>
                    {contract.statut === 'signe' && (
                      <button
                        onClick={() => onDownloadPdf(contract.id)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-green-600 hover:bg-green-50"
                        title="Télécharger le PDF signé"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteContract(contract.id)}
                      className="inline-flex items-center px-3 py-1 rounded-md text-red-600 hover:bg-red-50"
                      title="Supprimer le contrat"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedContract && (
        <ContractViewModal
          contract={selectedContract}
          onClose={() => {
            setShowModal(false);
            setSelectedContract(null);
          }}
          onDownload={() => onDownloadPdf(selectedContract.id)}
        />
      )}
    </div>
  );
}