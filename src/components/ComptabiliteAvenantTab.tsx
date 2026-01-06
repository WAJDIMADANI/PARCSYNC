import { useState } from 'react';
import { Calendar, Download, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface AvenantSigne {
  contrat_id: string;
  profil_id: string;
  nom: string;
  prenom: string;
  poste: string | null;
  avenant_num: string;
  date_debut: string | null;
  date_fin: string | null;
  yousign_signed_at: string;
}

export function ComptabiliteAvenantTab() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [avenants, setAvenants] = useState<AvenantSigne[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAvenants = async () => {
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une plage de dates');
      return;
    }

    setLoading(true);
    try {
      const fromDate = new Date(dateDebut);
      fromDate.setHours(0, 0, 0, 0);

      const toDate = new Date(dateFin);
      toDate.setHours(23, 59, 59, 999);
      toDate.setDate(toDate.getDate() + 1);

      const { data, error } = await supabase
        .from('v_avenants_signes')
        .select('contrat_id, profil_id, nom, prenom, poste, avenant_num, date_debut, date_fin, yousign_signed_at')
        .gte('yousign_signed_at', fromDate.toISOString())
        .lt('yousign_signed_at', toDate.toISOString())
        .order('yousign_signed_at', { ascending: false });

      if (error) throw error;

      setAvenants(data || []);
    } catch (err: any) {
      console.error('Erreur chargement avenants:', err);
      alert(err?.message ?? 'Erreur lors du chargement des avenants');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredAvenants.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = filteredAvenants.map((item) => ({
      'NOM': item.nom,
      'PRENOM': item.prenom,
      'POSTE': item.poste || '',
      'AVENANT': item.avenant_num,
      'DATE_DEBUT': item.date_debut ? new Date(item.date_debut).toLocaleDateString('fr-FR') : '',
      'DATE_FIN': item.date_fin ? new Date(item.date_fin).toLocaleDateString('fr-FR') : '',
      'DATE_SIGNATURE': item.yousign_signed_at ? new Date(item.yousign_signed_at).toLocaleDateString('fr-FR') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avenants');
    XLSX.writeFile(wb, `avenants_${dateDebut}_${dateFin}.xlsx`);
  };

  const filteredAvenants = avenants.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    return (
      (item.nom ?? '').toLowerCase().includes(search) ||
      (item.prenom ?? '').toLowerCase().includes(search) ||
      (item.poste ?? '').toLowerCase().includes(search) ||
      (item.avenant_num ?? '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-lg border border-teal-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-6 w-6 text-teal-600" />
          Avenants signés
        </h2>
        <p className="text-gray-600 mb-6">
          Consultez la liste des avenants signés sur une période donnée
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={fetchAvenants}
            disabled={loading}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
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

      {avenants.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, poste, avenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-teal-600">{filteredAvenants.length}</span> avenant{filteredAvenants.length > 1 ? 's' : ''}
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
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
                      Poste
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date début
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date fin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date signature
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAvenants.map((item) => (
                    <tr key={`${item.contrat_id}-${item.avenant_num}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.prenom}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.poste || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-600">
                        {item.avenant_num}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.date_debut ? new Date(item.date_debut).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.date_fin ? new Date(item.date_fin).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.yousign_signed_at ? new Date(item.yousign_signed_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && avenants.length === 0 && dateDebut && dateFin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucun avenant signé trouvé pour cette période</p>
        </div>
      )}
    </div>
  );
}
