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
  date_entretien?: string;
  variables?: string;
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

export function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  // ✅ FONCTION POUR RÉCUPÉRER LA DATE D'ENTRETIEN
  const getDateEntretien = async (profilId: string): Promise<string | undefined> => {
    try {
      const { data, error } = await supabase
        .from('profil_statut_historique')
        .select('date_changement')
        .eq('profil_id', profilId)
        .eq('nouveau_statut', 'Entretien')
        .order('date_changement', { ascending: true })
        .limit(1)
        .single();

      if (error || !data) return undefined;
      return data.date_changement;
    } catch (error) {
      console.error('Erreur récupération date entretien:', error);
      return undefined;
    }
  };

  // ✅ FONCTION CORRIGÉE - Récupère les données séparément AVEC date d'entretien
  const fetchContracts = async () => {
    try {
      setLoading(true);
      
      // 1. Récupère TOUS les contrats
      const { data: contractsData, error: contractsError } = await supabase
        .from('contrat')
        .select('*')
        .order('date_envoi', { ascending: false });

      if (contractsError) throw contractsError;

      if (!contractsData || contractsData.length === 0) {
        setContracts([]);
        return;
      }

      // 2. Récupère tous les profils (candidats) UNIQUES
      const profilIds = [...new Set(contractsData.map(c => c.profil_id))];
      const { data: profils, error: profilsError } = await supabase
        .from('profil')
        .select('id, nom, prenom, email')
        .in('id', profilIds);

      if (profilsError) console.error('Erreur profils:', profilsError);

      // 3. Récupère tous les modèles UNIQUES
      const modeleIds = [...new Set(contractsData.map(c => c.modele_id))];
      const { data: modeles, error: modelesError } = await supabase
        .from('modeles_contrats')
        .select('id, nom')
        .in('id', modeleIds);

      if (modelesError) console.error('Erreur modèles:', modelesError);

      // 4. Récupère les dates d'entretien pour chaque profil
      const datesEntretien: Record<string, string | undefined> = {};
      for (const profilId of profilIds) {
        datesEntretien[profilId] = await getDateEntretien(profilId);
      }

      // 5. Fusionne les données
      const contractsWithData: Contract[] = contractsData.map(contract => {
        const profilData = profils?.find(p => p.id === contract.profil_id);
        const modeleData = modeles?.find(m => m.id === contract.modele_id);

        return {
          ...contract,
          candidat: profilData ? profilData : undefined,
          modele: modeleData ? modeleData : undefined,
          date_entretien: datesEntretien[contract.profil_id]
        };
      });

      setContracts(contractsWithData);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date entretien</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date signature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  {/* ✅ AFFICHAGE CANDIDAT */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {contract.candidat
                          ? `${contract.candidat.prenom} ${contract.candidat.nom}`
                          : 'N/A'}
                      </p>
                      <p className="text-gray-500">
                        {contract.candidat?.email || 'N/A'}
                      </p>
                    </div>
                  </td>

                  {/* ✅ AFFICHAGE MODÈLE */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.modele?.nom || 'N/A'}
                  </td>

                  {/* ✅ AFFICHAGE STATUT */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(contract.statut)}
                  </td>
                  
                  {/* ✅ AFFICHAGE DATE D'ENVOI */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.date_envoi)}
                  </td>

                  {/* ✅ AFFICHAGE DATE ENTRETIEN (DEPUIS HISTORIQUE) */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.date_entretien)}
                  </td>

                  {/* ✅ AFFICHAGE DATE SIGNATURE */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.date_signature)}
                  </td>
                  
                  {/* ✅ AFFICHAGE ACTIONS */}
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