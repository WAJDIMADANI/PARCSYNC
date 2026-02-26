import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, User, Building2, Users, Clock, History } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Attribution {
  id: string;
  date_debut: string;
  date_fin: string | null;
  type_attribution: 'principal' | 'secondaire' | null;
  notes: string | null;
  profil: {
    id: string;
    nom: string;
    prenom: string;
    matricule_tca: string;
  } | null;
  loueur: {
    id: string;
    nom: string;
    type: 'personne' | 'entreprise';
    contact?: string;
    telephone?: string;
    siret?: string;
  } | null;
}

interface Props {
  vehicleId: string;
  immatriculation: string;
  onClose: () => void;
}

export function AttributionHistoryModal({ vehicleId, immatriculation, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [attributions, setAttributions] = useState<Attribution[]>([]);

  useEffect(() => {
    fetchAttributions();
  }, [vehicleId]);

  const fetchAttributions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attribution_vehicule')
        .select(`
          id,
          date_debut,
          date_fin,
          type_attribution,
          notes,
          profil:profil_id (
            id,
            nom,
            prenom,
            matricule_tca
          ),
          loueur:loueur_id (
            id,
            nom,
            type,
            contact,
            telephone,
            siret
          )
        `)
        .eq('vehicule_id', vehicleId)
        .order('date_debut', { ascending: false });

      if (error) throw error;

      setAttributions(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (attribution: Attribution) => {
    const now = new Date();
    const debut = new Date(attribution.date_debut);
    const fin = attribution.date_fin ? new Date(attribution.date_fin) : null;

    return debut <= now && (!fin || fin >= now);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTypeLabel = (attribution: Attribution) => {
    if (!attribution.loueur) {
      return attribution.type_attribution === 'principal' ? 'Attribution principale' : 'Attribution secondaire';
    }
    return attribution.loueur.type === 'personne' ? 'Personne externe' : 'Entreprise externe';
  };

  const getTypeColor = (attribution: Attribution) => {
    if (!attribution.loueur) {
      return attribution.type_attribution === 'principal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
    }
    return attribution.loueur.type === 'personne' ? 'bg-orange-100 text-orange-800' : 'bg-teal-100 text-teal-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Historique des attributions</h2>
              <p className="text-sm text-gray-200">{immatriculation}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : attributions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune attribution enregistrée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attributions.map((attribution) => {
                const active = isActive(attribution);
                return (
                  <div
                    key={attribution.id}
                    className={`border rounded-lg p-4 transition-all ${
                      active
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(attribution)}`}>
                          {getTypeLabel(attribution)}
                        </span>
                        {active && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            En cours
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(attribution.date_debut)}
                        {attribution.date_fin && (
                          <>
                            <span>→</span>
                            {formatDate(attribution.date_fin)}
                          </>
                        )}
                        {!attribution.date_fin && (
                          <>
                            <span>→</span>
                            <span className="text-green-600 font-medium">En cours</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {attribution.profil && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">
                            {attribution.profil.prenom} {attribution.profil.nom}
                          </span>
                          {attribution.profil.matricule_tca && (
                            <span className="text-sm text-gray-500">
                              (TCA: {attribution.profil.matricule_tca})
                            </span>
                          )}
                        </div>
                      )}

                      {attribution.loueur && (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            {attribution.loueur.type === 'personne' ? (
                              <User className="w-4 h-4 text-orange-600" />
                            ) : (
                              <Building2 className="w-4 h-4 text-teal-600" />
                            )}
                            <span className="font-medium">{attribution.loueur.nom}</span>
                          </div>
                          {attribution.loueur.contact && (
                            <div className="text-sm text-gray-600 pl-6">
                              Contact: {attribution.loueur.contact}
                            </div>
                          )}
                          {attribution.loueur.telephone && (
                            <div className="text-sm text-gray-600 pl-6">
                              Téléphone: {attribution.loueur.telephone}
                            </div>
                          )}
                          {attribution.loueur.siret && (
                            <div className="text-sm text-gray-600 pl-6">
                              SIRET: {attribution.loueur.siret}
                            </div>
                          )}
                        </div>
                      )}

                      {attribution.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{attribution.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
