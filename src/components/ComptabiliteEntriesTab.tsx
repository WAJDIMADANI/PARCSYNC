import { useState, useEffect } from 'react';
import { Calendar, Download, Users, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface Employee {
  contrat_id: string;
  profil_id: string;
  site_id: string | null;
  signed_at: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string | null;
  profil_statut: string;
  contrat_statut: string;
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
      const startIso = `${dateDebut}T00:00:00.000Z`;

      const endDate = new Date(`${dateFin}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const endExclusiveIso = endDate.toISOString();

      const { data, error } = await supabase
        .from('v_compta_entrees')
        .select('contrat_id, profil_id, site_id, signed_at, nom, prenom, email, poste, profil_statut, contrat_statut')
        .gte('signed_at', startIso)
        .lt('signed_at', endExclusiveIso)
        .order('signed_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      console.error('Erreur chargement entrées:', err);
      alert(err?.message ?? 'Erreur lors du chargement des entrées');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (employees.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = employees.map(emp => ({
      'Nom': emp.nom,
      'Prénom': emp.prenom,
      'Email': emp.email,
      'Poste': emp.poste,
      'Date contrat signé': emp.signed_at ? new Date(emp.signed_at).toLocaleDateString('fr-FR') : '',
      'Statut profil': emp.profil_statut,
      'Statut contrat': emp.contrat_statut
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entrées');
    XLSX.writeFile(wb, `entrees_${dateDebut}_${dateFin}.xlsx`);
  };

  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      emp.nom?.toLowerCase().includes(search) ||
      emp.prenom?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.poste?.toLowerCase().includes(search)
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
                      Poste
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date contrat signé
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.contrat_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.prenom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.poste}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.signed_at ? new Date(emp.signed_at).toLocaleDateString('fr-FR') : '-'}
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
