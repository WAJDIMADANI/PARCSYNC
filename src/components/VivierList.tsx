import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface VivierCandidate {
  id: string;
  candidat_id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  email: string | null;
  poste_souhaite: string | null;
  date_disponibilite: string | null;
  mois_disponibilite: string | null;
  created_at: string;
  updated_at: string;
}

export function VivierList() {
  const [candidates, setCandidates] = useState<VivierCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<VivierCandidate | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'date_disponibilite' | 'nom' | 'prenom'; direction: 'asc' | 'desc' }>({
    key: 'date_disponibilite',
    direction: 'asc',
  });

  useEffect(() => {
    fetchVivierCandidates();
  }, []);

  const fetchVivierCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('vivier')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Erreur chargement vivier:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDisponibilite = (candidate: VivierCandidate): string => {
    if (candidate.date_disponibilite) {
      const date = new Date(candidate.date_disponibilite);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (candidate.mois_disponibilite) {
      const [year, month] = candidate.mois_disponibilite.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return '-';
  };

  const getDisponibiliteSortValue = (candidate: VivierCandidate): number => {
    if (candidate.date_disponibilite) {
      return new Date(candidate.date_disponibilite).getTime();
    }
    if (candidate.mois_disponibilite) {
      return new Date(candidate.mois_disponibilite + '-01').getTime();
    }
    return 0;
  };

  const handleSort = (key: 'date_disponibilite' | 'nom' | 'prenom') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortConfig.key === 'date_disponibilite') {
      aValue = getDisponibiliteSortValue(a);
      bValue = getDisponibiliteSortValue(b);
    } else {
      aValue = a[sortConfig.key]?.toLowerCase() || '';
      bValue = b[sortConfig.key]?.toLowerCase() || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredCandidates = sortedCandidates.filter((cand) =>
    `${cand.prenom} ${cand.nom} ${cand.email} ${cand.poste_souhaite}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement du vivier..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vivier</h1>
          <p className="text-gray-600 mt-1">{candidates.length} candidat(s) dans le vivier</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un candidat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun candidat dans le vivier</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom')}
                >
                  <div className="flex items-center gap-1">
                    Nom
                    {sortConfig.key === 'nom' && (
                      <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prenom')}
                >
                  <div className="flex items-center gap-1">
                    Prénom
                    {sortConfig.key === 'prenom' && (
                      <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poste souhaité
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date_disponibilite')}
                >
                  <div className="flex items-center gap-1">
                    Date de disponibilité
                    {sortConfig.key === 'date_disponibilite' && (
                      <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {candidate.nom}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {candidate.prenom}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {candidate.email || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {candidate.telephone || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {candidate.poste_souhaite || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatDisponibilite(candidate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCandidate && (
        <VivierModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}

function VivierModal({ candidate, onClose }: { candidate: VivierCandidate; onClose: () => void }) {
  const formatDisponibilite = (cand: VivierCandidate): string => {
    if (cand.date_disponibilite) {
      const date = new Date(cand.date_disponibilite);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (cand.mois_disponibilite) {
      const [year, month] = cand.mois_disponibilite.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return '-';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Fiche candidat - Vivier</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{candidate.prenom}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{candidate.nom}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{candidate.email || '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{candidate.telephone || '-'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poste souhaité</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{candidate.poste_souhaite || '-'}</div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de disponibilité</label>
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-semibold text-lg">
              {formatDisponibilite(candidate)}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ajouté au vivier le</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
              {new Date(candidate.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
