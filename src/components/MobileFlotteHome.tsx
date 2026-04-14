import { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Smartphone, Monitor, LogOut, Search, RefreshCw, Car, X } from 'lucide-react';
import { MobileVehicleCard } from './MobileVehicleCard';
import { MobileAttributionModal } from './MobileAttributionModal';
import { RestitutionModal } from './RestitutionModal';

interface Chauffeur {
  id: string;
  nom: string;
  prenom: string;
  matricule_tca: string;
  type_attribution: 'principal' | 'secondaire';
}

interface Vehicle {
  id: string;
  immatriculation: string;
  ref_tca: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  statut: string;
  chauffeurs_actifs: Chauffeur[];
  locataire_affiche: string;
  locataire_type: string | null;
  carte_essence_numero: string | null;
  licence_transport_numero: string | null;
}

interface MobileFlotteHomeProps {
  onSwitchToDesktop: () => void;
}

export function MobileFlotteHome({ onSwitchToDesktop }: MobileFlotteHomeProps) {
  const { appUser } = usePermissions();
  const { appUserId, appUserNom, appUserPrenom } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [attributionVehicle, setAttributionVehicle] = useState<Vehicle | null>(null);
  const [showRestitutionModal, setShowRestitutionModal] = useState(false);
  const [restitutionData, setRestitutionData] = useState<any>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_vehicles_list_ui')
        .select('id, immatriculation, ref_tca, marque, modele, annee, statut, chauffeurs_actifs, locataire_affiche, locataire_type, carte_essence_numero, licence_transport_numero')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vehiclesData = (data || []).map(v => ({
        ...v,
        chauffeurs_actifs: Array.isArray(v.chauffeurs_actifs) ? v.chauffeurs_actifs : []
      }));

      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Erreur chargement vehicules mobile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAttribuer = (vehicle: Vehicle) => {
    setAttributionVehicle(vehicle);
  };

  const handleRestituer = async (vehicle: Vehicle) => {
    if (vehicle.statut !== 'chauffeur_tca') {
      alert('Restitution disponible uniquement pour les chauffeurs TCA pour le moment. Les autres types arrivent bientot.');
      return;
    }
    if (!appUserId) {
      alert('Utilisateur non connecte');
      return;
    }
    try {
      const { data: attribution, error } = await supabase
        .from('attribution_vehicule')
        .select(`
          id, vehicule_id, profil_id, km_depart, date_debut,
          signature_chauffeur, signature_admin, attribue_par, created_at,
          profil:profil_id(id, nom, prenom, genre, date_naissance, matricule_tca, secteur:secteur_id(nom)),
          admin:attribue_par(nom, prenom)
        `)
        .eq('vehicule_id', vehicle.id)
        .eq('statut_vehicule', 'chauffeur_tca')
        .is('date_fin', null)
        .maybeSingle();

      if (error || !attribution) {
        alert('Aucune attribution active trouvee pour ce vehicule');
        return;
      }

      const profil: any = attribution.profil;
      const admin: any = attribution.admin;

      setRestitutionData({
        attributionId: attribution.id,
        vehiculeId: vehicle.id,
        immatriculation: vehicle.immatriculation,
        marque: vehicle.marque || '',
        modele: vehicle.modele || '',
        refTca: vehicle.ref_tca || null,
        carteEssence: vehicle.carte_essence_numero || null,
        licenceTransport: vehicle.licence_transport_numero || null,
        profilId: profil?.id || '',
        salarieNom: profil?.nom || '',
        salariePrenom: profil?.prenom || '',
        salarieGenre: profil?.genre || null,
        salarieMatriculeTca: profil?.matricule_tca || null,
        salarieDateNaissance: profil?.date_naissance || null,
        salarieSecteurNom: profil?.secteur?.nom || null,
        kmDepart: attribution.km_depart || 0,
        dateDepart: attribution.date_debut || '',
        signatureChauffeurDepart: attribution.signature_chauffeur || '',
        signatureAdminDepart: attribution.signature_admin || '',
        adminDepartNom: admin?.nom || '',
        adminDepartPrenom: admin?.prenom || '',
        dateDepartResponsable: attribution.created_at || '',
        adminId: appUserId,
        adminNom: appUserNom || '',
        adminPrenom: appUserPrenom || '',
      });
      setShowRestitutionModal(true);
    } catch (e) {
      console.error('Erreur recuperation attribution mobile:', e);
      alert('Erreur lors de la recuperation des donnees');
    }
  };

  const handleAttributionClose = () => {
    setAttributionVehicle(null);
  };

  const handleAttributionSuccess = () => {
    fetchVehicles();
  };

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles;

    const searchLower = search.toLowerCase().trim();
    return vehicles.filter(v => {
      return (
        v.immatriculation?.toLowerCase().includes(searchLower) ||
        v.ref_tca?.toLowerCase().includes(searchLower) ||
        v.marque?.toLowerCase().includes(searchLower) ||
        v.modele?.toLowerCase().includes(searchLower)
      );
    });
  }, [vehicles, search]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium truncate">Flottes-Auto</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {appUser?.prenom} {appUser?.nom}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onSwitchToDesktop}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Basculer en mode Desktop"
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Se deconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher par immat, marque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {loading ? 'Chargement...' : `${filteredVehicles.length} vehicule${filteredVehicles.length > 1 ? 's' : ''}`}
              {search && vehicles.length > filteredVehicles.length && (
                <span className="text-gray-400"> · filtre de {vehicles.length}</span>
              )}
            </p>
            <button
              onClick={fetchVehicles}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Actualiser"
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gray-500">Chargement des vehicules...</p>
          </div>
        )}

        {!loading && filteredVehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">
              {search ? 'Aucun vehicule trouve' : 'Aucun vehicule'}
            </p>
            <p className="text-sm text-gray-500">
              {search
                ? `Aucun resultat pour "${search}"`
                : 'La liste des vehicules est vide.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        )}

        {!loading && filteredVehicles.length > 0 && (
          <>
            {filteredVehicles.map(vehicle => (
              <MobileVehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onAttribuer={handleAttribuer}
                onRestituer={handleRestituer}
              />
            ))}
          </>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">PARC SYNC · Mode Mobile · v0.4</p>
      </div>

      {attributionVehicle && (
        <MobileAttributionModal
          vehicle={{
            id: attributionVehicle.id,
            immatriculation: attributionVehicle.immatriculation,
            marque: attributionVehicle.marque,
            modele: attributionVehicle.modele,
            ref_tca: attributionVehicle.ref_tca,
            carte_essence_numero: attributionVehicle.carte_essence_numero,
            licence_transport_numero: attributionVehicle.licence_transport_numero,
          }}
          onClose={handleAttributionClose}
          onSuccess={handleAttributionSuccess}
        />
      )}

      {showRestitutionModal && restitutionData && (
        <RestitutionModal
          isOpen={showRestitutionModal}
          onClose={() => {
            setShowRestitutionModal(false);
            setRestitutionData(null);
          }}
          onSuccess={async () => {
            setShowRestitutionModal(false);
            setRestitutionData(null);
            await fetchVehicles();
          }}
          {...restitutionData}
        />
      )}
    </div>
  );
}