import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Calendar, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
}

interface Document {
  id: string;
  owner_id: string;
  type: string;
  date_expiration: string;
  statut: string | null;
  storage_path: string | null;
  vehicule?: Vehicle;
}

export function CTAssuranceList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ct' | 'assurance'>('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document')
        .select('*, vehicule:owner_id(id, immatriculation, marque, modele)')
        .eq('owner_type', 'vehicule')
        .in('type', ['controle_technique', 'assurance'])
        .order('date_expiration', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (dateExpiration: string) => {
    const today = new Date();
    const expDate = new Date(dateExpiration);
    const daysRemaining = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'bg-red-100 text-red-700';
    if (daysRemaining <= 7) return 'bg-red-100 text-red-700';
    if (daysRemaining <= 30) return 'bg-orange-100 text-orange-700';
    if (daysRemaining <= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusLabel = (dateExpiration: string) => {
    const today = new Date();
    const expDate = new Date(dateExpiration);
    const daysRemaining = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'Expiré';
    if (daysRemaining === 0) return 'Expire aujourd\'hui';
    if (daysRemaining === 1) return 'Expire demain';
    if (daysRemaining <= 7) return `${daysRemaining}j restants`;
    if (daysRemaining <= 30) return `${daysRemaining}j restants`;
    return 'Valide';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.vehicule
      ? `${doc.vehicule.immatriculation} ${doc.vehicule.marque} ${doc.vehicule.modele}`.toLowerCase().includes(search.toLowerCase())
      : false;

    const matchesType =
      filterType === 'all' ||
      (filterType === 'ct' && doc.type === 'controle_technique') ||
      (filterType === 'assurance' && doc.type === 'assurance');

    return matchesSearch && matchesType;
  });

  const ctDocs = filteredDocuments.filter(d => d.type === 'controle_technique');
  const assuranceDocs = filteredDocuments.filter(d => d.type === 'assurance');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des assurances..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">CT & Assurance</h1>
        <p className="text-gray-600 mt-1">Gestion des contrôles techniques et assurances</p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CT à renouveler</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {ctDocs.filter(d => {
                  const days = Math.floor((new Date(d.date_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return days <= 30;
                }).length}
              </p>
            </div>
            <Shield className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assurances à renouveler</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {assuranceDocs.filter(d => {
                  const days = Math.floor((new Date(d.date_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return days <= 30;
                }).length}
              </p>
            </div>
            <Shield className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Documents expirés</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {filteredDocuments.filter(d => new Date(d.date_expiration) < new Date()).length}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un véhicule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilterType('ct')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              filterType === 'ct'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            CT
          </button>
          <button
            onClick={() => setFilterType('assurance')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              filterType === 'assurance'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Assurance
          </button>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun document trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Véhicule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {doc.vehicule ? (
                      <div>
                        <div className="font-semibold">{doc.vehicule.immatriculation}</div>
                        <div className="text-xs text-gray-500">{doc.vehicule.marque} {doc.vehicule.modele}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      doc.type === 'controle_technique' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {doc.type === 'controle_technique' ? 'CT' : 'Assurance'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(doc.date_expiration).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.date_expiration)}`}>
                      {new Date(doc.date_expiration) < new Date() ? (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      ) : (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {getStatusLabel(doc.date_expiration)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {doc.storage_path ? (
                      <a href="#" className="text-blue-600 hover:underline">Télécharger</a>
                    ) : (
                      <span className="text-gray-400">Non disponible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
