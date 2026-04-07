import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { MapPin } from 'lucide-react';

interface Props {
  vehicleId: string;
}

export function VehicleLocations({ vehicleId }: Props) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, [vehicleId]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id,
          type_location,
          date_debut,
          date_fin,
          montant_mensuel,
          depot_garantie,
          statut,
          notes,
          loueur:locataire_id(id, nom, prenom, type, telephone, email)
        `)
        .eq('vehicule_id', vehicleId)
        .order('date_debut', { ascending: false });
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Erreur chargement locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      'en_cours':  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'En cours' },
      'terminee':  { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Terminée' },
      'en_retard': { bg: 'bg-red-100',     text: 'text-red-700',     label: 'En retard' },
      'annulee':   { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Annulée' },
    };
    const c = config[statut] || { bg: 'bg-gray-100', text: 'text-gray-600', label: statut };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Aucune location enregistrée</p>
        <p className="text-gray-400 text-sm mt-1">Les locations apparaîtront ici après création via la page Locations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.map((loc) => {
        const loueurNom = loc.loueur
          ? loc.loueur.type === 'particulier'
            ? `${loc.loueur.prenom || ''} ${loc.loueur.nom || ''}`.trim()
            : loc.loueur.nom
          : '—';
        return (
          <div key={loc.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{loueurNom}</span>
                <span className="text-xs text-gray-500">{loc.type_location === 'location_pure' ? '🔄 Location pure' : '💰 LOA'}</span>
              </div>
              {getStatutBadge(loc.statut)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-medium">Début :</span> {loc.date_debut}</div>
              <div><span className="font-medium">Fin :</span> {loc.date_fin || '—'}</div>
              <div><span className="font-medium">Mensuel :</span> {loc.montant_mensuel ? `${loc.montant_mensuel} €` : '—'}</div>
              <div><span className="font-medium">Dépôt :</span> {loc.depot_garantie ? `${loc.depot_garantie} €` : '—'}</div>
            </div>
            {loc.notes && <p className="text-xs text-gray-400 mt-2">{loc.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}
