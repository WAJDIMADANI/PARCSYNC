import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { MapPin, Phone, Mail, Building, User, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  vehicleId: string;
}

const TYPE_LABELS: Record<string, string> = {
  location_pure: '🔄 Location pure',
  location_vente_particulier: '💰 Loc-vente particulier',
  location_vente_societe: '🏢 Loc-vente société',
  loa: '💰 LOA',
};

export function VehicleLocations({ vehicleId }: Props) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [vehicleId]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id, type_location, reference_contrat, date_debut, date_fin, duree_mois,
          montant_mensuel, montant_mensuel_ht, montant_mensuel_ttc,
          montant_total_ht, montant_total_ttc, apport_initial,
          depot_garantie, km_depart, km_inclus, cout_km_supplementaire,
          valeur_residuelle, mensualites_payees, reste_a_payer_ttc,
          statut, notes,
          loueur:locataire_id(id, nom, prenom, type, telephone, email, adresse, siret, permis_numero, permis_validite, date_naissance, nationalite, lieu_naissance)
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
      en_cours:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'En cours' },
      terminee:  { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Terminée' },
      en_retard: { bg: 'bg-red-100',     text: 'text-red-700',     label: 'En retard' },
      annulee:   { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Annulée' },
    };
    const c = config[statut] || { bg: 'bg-gray-100', text: 'text-gray-600', label: statut };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
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
        const loueur = loc.loueur;
        const loueurNom = loueur
          ? loueur.type === 'particulier'
            ? `${loueur.prenom || ''} ${loueur.nom || ''}`.trim()
            : loueur.nom
          : '—';
        const isExpanded = expandedId === loc.id;
        const typeLabel = TYPE_LABELS[loc.type_location] || loc.type_location;
        const isVente = loc.type_location === 'location_vente_particulier' || loc.type_location === 'location_vente_societe';

        return (
          <div key={loc.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Ligne résumé */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : loc.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900">{loueurNom}</span>
                  <span className="text-xs text-gray-500">{typeLabel}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Début : {formatDate(loc.date_debut)}</span>
                  <span>Fin : {formatDate(loc.date_fin)}</span>
                  <span className="font-medium">{loc.montant_mensuel_ttc || loc.montant_mensuel ? `${loc.montant_mensuel_ttc || loc.montant_mensuel} €/mois` : '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatutBadge(loc.statut)}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {/* Détails dépliés */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                {/* Coordonnées locataire */}
                {loueur && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {loueur.type === 'entreprise' ? '🏢 Locataire (Société)' : '👤 Locataire (Particulier)'}
                    </p>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="col-span-2 font-semibold text-gray-900 text-base">
                          {loueur.type === 'particulier' ? `${loueur.prenom || ''} ${loueur.nom}`.trim() : loueur.nom}
                        </div>
                        {(loueur.telephone || loueur.tel) && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{loueur.telephone || loueur.tel}</span>
                          </div>
                        )}
                        {loueur.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 text-xs">{loueur.email}</span>
                          </div>
                        )}
                        {loueur.adresse && (
                          <div className="col-span-2 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            <span className="text-gray-700 text-xs">{loueur.adresse}</span>
                          </div>
                        )}
                        {loueur.siret && (
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 text-xs">SIRET: {loueur.siret}</span>
                          </div>
                        )}
                        {loueur.permis_numero && (
                          <div className="text-xs text-gray-600">Permis : {loueur.permis_numero}{loueur.permis_validite ? ` (val. ${formatDate(loueur.permis_validite)})` : ''}</div>
                        )}
                        {loueur.date_naissance && (
                          <div className="text-xs text-gray-600">Né(e) le : {formatDate(loueur.date_naissance)}{loueur.lieu_naissance ? ` à ${loueur.lieu_naissance}` : ''}{loueur.nationalite ? ` · ${loueur.nationalite}` : ''}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Détails financiers */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">💰 Détails financiers</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {loc.reference_contrat && <div><span className="text-gray-500">Référence :</span> <strong>{loc.reference_contrat}</strong></div>}
                    {loc.duree_mois && <div><span className="text-gray-500">Durée :</span> <strong>{loc.duree_mois} mois</strong></div>}
                    {loc.montant_mensuel_ttc && <div><span className="text-gray-500">Mensualité TTC :</span> <strong>{loc.montant_mensuel_ttc} €</strong></div>}
                    {loc.montant_mensuel_ht && <div><span className="text-gray-500">Mensualité HT :</span> <strong>{loc.montant_mensuel_ht} €</strong></div>}
                    {loc.montant_total_ttc && <div><span className="text-gray-500">Total TTC :</span> <strong className="text-emerald-700">{loc.montant_total_ttc} €</strong></div>}
                    {loc.montant_total_ht && <div><span className="text-gray-500">Total HT :</span> <strong>{loc.montant_total_ht} €</strong></div>}
                    {isVente && loc.apport_initial && <div><span className="text-gray-500">Apport initial :</span> <strong>{loc.apport_initial} €</strong></div>}
                    {!isVente && loc.depot_garantie && <div><span className="text-gray-500">Dépôt garantie :</span> <strong>{loc.depot_garantie} €</strong></div>}
                    {loc.km_depart && <div><span className="text-gray-500">Km départ :</span> <strong>{parseInt(loc.km_depart).toLocaleString()} km</strong></div>}
                    {!isVente && loc.km_inclus && <div><span className="text-gray-500">Km inclus :</span> <strong>{loc.km_inclus} km</strong></div>}
                    {!isVente && loc.valeur_residuelle && <div><span className="text-gray-500">Valeur résiduelle :</span> <strong>{loc.valeur_residuelle} €</strong></div>}
                  </div>
                </div>

                {/* Suivi paiements */}
                {loc.duree_mois && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">📊 Suivi paiements</p>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">{loc.mensualites_payees || 0} / {loc.duree_mois} mensualités payées</span>
                        <span className="font-semibold text-gray-900">Reste : {loc.reste_a_payer_ttc || loc.montant_total_ttc || '—'} €</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${loc.duree_mois > 0 ? Math.min(100, ((loc.mensualites_payees || 0) / loc.duree_mois) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {loc.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                    <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">{loc.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}