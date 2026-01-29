import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronRight, ChevronLeft, AlertTriangle, Check } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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

interface Props {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AttributionModal({ vehicleId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profils, setProfils] = useState<Profil[]>([]);
  const [loueurs, setLoueurs] = useState<Loueur[]>([]);

  const [searchChauffeur, setSearchChauffeur] = useState('');
  const [selectedProfilId, setSelectedProfilId] = useState('');
  const [selectedLoueurId, setSelectedLoueurId] = useState<string>('');
  const [typeAttribution, setTypeAttribution] = useState<'principal' | 'secondaire'>('principal');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [warningMessage, setWarningMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedProfilId) {
        alert('Veuillez sélectionner un chauffeur');
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

      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setWarningMessage('');
  };

  const handleSubmit = async () => {
    if (!selectedProfilId || !dateDebut) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('attribution_vehicule')
        .insert({
          vehicule_id: vehicleId,
          profil_id: selectedProfilId,
          loueur_id: selectedLoueurId || null,
          type_attribution: typeAttribution,
          date_debut: dateDebut,
          notes: notes || null
        });

      if (error) throw error;

      if (typeAttribution === 'principal') {
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
              Étape {step} sur 2
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
              <div className={`w-20 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Sélection du chauffeur et du loueur</h3>

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

          {step === 2 && (
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
                    <span className="text-blue-700">Type:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      typeAttribution === 'principal'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {typeAttribution === 'principal' ? 'Principal' : 'Secondaire'}
                    </span>
                  </div>
                </div>
              </div>

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

          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedProfilId}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !selectedProfilId || !dateDebut}
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
