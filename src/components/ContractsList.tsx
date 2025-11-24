import { useState, useEffect } from 'react';
import { Download, Eye, Trash2, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ContractViewModal from './ContractViewModal';
import { LoadingSpinner } from './LoadingSpinner';

interface Contract {
  id: string;
  profil_id: string;
  modele_id: string;
  statut: string;
  date_envoi: string;
  date_signature?: string;
  date_validation?: string;
  date_entree?: string;
  variables?: string;
  candidat?: {
    nom: string;
    prenom: string;
    email: string;
    modele_contrat?: string;
    secteur?: {
      nom: string;
    };
  };
  modele?: {
    nom: string;
    type_contrat: string;
  };
}

export function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  // Note: La date d'entrée est maintenant stockée dans contrat.date_validation

  // ✅ FONCTION CORRIGÉE - Récupère les données séparément AVEC date d'entretien
  const fetchContracts = async () => {
    try {
      setLoading(true);
      
      // 1. Récupère TOUS les contrats avec date_validation
      const { data: contractsData, error: contractsError } = await supabase
        .from('contrat')
        .select('*')
        .order('date_envoi', { ascending: false });

      if (contractsError) throw contractsError;

      if (!contractsData || contractsData.length === 0) {
        setContracts([]);
        return;
      }

      // 2. Récupère tous les profils (candidats) UNIQUES avec modele_contrat et secteur
      const profilIds = [...new Set(contractsData.map(c => c.profil_id))];
      const { data: profils, error: profilsError } = await supabase
        .from('profil')
        .select('id, nom, prenom, email, modele_contrat, secteur:secteur_id(nom)')
        .in('id', profilIds);

      if (profilsError) console.error('Erreur profils:', profilsError);

      // 3. Récupère tous les modèles UNIQUES avec type_contrat
      const modeleIds = [...new Set(contractsData.map(c => c.modele_id))];
      const { data: modeles, error: modelesError } = await supabase
        .from('modeles_contrats')
        .select('id, nom, type_contrat')
        .in('id', modeleIds);

      if (modelesError) console.error('Erreur modèles:', modelesError);

      // 4. Fusionne les données - la date d'entrée vient de variables.date_debut ou date_validation
      const contractsWithData: Contract[] = contractsData.map(contract => {
        const profilData = profils?.find(p => p.id === contract.profil_id);
        const modeleData = modeles?.find(m => m.id === contract.modele_id);

        // Extraire la date de début depuis les variables si disponible
        let dateEntree = contract.date_validation;
        if (contract.variables) {
          try {
            const vars = typeof contract.variables === 'string'
              ? JSON.parse(contract.variables)
              : contract.variables;
            if (vars.date_debut) {
              dateEntree = vars.date_debut;
            }
          } catch (e) {
            console.error('Erreur parsing variables:', e);
          }
        }

        return {
          ...contract,
          candidat: profilData ? profilData : undefined,
          modele: modeleData ? modeleData : undefined,
          date_entree: dateEntree
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
    const statusMap: Record<string, { color: string; label: string; icon: string }> = {
      'en_attente_signature': {
        color: 'bg-amber-100 text-amber-800 border border-amber-300',
        label: 'En attente signature',
        icon: '⏳'
      },
      'signe': {
        color: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
        label: 'Signé',
        icon: '✓'
      },
      'refuse': {
        color: 'bg-rose-100 text-rose-800 border border-rose-300',
        label: 'Refusé',
        icon: '✕'
      },
      'expire': {
        color: 'bg-slate-100 text-slate-800 border border-slate-300',
        label: 'Expiré',
        icon: '⌛'
      },
      'contrat_envoye': {
        color: 'bg-sky-100 text-sky-800 border border-sky-300',
        label: 'Contrat envoyé',
        icon: '📧'
      },
      'actif': {
        color: 'bg-teal-100 text-teal-800 border border-teal-300',
        label: 'Actif',
        icon: '✓'
      }
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800 border border-gray-300', label: status, icon: '•' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${statusInfo.color} shadow-sm`}>
        <span className="text-base">{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    );
  };

  const getContractTypeBadge = (type: string) => {
    const typeMap: Record<string, { color: string; icon: string }> = {
      'CDI': {
        color: 'bg-green-100 text-green-800 border border-green-300',
        icon: '📄'
      },
      'CDD': {
        color: 'bg-orange-100 text-orange-800 border border-orange-300',
        icon: '📋'
      },
      'Avenant': {
        color: 'bg-blue-100 text-blue-800 border border-blue-300',
        icon: '📝'
      }
    };

    const typeInfo = typeMap[type] || { color: 'bg-gray-100 text-gray-800 border border-gray-300', icon: '📄' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${typeInfo.color}`}>
        <span>{typeInfo.icon}</span>
        {type}
      </span>
    );
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

  const filteredContracts = contracts.filter(contract => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const candidatName = contract.candidat
      ? `${contract.candidat.prenom} ${contract.candidat.nom}`.toLowerCase()
      : '';
    const candidatEmail = contract.candidat?.email?.toLowerCase() || '';
    const modeleName = contract.modele?.nom?.toLowerCase() || '';
    const modeleContratSigne = contract.candidat?.modele_contrat?.toLowerCase() || '';
    const secteurName = contract.candidat?.secteur?.nom?.toLowerCase() || '';

    return candidatName.includes(query) ||
           candidatEmail.includes(query) ||
           modeleName.includes(query) ||
           modeleContratSigne.includes(query) ||
           secteurName.includes(query);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Chargement des contrats..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Contrats</h1>

        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email ou modèle..."
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{filteredContracts.length}</span>
          <span>résultat{filteredContracts.length > 1 ? 's' : ''} trouvé{filteredContracts.length > 1 ? 's' : ''}</span>
          {filteredContracts.length < contracts.length && (
            <span className="text-gray-400">sur {contracts.length} total</span>
          )}
        </div>
      )}

      {filteredContracts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {searchQuery ? `Aucun contrat trouvé pour "${searchQuery}"` : 'Aucun contrat trouvé'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle contrat signé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secteur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date d'envoi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date entrée</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date signature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredContracts.map((contract) => (
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

                  {/* ✅ AFFICHAGE TYPE DE CONTRAT */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contract.modele?.type_contrat ? getContractTypeBadge(contract.modele.type_contrat) : 'N/A'}
                  </td>

                  {/* ✅ AFFICHAGE MODÈLE CONTRAT SIGNÉ */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.candidat?.modele_contrat || 'N/A'}
                  </td>

                  {/* ✅ AFFICHAGE SECTEUR */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contract.candidat?.secteur?.nom ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">
                        {contract.candidat.secteur.nom}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>

                  {/* ✅ AFFICHAGE STATUT */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(contract.statut)}
                  </td>
                  
                  {/* ✅ AFFICHAGE DATE D'ENVOI */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.date_envoi)}
                  </td>

                  {/* ✅ AFFICHAGE DATE ENTRÉE (DEPUIS HISTORIQUE) */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.date_entree)}
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
                    <button
                      onClick={() => onDownloadPdf(contract.id)}
                      className="inline-flex items-center px-3 py-1 rounded-md text-green-600 hover:bg-green-50"
                      title="Télécharger le PDF"
                    >
                      <Download size={18} />
                    </button>
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