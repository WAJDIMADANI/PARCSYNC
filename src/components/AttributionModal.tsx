import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronRight, ChevronLeft, AlertTriangle, Check, Users, User, Building2 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import LocataireExterneSelector from './LocataireExterneSelector';

interface Profil {
  id: string;
  nom: string;
  prenom: string;
  matricule_tca: string;
  statut: string;
}

interface Loueur {
  id: string;
  nom: string;
  actif: boolean;
}

interface LoueurExterne {
  id: string;
  nom: string;
  contact: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  siret: string | null;
}

interface Props {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type LocataireType = 'salarie' | 'personne_externe' | 'entreprise_externe' | null;

export function AttributionModal({ vehicleId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [locataireType, setLocataireType] = useState<LocataireType>(null);

  // Pour salarié TCA
  const [profils, setProfils] = useState<Profil[]>([]);
  const [loueurs, setLoueurs] = useState<Loueur[]>([]);
  const [searchChauffeur, setSearchChauffeur] = useState('');
  const [selectedProfilId, setSelectedProfilId] = useState('');
  const [selectedLoueurId, setSelectedLoueurId] = useState<string>('');
  const [typeAttribution, setTypeAttribution] = useState<'principal' | 'secondaire'>('principal');

  // Pour locataire externe
  const [selectedLoueurExterne, setSelectedLoueurExterne] = useState<LoueurExterne | null>(null);

  // Commun
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState('');
  const [notes, setNotes] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  useEffect(() => {
    if (locataireType) {
      fetchData();
    }
  }, [locataireType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilsRes, loueursRes] = await Promise.all([
        supabase
          .from('profil')
          .select('id, nom, prenom, matricule_tca, statut')
          .in('statut', ['actif', 'En attente'])
          .order('nom', { ascending: true }),
        supabase
          .from('loueur')
          .select('*')
          .eq('actif', true)
          .order('nom', { ascending: true })
      ]);

      if (profilsRes.error) throw profilsRes.error;
      if (loueursRes.error) throw loueursRes.error;

      setProfils(profilsRes.data || []);
      setLoueurs(loueursRes.data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPrincipalAttribution = async (profilId: string) => {
    const { data, error } = await supabase
      .from('attribution_vehicule')
      .select('id, vehicule:vehicule_id(immatriculation)')
      .eq('profil_id', profilId)
      .eq('type_attribution', 'principal')
      .is('date_fin', null)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erreur vérification:', error);
      return null;
    }

    return data;
  };

  const handleSelectLocataireType = (type: LocataireType) => {
    setLocataireType(type);
    setStep(2);
  };

  const handleNext = async () => {
    if (step === 2) {
      if (locataireType === 'salarie') {
        if (!selectedProfilId) {
          alert('Veuillez sélectionner un salarié');
          return;
        }

        if (typeAttribution === 'principal') {
          const existing = await checkExistingPrincipalAttribution(selectedProfilId);
          if (existing) {
            const vehicleImmat = (existing.vehicule as any)?.immatriculation || 'un véhicule';
            setWarningMessage(
              `⚠️ Attention: Ce chauffeur a déjà une attribution principale active sur ${vehicleImmat}. Vous pouvez continuer mais cela créera une deuxième attribution principale.`
            );
          }
        }
      } else {
        if (!selectedProfilId) {
          alert('Veuillez sélectionner un salarié');
          return;
        }
        if (!selectedLoueurExterne) {
          alert('Veuillez sélectionner ou créer une personne/entreprise externe');
          return;
        }
      }

      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setLocataireType(null);
      setSelectedProfilId('');
      setSelectedLoueurExterne(null);
    } else if (step === 3) {
      setStep(2);
      setWarningMessage('');
    }
  };

  const handleSubmit = async () => {
    if (!dateDebut) {
      alert('Veuillez renseigner la date de début');
      return;
    }

    if (dateFin && new Date(dateFin) < new Date(dateDebut)) {
      alert('La date de fin doit être postérieure à la date de début');
      return;
    }

    if (!selectedProfilId) {
      alert('Veuillez sélectionner un salarié');
      return;
    }

    if ((locataireType === 'personne_externe' || locataireType === 'entreprise_externe') && !selectedLoueurExterne) {
      alert('Veuillez sélectionner une personne/entreprise externe');
      return;
    }

    setSaving(true);
    try {
      const attributionData: any = {
        vehicule_id: vehicleId,
        profil_id: selectedProfilId,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        notes: notes || null
      };

      if (locataireType === 'salarie') {
        attributionData.loueur_id = selectedLoueurId || null;
        attributionData.type_attribution = typeAttribution;
      } else {
        attributionData.loueur_id = selectedLoueurExterne?.id;
        attributionData.type_attribution = null;
      }

      console.log('[DEBUG Attribution]', {
        vehiculeId: vehicleId,
        selectedProfilId,
        loueurId: locataireType === 'salarie' ? selectedLoueurId : selectedLoueurExterne?.id,
        locataireType,
        attributionData
      });

      const { error } = await supabase
        .from('attribution_vehicule')
        .insert(attributionData);

      if (error) throw error;

      if (locataireType === 'salarie' && typeAttribution === 'principal') {
        const { error: updateError } = await supabase
          .from('vehicule')
          .update({ locataire_type: null })
          .eq('id', vehicleId);

        if (updateError) {
          console.error('Erreur mise à jour locataire_type:', updateError);
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erreur création attribution:', error);
      alert(`Erreur lors de la création de l'attribution: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredProfils = profils.filter(p => {
    const searchLower = searchChauffeur.toLowerCase();
    return (
      p.nom?.toLowerCase().includes(searchLower) ||
      p.prenom?.toLowerCase().includes(searchLower) ||
      p.matricule_tca?.toLowerCase().includes(searchLower)
    );
  });

  const selectedProfil = profils.find(p => p.id === selectedProfilId);
  const selectedLoueur = loueurs.find(l => l.id === selectedLoueurId);

  const totalSteps = 3;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <LoadingSpinner size="lg" text="Chargement..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nouvelle attribution</h2>
            <p className="text-sm text-gray-600 mt-1">
              Étape {step} sur {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <div className={`w-16 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
                Type de locataire
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleSelectLocataireType('salarie')}
                  className="group border-2 border-gray-300 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Users className="h-8 w-8 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-1">Salarié TCA</h4>
                      <p className="text-sm text-gray-600">
                        Attribution à un salarié de l'entreprise
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectLocataireType('personne_externe')}
                  className="group border-2 border-gray-300 rounded-xl p-6 hover:border-green-500 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors">
                      <User className="h-8 w-8 text-green-600 group-hover:text-white" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-1">Personne externe</h4>
                      <p className="text-sm text-gray-600">
                        Location à une personne physique
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectLocataireType('entreprise_externe')}
                  className="group border-2 border-gray-300 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                      <Building2 className="h-8 w-8 text-purple-600 group-hover:text-white" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-1">Entreprise externe</h4>
                      <p className="text-sm text-gray-600">
                        Location à une entreprise
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && locataireType === 'salarie' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Sélection du chauffeur</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher un chauffeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={searchChauffeur}
                  onChange={(e) => setSearchChauffeur(e.target.value)}
                  placeholder="Nom, prénom ou matricule TCA..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner le chauffeur <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {filteredProfils.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Aucun chauffeur actif trouvé
                    </div>
                  ) : (
                    filteredProfils.map((profil) => (
                      <div
                        key={profil.id}
                        onClick={() => setSelectedProfilId(profil.id)}
                        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors ${
                          selectedProfilId === profil.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {profil.prenom} {profil.nom}
                            </p>
                            {profil.matricule_tca && (
                              <p className="text-sm text-gray-600">TCA: {profil.matricule_tca}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            profil.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {profil.statut}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loueur</label>
                <select
                  value={selectedLoueurId}
                  onChange={(e) => setSelectedLoueurId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Propriété TCA</option>
                  {loueurs.map((loueur) => (
                    <option key={loueur.id} value={loueur.id}>
                      {loueur.nom}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Laissez vide si le véhicule appartient à TCA
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'attribution <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      typeAttribution === 'principal'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="type"
                        value="principal"
                        checked={typeAttribution === 'principal'}
                        onChange={(e) => setTypeAttribution(e.target.value as 'principal' | 'secondaire')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          typeAttribution === 'principal'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {typeAttribution === 'principal' && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">Principal</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Chauffeur principal du véhicule
                      </p>
                    </div>
                  </label>

                  <label className="flex-1 cursor-pointer">
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      typeAttribution === 'secondaire'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="type"
                        value="secondaire"
                        checked={typeAttribution === 'secondaire'}
                        onChange={(e) => setTypeAttribution(e.target.value as 'principal' | 'secondaire')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          typeAttribution === 'secondaire'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {typeAttribution === 'secondaire' && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">Secondaire</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Chauffeur occasionnel ou de remplacement
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (locataireType === 'personne_externe' || locataireType === 'entreprise_externe') && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Sélection du salarié responsable
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salarié responsable du véhicule <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={searchChauffeur}
                  onChange={(e) => setSearchChauffeur(e.target.value)}
                  placeholder="Rechercher par nom, prénom ou matricule TCA..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                />
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {filteredProfils.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Aucun salarié actif trouvé
                    </div>
                  ) : (
                    filteredProfils.map((profil) => (
                      <div
                        key={profil.id}
                        onClick={() => setSelectedProfilId(profil.id)}
                        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors ${
                          selectedProfilId === profil.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {profil.prenom} {profil.nom}
                            </p>
                            {profil.matricule_tca && (
                              <p className="text-sm text-gray-600">TCA: {profil.matricule_tca}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            profil.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {profil.statut}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Le salarié responsable du véhicule pendant la location externe
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 pt-4">
                Sélection du locataire {locataireType === 'personne_externe' ? 'personne' : 'entreprise'}
              </h3>

              <LocataireExterneSelector
                type={locataireType === 'personne_externe' ? 'personne' : 'entreprise'}
                onSelect={setSelectedLoueurExterne}
                selectedId={selectedLoueurExterne?.id}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Détails de l'attribution</h3>

              {warningMessage && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{warningMessage}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Récapitulatif de la sélection</h4>
                <div className="space-y-2 text-sm">
                  {locataireType === 'salarie' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Type:</span>
                        <span className="text-blue-900 font-medium">Salarié TCA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Chauffeur:</span>
                        <span className="text-blue-900 font-medium">
                          {selectedProfil?.prenom} {selectedProfil?.nom}
                          {selectedProfil?.matricule_tca && ` (${selectedProfil.matricule_tca})`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Loueur:</span>
                        <span className="text-blue-900 font-medium">
                          {selectedLoueur?.nom || 'Propriété TCA'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Attribution:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          typeAttribution === 'principal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {typeAttribution === 'principal' ? 'Principal' : 'Secondaire'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Type:</span>
                        <span className="text-blue-900 font-medium">
                          {locataireType === 'personne_externe' ? 'Personne externe' : 'Entreprise externe'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Salarié responsable:</span>
                        <span className="text-blue-900 font-medium">
                          {selectedProfil?.prenom} {selectedProfil?.nom}
                          {selectedProfil?.matricule_tca && ` (${selectedProfil.matricule_tca})`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Locataire:</span>
                        <span className="text-blue-900 font-medium">
                          {selectedLoueurExterne?.nom}
                        </span>
                      </div>
                      {selectedLoueurExterne?.contact && (
                        <div className="flex justify-between">
                          <span className="text-blue-700">Contact:</span>
                          <span className="text-blue-900 font-medium">
                            {selectedLoueurExterne.contact}
                          </span>
                        </div>
                      )}
                      {selectedLoueurExterne?.telephone && (
                        <div className="flex justify-between">
                          <span className="text-blue-700">Téléphone:</span>
                          <span className="text-blue-900 font-medium">
                            {selectedLoueurExterne.telephone}
                          </span>
                        </div>
                      )}
                      {selectedLoueurExterne?.siret && (
                        <div className="flex justify-between">
                          <span className="text-blue-700">SIRET:</span>
                          <span className="text-blue-900 font-medium">
                            {selectedLoueurExterne.siret}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    min={dateDebut}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pour les locations temporaires
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Informations complémentaires sur cette attribution..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            {step === 1 ? (
              'Annuler'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 inline mr-1" />
                Retour
              </>
            )}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !locataireType) ||
                (step === 2 && locataireType === 'salarie' && !selectedProfilId) ||
                (step === 2 && locataireType !== 'salarie' && !selectedLoueurExterne)
              }
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !dateDebut}
              className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4 mr-2" />}
              Confirmer l'attribution
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
