import { Car, User } from 'lucide-react';

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
}

interface MobileVehicleCardProps {
  vehicle: Vehicle;
  onAttribuer: (vehicle: Vehicle) => void;
  onRestituer: (vehicle: Vehicle) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  sur_parc:                { bg: 'bg-gray-200',    text: 'text-gray-800', label: '🅿 Sur parc' },
  chauffeur_tca:           { bg: 'bg-blue-500',    text: 'text-white',    label: '👤 Chauffeur TCA' },
  direction_administratif: { bg: 'bg-blue-800',    text: 'text-white',    label: '🏢 Direction' },
  location_pure:           { bg: 'bg-emerald-500', text: 'text-white',    label: '🔄 Location pure' },
loa:                     { bg: 'bg-purple-500',  text: 'text-white',    label: '💰 LOA' },
  location_vente_particulier: { bg: 'bg-purple-500', text: 'text-white', label: '💰 Loc-vente particulier' },
  location_vente_societe:     { bg: 'bg-indigo-500', text: 'text-white', label: '🏢 Loc-vente société' },
  en_pret:                 { bg: 'bg-cyan-500',    text: 'text-white',    label: '🤝 En prêt' },
  en_garage:               { bg: 'bg-amber-500',   text: 'text-white',    label: '🛠 En garage' },
  hors_service:            { bg: 'bg-red-500',     text: 'text-white',    label: '🚫 Hors service' },
  sorti_flotte:            { bg: 'bg-gray-700',    text: 'text-white',    label: '📦 Sorti de flotte' },
};

const STATUTS_ATTRIBUABLES = ['sur_parc'];
const STATUTS_RESTITUABLES = ['chauffeur_tca', 'direction_administratif', 'location_pure', 'loa', 'en_pret'];

export function MobileVehicleCard({ vehicle, onAttribuer, onRestituer }: MobileVehicleCardProps) {
  const statusConfig = STATUS_STYLES[vehicle.statut] || { bg: 'bg-gray-400', text: 'text-white', label: vehicle.statut };

  const canAttribuer = STATUTS_ATTRIBUABLES.includes(vehicle.statut);
  const canRestituer = STATUTS_RESTITUABLES.includes(vehicle.statut);

  const getAttributeTo = (): string | null => {
    if (vehicle.statut === 'location_pure' || vehicle.statut === 'loa') {
      return vehicle.locataire_affiche && vehicle.locataire_affiche !== 'Non attribué' && vehicle.locataire_affiche !== 'TCA'
        ? vehicle.locataire_affiche
        : null;
    }
    if (vehicle.statut === 'chauffeur_tca' || vehicle.statut === 'direction_administratif' || vehicle.statut === 'en_pret') {
      if (vehicle.chauffeurs_actifs && vehicle.chauffeurs_actifs.length > 0) {
        const c = vehicle.chauffeurs_actifs[0];
        return `${c.prenom || ''} ${c.nom || ''}`.trim();
      }
    }
    return null;
  };

  const attributedTo = getAttributeTo();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xl font-bold text-gray-900 tracking-wide">{vehicle.immatriculation}</p>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-700 font-medium">
          {vehicle.marque || '—'} {vehicle.modele || ''}
          {vehicle.annee && <span className="text-gray-500"> · {vehicle.annee}</span>}
        </p>
        {vehicle.ref_tca && (
          <p className="text-xs text-gray-500 mt-0.5">Réf. TCA : {vehicle.ref_tca}</p>
        )}
      </div>

      <div className="border-t border-gray-100 pt-3 mb-3">
        {attributedTo ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-gray-900 font-medium truncate">{attributedTo}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Aucune attribution active</p>
        )}
      </div>

      {canAttribuer && (
        <button
          onClick={() => onAttribuer(vehicle)}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-lg transition-colors text-sm shadow-sm"
        >
          Attribuer ce véhicule
        </button>
      )}

      {canRestituer && (
        <button
          onClick={() => onRestituer(vehicle)}
          className="w-full py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium rounded-lg transition-colors text-sm shadow-sm"
        >
          Restituer ce véhicule
        </button>
      )}

      {!canAttribuer && !canRestituer && (
        <div className="w-full py-2 text-center text-xs text-gray-400 italic">
          Aucune action disponible pour ce statut
        </div>
      )}
    </div>
  );
}