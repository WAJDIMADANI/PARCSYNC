import { useState } from 'react';
import { Calendar, Download, HeartHandshake, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface MutuelleData {
  profil_id: string;
  nom: string;
  prenom: string;
  mutuelle_effective_since: string | null;
}

export function ComptabiliteMutuelleTab() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [mutuelleData, setMutuelleData] = useState<MutuelleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMutuelleData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v_compta_mutuelle')
        .select('profil_id, nom, prenom, mutuelle_effective_since')
        .order('mutuelle_effective_since', { ascending: false });

      if (dateDebut) {
        const from = `${dateDebut} 00:00:00+00`;
        query = query.gte('mutuelle_effective_since', from);
      }

      if (dateFin) {
        const to = `${dateFin} 23:59:59+00`;
        query = query.lte('mutuelle_effective_since', to);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMutuelleData(data || []);
    } catch (err: any) {
      console.error('Erreur chargement données mutuelle:', err);
      alert(err?.message ?? 'Erreur lors du chargement des données mutuelle');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredMutuelleData.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = filteredMutuelleData.map((item) => ({
      'NOM': item.nom,
      'PRENOM': item.prenom,
      'EFFECTIF A COMPTER DU': item.mutuelle_effective_since
        ? new Date(item.mutuelle_effective_since).toLocaleDateString('fr-FR')
        : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutuelle');

    const filename = dateDebut && dateFin
      ? `mutuelle_${dateDebut}_${dateFin}.xlsx`
      : `mutuelle_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  const filteredMutuelleData = mutuelleData.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    return (
      (item.nom ?? '').toLowerCase().includes(search) ||
      (item.prenom ?? '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-lg border border-pink-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-pink-600" />
          Mutuelle
        </h2>
        <p className="text-gray-600 mb-6">
          Consultez la liste des salariés avec leur date d'effectivité de mutuelle
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date fin
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={fetchMutuelleData}
            disabled={loading}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Chargement...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Rechercher
              </>
            )}
          </button>
        </div>
      </div>

      {mutuelleData.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-pink-600">{filteredMutuelleData.length}</span> salarié{filteredMutuelleData.length > 1 ? 's' : ''}
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
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
                      Effectif à compter du
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMutuelleData.map((item) => (
                    <tr key={item.profil_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.prenom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.mutuelle_effective_since
                          ? new Date(item.mutuelle_effective_since).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && mutuelleData.length === 0 && (dateDebut || dateFin) && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <HeartHandshake className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucune donnée de mutuelle trouvée pour cette période</p>
        </div>
      )}
    </div>
  );
}
