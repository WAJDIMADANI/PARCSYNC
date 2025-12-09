import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, FileText, Calendar, Archive } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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
  nom: string;
  prenom: string;
  email: string | null;
  secteur_nom: string | null;
}

interface VivierNotification {
  id: string;
  candidat_id: string;
  nom: string;
  prenom: string;
  date_disponibilite: string | null;
  mois_disponibilite: string | null;
  jours_avant_disponibilite: number | null;
}

export function AlertsList({ onVivierClick }: { onVivierClick?: (candidatId: string) => void }) {
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDoc[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [vivierNotifications, setVivierNotifications] = useState<VivierNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'docs' | 'contracts' | 'vivier'>('docs');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [docsRes, contractsRes, vivierRes] = await Promise.all([
        supabase.from('v_docs_expirant').select('*'),
        supabase.from('v_contrats_cdd_fin').select('*'),
        supabase.rpc('get_vivier_notifications')
      ]);

      if (docsRes.error) throw docsRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (vivierRes.error) throw vivierRes.error;

      setExpiringDocs(docsRes.data || []);
      setExpiringContracts(contractsRes.data || []);
      setVivierNotifications(vivierRes.data || []);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des alertes..." />
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
        <button
          onClick={() => setActiveTab('vivier')}
          className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'vivier'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Archive className="w-5 h-5 mr-2" />
          Vivier disponible ({vivierNotifications.length})
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
                      Salarié
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Secteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type contrat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date fin prévue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jours restants
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {contract.nom} {contract.prenom}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contract.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contract.secteur_nom || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {contract.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
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

      {activeTab === 'vivier' && (
        <div>
          {vivierNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun candidat du vivier disponible prochainement</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de disponibilité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disponible dans
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vivierNotifications.map((notif) => {
                    const formatDisponibilite = () => {
                      if (notif.date_disponibilite) {
                        return new Date(notif.date_disponibilite).toLocaleDateString('fr-FR');
                      }
                      if (notif.mois_disponibilite) {
                        const [year, month] = notif.mois_disponibilite.split('-');
                        const date = new Date(parseInt(year), parseInt(month) - 1);
                        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                      }
                      return '-';
                    };

                    return (
                      <tr
                        key={notif.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => onVivierClick && onVivierClick(notif.candidat_id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {notif.nom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {notif.prenom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDisponibilite()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            notif.jours_avant_disponibilite !== null && notif.jours_avant_disponibilite <= 7
                              ? 'bg-green-100 text-green-700'
                              : notif.jours_avant_disponibilite !== null && notif.jours_avant_disponibilite <= 15
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            <Archive className="w-3 h-3 mr-1" />
                            {notif.jours_avant_disponibilite !== null
                              ? `${notif.jours_avant_disponibilite} jours`
                              : 'Ce mois-ci'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
