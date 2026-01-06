import { useState } from 'react';
import { Calendar, Download, CreditCard, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface RibChange {
  profil_id: string;
  changed_at: string;
  nom: string;
  prenom: string;
  iban: string | null;
  bic: string | null;
}

export function ComptabiliteRibTab() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [ribChanges, setRibChanges] = useState<RibChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRibChanges = async () => {
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une plage de dates');
      return;
    }

    setLoading(true);
    try {
      const from = `${dateDebut} 00:00:00+00`;
      const to = `${dateFin} 23:59:59+00`;

      const { data, error } = await supabase
        .from('v_rib_last_change')
        .select('profil_id, changed_at, nom, prenom, iban, bic')
        .gte('changed_at', from)
        .lte('changed_at', to)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      setRibChanges(data || []);
    } catch (err: any) {
      console.error('Erreur chargement changements RIB:', err);
      alert(err?.message ?? 'Erreur lors du chargement des changements RIB');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredRibChanges.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = filteredRibChanges.map((item) => ({
      'NOM': item.nom,
      'PRENOM': item.prenom,
      'RIB': item.iban || '',
      'BIC': item.bic || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RIB');
    XLSX.writeFile(wb, `rib_${dateDebut}_${dateFin}.xlsx`);
  };

  const filteredRibChanges = ribChanges.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    return (
      (item.nom ?? '').toLowerCase().includes(search) ||
      (item.prenom ?? '').toLowerCase().includes(search) ||
      (item.iban ?? '').toLowerCase().includes(search) ||
      (item.bic ?? '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" />
          Changements de RIB
        </h2>
        <p className="text-gray-600 mb-6">
          Consultez la liste des changements de RIB/BIC sur une période donnée
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={fetchRibChanges}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
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

      {ribChanges.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, RIB, BIC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">{filteredRibChanges.length}</span> changement{filteredRibChanges.length > 1 ? 's' : ''}
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                      RIB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BIC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date changement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRibChanges.map((item) => (
                    <tr key={item.profil_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.prenom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.iban || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.bic || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.changed_at ? new Date(item.changed_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && ribChanges.length === 0 && dateDebut && dateFin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucun changement de RIB trouvé pour cette période</p>
        </div>
      )}
    </div>
  );
}
