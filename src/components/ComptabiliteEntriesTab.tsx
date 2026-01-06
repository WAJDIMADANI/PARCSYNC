import { useState, useEffect } from 'react';
import { Calendar, Download, Users, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface Employee {
  profil_id: string;

  "NOM": string;
  "PRENOM": string;
  "ADRESSE (RUE - CODE POSTALE - VILLE)": string | null;
  "ADRESSE MAIL": string | null;
  "DATE DE NAISSANCE": string | null;
  "LIEU DE NAISSANCE": string | null;
  "NATIONALITÉ": string | null;
  "SECTEUR D'AFFECTATION": string | null;
  "TITRE DE SÉJOUR O/N": string | null;
  "TITRE DE SÉJOUR FIN VALIDITÉ": string | null;
  "N°SECURITE SOCIALE": string | null;
  "CONTRAT DE TRAVAIL": string | null;
  "DATE ENTREE": string | null;
  "DATE SORTIE FIN CONTRAT": string | null;
  "IBAN": string | null;
  "BIC": string | null;

  signed_at: string;
}

export function ComptabiliteEntriesTab() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEntries = async () => {
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une plage de dates');
      return;
    }

    setLoading(true);
    try {
      const from = `${dateDebut} 00:00:00+00`;
      const to = `${dateFin} 23:59:59+00`;

      const { data, error } = await supabase
        .from('v_compta_entrees_export')
        .select('*')
        .gte('signed_at', from)
        .lte('signed_at', to)
        .order('signed_at', { ascending: false });

      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (err: any) {
      console.error('Erreur chargement entrées:', err);
      alert(err?.message ?? 'Erreur lors du chargement des entrées');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = filteredEmployees.map(({ profil_id, signed_at, ...rest }) => rest);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entrées');
    XLSX.writeFile(wb, `entrees_${dateDebut}_${dateFin}.xlsx`);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    return (
      (emp["NOM"] ?? '').toLowerCase().includes(search) ||
      (emp["PRENOM"] ?? '').toLowerCase().includes(search) ||
      (emp["ADRESSE MAIL"] ?? '').toLowerCase().includes(search) ||
      (emp["SECTEUR D'AFFECTATION"] ?? '').toLowerCase().includes(search) ||
      (emp["CONTRAT DE TRAVAIL"] ?? '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-green-600" />
          Entrées de salariés
        </h2>
        <p className="text-gray-600 mb-6">
          Consultez la liste des nouveaux salariés recrutés avec contrat signé sur une période donnée
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={fetchEntries}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
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

      {employees.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par matricule, nom, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-green-600">{filteredEmployees.length}</span> entrée{filteredEmployees.length > 1 ? 's' : ''}
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
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contrat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date entrée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date sortie
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.profil_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp["NOM"]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp["PRENOM"]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp["ADRESSE MAIL"]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp["CONTRAT DE TRAVAIL"]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp["DATE ENTREE"]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp["DATE SORTIE FIN CONTRAT"]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && employees.length === 0 && dateDebut && dateFin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucune entrée trouvée pour cette période</p>
        </div>
      )}
    </div>
  );
}
