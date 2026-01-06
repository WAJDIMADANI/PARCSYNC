import { useState } from 'react';
import { Calendar, Download, MapPin, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface AddressChange {
  profil_id: string;
  changed_at: string;
  nom: string;
  prenom: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
}

export function ComptabiliteAdresseTab() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [addressChanges, setAddressChanges] = useState<AddressChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAddressChanges = async () => {
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une plage de dates');
      return;
    }

    setLoading(true);
    try {
      const from = `${dateDebut} 00:00:00+00`;
      const to = `${dateFin} 23:59:59+00`;

      const { data, error } = await supabase
        .from('v_address_last_change')
        .select('profil_id, changed_at, nom, prenom, adresse, code_postal, ville')
        .gte('changed_at', from)
        .lte('changed_at', to)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      setAddressChanges(data || []);
    } catch (err: any) {
      console.error('Erreur chargement changements adresse:', err);
      alert(err?.message ?? 'Erreur lors du chargement des changements d\'adresse');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredAddressChanges.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = filteredAddressChanges.map((item) => ({
      'NOM': item.nom,
      'PRENOM': item.prenom,
      'ADRESSE': item.adresse || '',
      'CODE POSTAL': item.code_postal || '',
      'VILLE': item.ville || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Adresse');
    XLSX.writeFile(wb, `adresse_${dateDebut}_${dateFin}.xlsx`);
  };

  const filteredAddressChanges = addressChanges.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    return (
      (item.nom ?? '').toLowerCase().includes(search) ||
      (item.prenom ?? '').toLowerCase().includes(search) ||
      (item.adresse ?? '').toLowerCase().includes(search) ||
      (item.code_postal ?? '').toLowerCase().includes(search) ||
      (item.ville ?? '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-6 w-6 text-orange-600" />
          Changements d'adresse
        </h2>
        <p className="text-gray-600 mb-6">
          Consultez la liste des changements d'adresse sur une période donnée
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
            onClick={fetchAddressChanges}
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

      {addressChanges.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, adresse, code postal, ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">{filteredAddressChanges.length}</span> changement{filteredAddressChanges.length > 1 ? 's' : ''}
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
                      Adresse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code Postal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ville
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date changement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAddressChanges.map((item) => (
                    <tr key={item.profil_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.prenom}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.adresse || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.code_postal || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.ville || '-'}
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

      {!loading && addressChanges.length === 0 && dateDebut && dateFin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucun changement d'adresse trouvé pour cette période</p>
        </div>
      )}
    </div>
  );
}
