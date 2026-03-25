import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Car, Search } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { VehicleViewModal } from './VehicleViewModal';

interface Site {
  id: string;
  nom: string;
}

interface Driver {
  id: string;
  prenom: string;
  nom: string;
}

interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  type: string | null;
  statut: string;
  date_mise_en_service: string | null;
  conducteur_actuel_id: string | null;
  site_id: string | null;
  created_at: string;
  conducteur?: Driver;
  site?: Site;
}

export function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicule')
        .select(`
          *,
          conducteur:conducteur_actuel_id(id, prenom, nom),
          site:site_id(id, nom)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Erreur chargement véhicules:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    `${v.immatriculation} ${v.marque || ''} ${v.modele || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des véhicules..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Véhicules</h1>
          <p className="text-gray-600 mt-1">{vehicles.length} véhicule(s) au total</p>
        </div>
      </div>

      <div className="mb-6">
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
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucun véhicule trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              onClick={() => setSelectedVehicleId(vehicle.id)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vehicle.immatriculation}
                    </h3>
                    {vehicle.marque && vehicle.modele && (
                      <p className="text-sm text-gray-600">
                        {vehicle.marque} {vehicle.modele}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  vehicle.statut === 'actif'
                    ? 'bg-green-100 text-green-700'
                    : vehicle.statut === 'maintenance'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {vehicle.statut}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {vehicle.type && (
                  <div className="flex items-center">
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{vehicle.type}</span>
                  </div>
                )}
                {vehicle.annee && (
                  <div className="flex items-center">
                    <span className="font-medium">Année:</span>
                    <span className="ml-2">{vehicle.annee}</span>
                  </div>
                )}
                {vehicle.conducteur && (
                  <div className="flex items-center">
                    <span className="font-medium">Conducteur:</span>
                    <span className="ml-2">{vehicle.conducteur.prenom} {vehicle.conducteur.nom}</span>
                  </div>
                )}
                {vehicle.site && (
                  <div className="flex items-center">
                    <span className="font-medium">Site:</span>
                    <span className="ml-2">{vehicle.site.nom}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVehicleId && (
        <VehicleViewModal
          vehicleId={selectedVehicleId}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}
    </div>
  );
}
