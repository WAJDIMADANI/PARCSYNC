import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, RefreshCw, MapPin, Calendar, Euro, User, Building, ArrowLeft, ArrowRight, CheckCircle, X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Location {
  id: string;
  vehicule_id: string;
  locataire_id: string | null;
  type_location: 'location_pure' | 'loa';
  date_debut: string;
  date_fin: string | null;
  montant_mensuel: number | null;
  depot_garantie: number | null;
  statut: 'en_cours' | 'terminee' | 'en_retard' | 'annulee';
  notes: string | null;
  created_at: string;
  vehicule?: { immatriculation: string; marque: string; modele: string; };
  locataire?: { nom: string; prenom: string | null; type: string; };
}

interface Locataire {
  id: string;
  type: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  permis_numero: string | null;
  permis_validite: string | null;
  date_naissance: string | null;
}

interface Props {
  onNavigate?: (view: string, params?: any) => void;
  viewParams?: any;
}

export function LocationsManager({ onNavigate, viewParams }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form data
  const [vehiculeId, setVehiculeId] = useState('');
  const [vehiculeImmat, setVehiculeImmat] = useState('');
  const [typeLocataire, setTypeLocataire] = useState<'particulier' | 'entreprise'>('particulier');
  const [searchLocataire, setSearchLocataire] = useState('');
  const [locataireExistant, setLocataireExistant] = useState<Locataire | null>(null);
  const [locatairesRecherche, setLocatairesRecherche] = useState<Locataire[]>([]);

  // Nouveau locataire
  const [newLocataire, setNewLocataire] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    date_naissance: '',
    permis_numero: '',
    permis_validite: ''
  });

  // Contrat
  const [typeLocation, setTypeLocation] = useState<'location_pure' | 'loa'>('location_pure');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState('');
  const [montantMensuel, setMontantMensuel] = useState('');
  const [depotGarantie, setDepotGarantie] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (viewParams?.vehiculeId) {
      setVehiculeId(viewParams.vehiculeId);
      setVehiculeImmat(viewParams.vehiculeImmat || '');
      if (viewParams.typeLocation === 'location_pure' || viewParams.typeLocation === 'loa') {
        setTypeLocation(viewParams.typeLocation);
      }
      setView('form');
    }
  }, [viewParams]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          vehicule:vehicule_id(immatriculation, marque, modele),
          locataire:locataire_id(nom, prenom, type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const rechercherLocataires = async (query: string) => {
    if (!query || query.length < 2) {
      setLocatairesRecherche([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locataire_externe')
        .select('*')
        .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%`)
        .eq('type', typeLocataire)
        .limit(5);

      if (error) throw error;
      setLocatairesRecherche(data || []);
    } catch (error) {
      console.error('Erreur recherche locataires:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      rechercherLocataires(searchLocataire);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchLocataire, typeLocataire]);

  const handleNouvelleLocation = () => {
    setView('form');
    setStep(1);
    resetForm();
  };

  const resetForm = () => {
    if (!viewParams?.vehiculeId) {
      setVehiculeId('');
      setVehiculeImmat('');
    }
    setTypeLocataire('particulier');
    setSearchLocataire('');
    setLocataireExistant(null);
    setLocatairesRecherche([]);
    setNewLocataire({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      adresse: '',
      date_naissance: '',
      permis_numero: '',
      permis_validite: ''
    });
    setTypeLocation(viewParams?.typeLocation || 'location_pure');
    setDateDebut(new Date().toISOString().split('T')[0]);
    setDateFin('');
    setMontantMensuel('');
    setDepotGarantie('');
    setNotes('');
  };

  const handleRetourListe = () => {
    setView('list');
    setStep(1);
    resetForm();
    setSuccessMessage('');
  };

  const handleNextStep = () => {
    if (step === 1 && !vehiculeImmat) {
      alert('Veuillez saisir une immatriculation');
      return;
    }
    if (step === 1 && !locataireExistant && !newLocataire.nom) {
      alert('Veuillez sélectionner ou créer un locataire');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreerLocation = async () => {
    setSaving(true);
    try {
      let locataireId = locataireExistant?.id;

      if (!locataireId && newLocataire.nom) {
        const { data: newLoc, error: locError } = await supabase
          .from('locataire_externe')
          .insert({
            type: typeLocataire,
            nom: newLocataire.nom,
            prenom: typeLocataire === 'particulier' ? newLocataire.prenom : null,
            telephone: newLocataire.telephone || null,
            email: newLocataire.email || null,
            adresse: newLocataire.adresse || null,
            date_naissance: typeLocataire === 'particulier' ? newLocataire.date_naissance || null : null,
            permis_numero: typeLocataire === 'particulier' ? newLocataire.permis_numero || null : null,
            permis_validite: typeLocataire === 'particulier' ? newLocataire.permis_validite || null : null
          })
          .select()
          .single();

        if (locError) throw locError;
        locataireId = newLoc.id;
      }

      const { error: locationError } = await supabase
        .from('locations')
        .insert({
          vehicule_id: vehiculeId,
          locataire_id: locataireId,
          type_location: typeLocation,
          date_debut: dateDebut,
          date_fin: dateFin || null,
          montant_mensuel: montantMensuel ? parseFloat(montantMensuel) : null,
          depot_garantie: depotGarantie ? parseFloat(depotGarantie) : null,
          statut: 'en_cours',
          notes: notes || null
        });

      if (locationError) throw locationError;

      setSuccessMessage('Location créée avec succès');
      await fetchLocations();
      setTimeout(() => {
        handleRetourListe();
      }, 2000);
    } catch (error) {
      console.error('Erreur création location:', error);
      alert('Erreur lors de la création de la location');
    } finally {
      setSaving(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      en_cours: 'bg-green-100 text-green-800',
      terminee: 'bg-gray-100 text-gray-800',
      en_retard: 'bg-red-100 text-red-800',
      annulee: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      en_cours: 'En cours',
      terminee: 'Terminée',
      en_retard: 'En retard',
      annulee: 'Annulée'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[statut as keyof typeof badges] || badges.en_cours}`}>
        {labels[statut as keyof typeof labels] || statut}
      </span>
    );
  };

  const filteredLocations = locations.filter(loc => {
    const searchLower = search.toLowerCase();
    return (
      loc.vehicule?.immatriculation?.toLowerCase().includes(searchLower) ||
      loc.locataire?.nom?.toLowerCase().includes(searchLower) ||
      loc.locataire?.prenom?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (view === 'list') {
    return (
      <div className="space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <button
            onClick={handleNouvelleLocation}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle location
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par véhicule ou locataire..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={fetchLocations}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Actualiser
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Aucune location trouvée
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {location.vehicule?.immatriculation || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {location.vehicule?.marque} {location.vehicule?.modele}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">
                          {location.locataire?.nom} {location.locataire?.prenom || ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          {location.locataire?.type === 'particulier' ? 'Particulier' : 'Entreprise'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.type_location === 'location_pure' ? 'Location pure' : 'LOA'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(location.date_debut).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.date_fin ? new Date(location.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.montant_mensuel ? `${location.montant_mensuel.toFixed(2)} €/mois` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatutBadge(location.statut)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-800 mr-3">
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRetourListe}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle location</h1>
        </div>
        <div className="text-sm font-medium text-gray-600">
          Étape {step} / 3
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Véhicule et Locataire</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Immatriculation du véhicule
              </label>
              <input
                type="text"
                value={vehiculeImmat}
                onChange={(e) => setVehiculeImmat(e.target.value)}
                disabled={!!viewParams?.vehiculeId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="AA-123-BB"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de locataire
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setTypeLocataire('particulier')}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 ${
                    typeLocataire === 'particulier'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Particulier
                </button>
                <button
                  onClick={() => setTypeLocataire('entreprise')}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 ${
                    typeLocataire === 'entreprise'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Building className="h-5 w-5 mr-2" />
                  Entreprise
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un locataire existant
              </label>
              <input
                type="text"
                value={searchLocataire}
                onChange={(e) => setSearchLocataire(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom, prénom ou email..."
              />
              {locatairesRecherche.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg divide-y">
                  {locatairesRecherche.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setLocataireExistant(loc);
                        setSearchLocataire('');
                        setLocatairesRecherche([]);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {loc.nom} {loc.prenom || ''}
                        </div>
                        <div className="text-sm text-gray-500">{loc.email || loc.telephone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {locataireExistant && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {locataireExistant.nom} {locataireExistant.prenom || ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {locataireExistant.email || locataireExistant.telephone}
                    </div>
                  </div>
                  <button
                    onClick={() => setLocataireExistant(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {!locataireExistant && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Créer un nouveau locataire
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {typeLocataire === 'particulier' ? 'Nom' : 'Raison sociale'}
                    </label>
                    <input
                      type="text"
                      value={newLocataire.nom}
                      onChange={(e) => setNewLocataire({ ...newLocataire, nom: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {typeLocataire === 'particulier' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={newLocataire.prenom}
                        onChange={(e) => setNewLocataire({ ...newLocataire, prenom: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={newLocataire.telephone}
                      onChange={(e) => setNewLocataire({ ...newLocataire, telephone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newLocataire.email}
                      onChange={(e) => setNewLocataire({ ...newLocataire, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={newLocataire.adresse}
                      onChange={(e) => setNewLocataire({ ...newLocataire, adresse: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {typeLocataire === 'particulier' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de naissance
                        </label>
                        <input
                          type="date"
                          value={newLocataire.date_naissance}
                          onChange={(e) => setNewLocataire({ ...newLocataire, date_naissance: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Numéro de permis
                        </label>
                        <input
                          type="text"
                          value={newLocataire.permis_numero}
                          onChange={(e) => setNewLocataire({ ...newLocataire, permis_numero: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Validité du permis
                        </label>
                        <input
                          type="date"
                          value={newLocataire.permis_validite}
                          onChange={(e) => setNewLocataire({ ...newLocataire, permis_validite: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Termes du contrat</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de location
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setTypeLocation('location_pure')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    typeLocation === 'location_pure'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Location pure
                </button>
                <button
                  onClick={() => setTypeLocation('loa')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    typeLocation === 'loa'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  LOA
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin (optionnel)
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant mensuel (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montantMensuel}
                  onChange={(e) => setMontantMensuel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dépôt de garantie (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depotGarantie}
                  onChange={(e) => setDepotGarantie(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirmation</h2>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Véhicule</h3>
                <p className="text-lg font-medium text-gray-900">{vehiculeImmat}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Locataire</h3>
                {locataireExistant ? (
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {locataireExistant.nom} {locataireExistant.prenom || ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      {locataireExistant.type === 'particulier' ? 'Particulier' : 'Entreprise'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {newLocataire.nom} {newLocataire.prenom}
                    </p>
                    <p className="text-sm text-gray-600">
                      {typeLocataire === 'particulier' ? 'Particulier' : 'Entreprise'} (Nouveau)
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Type de location</h3>
                <p className="text-lg font-medium text-gray-900">
                  {typeLocation === 'location_pure' ? 'Location pure' : 'LOA'}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date de début</h3>
                  <p className="text-gray-900">{new Date(dateDebut).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date de fin</h3>
                  <p className="text-gray-900">
                    {dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : 'Indéterminée'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Montant mensuel</h3>
                  <p className="text-gray-900">
                    {montantMensuel ? `${parseFloat(montantMensuel).toFixed(2)} €` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Dépôt de garantie</h3>
                  <p className="text-gray-900">
                    {depotGarantie ? `${parseFloat(depotGarantie).toFixed(2)} €` : 'Non renseigné'}
                  </p>
                </div>
              </div>

              {notes && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={step === 1 ? handleRetourListe : handlePrevStep}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {step === 1 ? 'Annuler' : 'Précédent'}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Suivant
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleCreerLocation}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Créer la location
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
