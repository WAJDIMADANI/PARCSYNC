import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Search, DollarSign, X, Calendar, MapPin } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Vehicle {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

interface Driver {
  prenom: string;
  nom: string;
}

interface Fine {
  id: string;
  vehicule_id: string;
  conducteur_id: string | null;
  date_infraction: string;
  type_infraction: string;
  montant: number;
  points_permis: number;
  lieu: string | null;
  statut: string;
  date_paiement: string | null;
  pris_en_charge_par: string | null;
  numero_avis: string | null;
  notes: string | null;
  created_at: string;
  vehicule?: Vehicle;
  conducteur?: Driver;
}

interface FineStats {
  total_amendes: number;
  total_montant: number;
  total_points: number;
  amendes_impayees: number;
}

export function FinesList() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [stats, setStats] = useState<FineStats>({ total_amendes: 0, total_montant: 0, total_points: 0, amendes_impayees: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchFines();
  }, [filterStatus]);

  const fetchFines = async () => {
    try {
      let query = supabase
        .from('amende')
        .select(`
          *,
          vehicule:vehicule_id(immatriculation, marque, modele),
          conducteur:conducteur_id(prenom, nom)
        `)
        .order('date_infraction', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('statut', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFines(data || []);

      const totalMontant = data?.reduce((sum, f) => sum + (f.montant || 0), 0) || 0;
      const totalPoints = data?.reduce((sum, f) => sum + (f.points_permis || 0), 0) || 0;
      const amendesImpayees = data?.filter(f => f.statut === 'pending').length || 0;

      setStats({
        total_amendes: data?.length || 0,
        total_montant: totalMontant,
        total_points: totalPoints,
        amendes_impayees: amendesImpayees
      });
    } catch (error) {
      console.error('Erreur chargement amendes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFines = fines.filter(f =>
    `${f.vehicule?.immatriculation || ''} ${f.type_infraction} ${f.conducteur?.prenom || ''} ${f.conducteur?.nom || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des amendes..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Amendes</h1>
        <p className="text-gray-600 mt-1">{fines.length} amende(s) au total</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total amendes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_amendes}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Impayées</p>
              <p className="text-2xl font-bold text-orange-600">{stats.amendes_impayees}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Montant total</p>
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
              <p className="text-sm text-gray-600">Points retirés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_points}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher une amende..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="payee">Payée</option>
          <option value="contestee">Contestée</option>
          <option value="annulee">Annulée</option>
        </select>
      </div>

      {filteredFines.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Aucune amende trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFines.map((fine) => (
            <div
              key={fine.id}
              onClick={() => setSelectedFine(fine)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {fine.vehicule?.immatriculation || '-'}
                    </h3>
                    <p className="text-sm text-gray-600">{fine.type_infraction}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  fine.statut === 'pending'
                    ? 'bg-orange-100 text-orange-700'
                    : fine.statut === 'payee'
                    ? 'bg-green-100 text-green-700'
                    : fine.statut === 'contestee'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {fine.statut}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant:</span>
                  <span className="font-semibold text-gray-900">{fine.montant.toFixed(2)} €</span>
                </div>
                {fine.points_permis > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points:</span>
                    <span className="font-semibold text-red-600">-{fine.points_permis}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="text-gray-900">{new Date(fine.date_infraction).toLocaleDateString('fr-FR')}</span>
                </div>
                {fine.conducteur && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conducteur:</span>
                    <span className="text-gray-900">{fine.conducteur.prenom} {fine.conducteur.nom}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFine && (
        <FineDetailModal
          fine={selectedFine}
          onClose={() => setSelectedFine(null)}
        />
      )}
    </div>
  );
}

function FineDetailModal({ fine, onClose }: { fine: Fine; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Amende - {fine.vehicule?.immatriculation}
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
              fine.statut === 'pending'
                ? 'bg-orange-100 text-orange-700'
                : fine.statut === 'payee'
                ? 'bg-green-100 text-green-700'
                : fine.statut === 'contestee'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {fine.statut}
            </span>
            {fine.pris_en_charge_par && (
              <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                Pris en charge: {fine.pris_en_charge_par}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Infraction</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="text-gray-900 font-medium">{fine.type_infraction}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className="text-2xl font-bold text-gray-900">{fine.montant.toFixed(2)} €</p>
                </div>
                {fine.points_permis > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Points de permis</p>
                    <p className="text-xl font-bold text-red-600">-{fine.points_permis}</p>
                  </div>
                )}
                {fine.numero_avis && (
                  <div>
                    <p className="text-sm text-gray-500">Numéro d'avis</p>
                    <p className="text-gray-900 font-mono">{fine.numero_avis}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Détails</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Date infraction</p>
                    <p className="text-gray-900">{new Date(fine.date_infraction).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                {fine.lieu && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Lieu</p>
                      <p className="text-gray-900">{fine.lieu}</p>
                    </div>
                  </div>
                )}
                {fine.vehicule && (
                  <div>
                    <p className="text-sm text-gray-500">Véhicule</p>
                    <p className="text-gray-900">
                      {fine.vehicule.immatriculation}
                      {fine.vehicule.marque && ` - ${fine.vehicule.marque} ${fine.vehicule.modele || ''}`}
                    </p>
                  </div>
                )}
                {fine.conducteur && (
                  <div>
                    <p className="text-sm text-gray-500">Conducteur</p>
                    <p className="text-gray-900">{fine.conducteur.prenom} {fine.conducteur.nom}</p>
                  </div>
                )}
                {fine.date_paiement && (
                  <div>
                    <p className="text-sm text-gray-500">Date de paiement</p>
                    <p className="text-gray-900">{new Date(fine.date_paiement).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {fine.notes && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-3">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{fine.notes}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID:</span> {fine.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
