import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Car, Search, X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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
              onClick={() => setSelectedVehicle(vehicle)}
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

      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}

function VehicleDetailModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {vehicle.immatriculation}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              vehicle.statut === 'actif'
                ? 'bg-green-100 text-green-700'
                : vehicle.statut === 'maintenance'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {vehicle.statut}
            </span>
            {vehicle.type && (
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                {vehicle.type}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Informations véhicule</h3>
              <div className="space-y-3">
                {vehicle.marque && (
                  <div>
                    <p className="text-sm text-gray-500">Marque</p>
                    <p className="text-gray-900 font-medium">{vehicle.marque}</p>
                  </div>
                )}
                {vehicle.modele && (
                  <div>
                    <p className="text-sm text-gray-500">Modèle</p>
                    <p className="text-gray-900 font-medium">{vehicle.modele}</p>
                  </div>
                )}
                {vehicle.annee && (
                  <div>
                    <p className="text-sm text-gray-500">Année</p>
                    <p className="text-gray-900 font-medium">{vehicle.annee}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Affectation</h3>
              <div className="space-y-3">
                {vehicle.conducteur && (
                  <div>
                    <p className="text-sm text-gray-500">Conducteur actuel</p>
                    <p className="text-gray-900 font-medium">
                      {vehicle.conducteur.prenom} {vehicle.conducteur.nom}
                    </p>
                  </div>
                )}
                {vehicle.site && (
                  <div>
                    <p className="text-sm text-gray-500">Site</p>
                    <p className="text-gray-900 font-medium">{vehicle.site.nom}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {vehicle.date_mise_en_service && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-4">Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Mise en service</p>
                  <p className="text-gray-900">{new Date(vehicle.date_mise_en_service).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID:</span> {vehicle.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
