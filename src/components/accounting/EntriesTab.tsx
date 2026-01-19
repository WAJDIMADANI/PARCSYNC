import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, X, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface Employee {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
  site: string;
  date_contrat_signe: string;
}

export default function EntriesTab() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = async () => {
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une plage de dates');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('profil')
        .select('id, matricule:matricule_tca, nom, prenom, email, telephone, poste, site, date_contrat_signe')
        .eq('statut', 'actif');

      if (dateDebut) {
        query = query.gte('date_contrat_signe', dateDebut);
      }
      if (dateFin) {
        query = query.lte('date_contrat_signe', dateFin);
      }

      const { data, error } = await query.order('date_contrat_signe', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Erreur chargement entrées:', err);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (employees.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const data = employees.map(emp => ({
      'Matricule': emp.matricule,
      'Nom': emp.nom,
      'Prénom': emp.prenom,
      'Email': emp.email,
      'Téléphone': emp.telephone,
      'Poste': emp.poste,
      'Site': emp.site,
      'Date d\'embauche': emp.date_contrat_signe,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entrées');

    const fileName = `Entrees_${dateDebut}_${dateFin}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="px-0 py-0">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Nouvelles embauches</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <div className="flex items-center">
                  <Calendar className="absolute w-4 h-4 text-gray-400 ml-3" />
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <div className="flex items-center">
                  <Calendar className="absolute w-4 h-4 text-gray-400 ml-3" />
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={fetchEntries}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  Rechercher
                </button>
                {(dateDebut || dateFin) && (
                  <button
                    onClick={() => {
                      setDateDebut('');
                      setDateFin('');
                      setEmployees([]);
                    }}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {employees.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter en Excel ({employees.length})
          </button>
        </div>
      )}

      {employees.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Matricule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Prénom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Poste</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date d'embauche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{emp.matricule}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{emp.nom}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{emp.prenom}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.telephone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.poste}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.site}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {emp.date_contrat_signe ? new Date(emp.date_contrat_signe).toLocaleDateString('fr-FR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">
            {loading ? 'Chargement...' : 'Sélectionnez une plage de dates et cliquez sur "Rechercher" pour voir les entrées'}
          </p>
        </div>
      )}
    </div>
  );
}
