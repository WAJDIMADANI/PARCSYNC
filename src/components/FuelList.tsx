import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Fuel, Search, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface Vehicle {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

interface Driver {
  prenom: string;
  nom: string;
}

interface FuelRecord {
  id: string;
  vehicule_id: string;
  conducteur_id: string;
  date_plein: string;
  litres: number | null;
  montant: number | null;
  kilometrage: number | null;
  station: string | null;
  type_carburant: string | null;
  created_at: string;
  vehicule?: Vehicle;
  conducteur?: Driver;
}

interface FuelStats {
  total_litres: number;
  total_montant: number;
  nombre_pleins: number;
  cout_moyen: number;
}

export function FuelList() {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [stats, setStats] = useState<FuelStats>({ total_litres: 0, total_montant: 0, nombre_pleins: 0, cout_moyen: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    fetchFuelRecords();
  }, [filterMonth]);

  const fetchFuelRecords = async () => {
    try {
      let query = supabase
        .from('carburant')
        .select(`
          *,
          vehicule:vehicule_id(immatriculation, marque, modele),
          conducteur:conducteur_id(prenom, nom)
        `)
        .order('date_plein', { ascending: false });

      if (filterMonth) {
        const startDate = new Date(filterMonth + '-01');
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        query = query.gte('date_plein', startDate.toISOString().split('T')[0])
                    .lte('date_plein', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFuelRecords(data || []);

      const totalLitres = data?.reduce((sum, r) => sum + (r.litres || 0), 0) || 0;
      const totalMontant = data?.reduce((sum, r) => sum + (r.montant || 0), 0) || 0;
      const nombrePleins = data?.length || 0;

      setStats({
        total_litres: totalLitres,
        total_montant: totalMontant,
        nombre_pleins: nombrePleins,
        cout_moyen: nombrePleins > 0 ? totalMontant / nombrePleins : 0
      });
    } catch (error) {
      console.error('Erreur chargement carburant:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = fuelRecords.filter(r =>
    `${r.vehicule?.immatriculation || ''} ${r.station || ''} ${r.conducteur?.prenom || ''} ${r.conducteur?.nom || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Carburant</h1>
        <p className="text-gray-600 mt-1">{fuelRecords.length} enregistrement(s)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pleins total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.nombre_pleins}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Fuel className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Litres total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_litres.toFixed(1)} L</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Coût total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_montant.toFixed(2)} €</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Coût moyen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cout_moyen.toFixed(2)} €</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun enregistrement trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Véhicule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conducteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Litres
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kilométrage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date_plein).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.vehicule?.immatriculation || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.conducteur ? `${record.conducteur.prenom} ${record.conducteur.nom}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {record.type_carburant || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.litres ? `${record.litres} L` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.montant ? `${record.montant.toFixed(2)} €` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {record.kilometrage ? `${record.kilometrage.toLocaleString()} km` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {record.station || '-'}
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
