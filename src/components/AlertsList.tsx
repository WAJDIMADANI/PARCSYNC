import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, FileText, Calendar } from 'lucide-react';

interface ExpiringDoc {
  id: string;
  owner_type: string;
  owner_id: string;
  type: string;
  date_expiration: string;
  statut: string | null;
  jours_restants: number;
}

interface ExpiringContract {
  id: string;
  profil_id: string;
  type: string;
  date_fin: string;
  jours_restants: number;
}

export function AlertsList() {
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDoc[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'docs' | 'contracts'>('docs');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [docsRes, contractsRes] = await Promise.all([
        supabase.from('v_docs_expirant').select('*'),
        supabase.from('v_contrats_cdd_fin').select('*')
      ]);

      if (docsRes.error) throw docsRes.error;
      if (contractsRes.error) throw contractsRes.error;

      setExpiringDocs(docsRes.data || []);
      setExpiringContracts(contractsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Alertes</h1>
        <p className="text-gray-600 mt-1">Documents et contrats nécessitant une attention</p>
      </div>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'docs'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-5 h-5 mr-2" />
          Documents expirants ({expiringDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'contracts'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-5 h-5 mr-2" />
          CDD fin proche ({expiringContracts.length})
        </button>
      </div>

      {activeTab === 'docs' && (
        <div>
          {expiringDocs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun document expirant dans les 45 prochains jours</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type propriétaire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date expiration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jours restants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.owner_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(doc.date_expiration).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          doc.jours_restants <= 7
                            ? 'bg-red-100 text-red-700'
                            : doc.jours_restants <= 15
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {doc.jours_restants} jours
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {doc.statut || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contracts' && (
        <div>
          {expiringContracts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun CDD se terminant dans les 30 prochains jours</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type contrat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date fin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jours restants
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contract.type.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(contract.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          contract.jours_restants <= 7
                            ? 'bg-red-100 text-red-700'
                            : contract.jours_restants <= 15
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {contract.jours_restants} jours
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
