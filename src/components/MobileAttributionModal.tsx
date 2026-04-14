import { useState, useEffect } from 'react';
import { X, User, Calendar, FileText, ChevronRight, Loader2, Search, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { AttestationSignatureModal } from './AttestationSignatureModal';

interface VehicleForAttribution {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  ref_tca: string | null;
  carte_essence_numero: string | null;
  licence_transport_numero: string | null;
}

interface Salarie {
  id: string;
  nom: string;
  prenom: string;
  matricule_tca: string | null;
}

interface MobileAttributionModalProps {
  vehicle: VehicleForAttribution;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal mobile plein écran pour l'attribution rapide d'un véhicule à un chauffeur TCA.
 *
 * ⚠️ Cette modal ne gère QUE le type chauffeur_tca.
 * Les autres types (direction, LOA, location pure, etc.) restent accessibles
 * uniquement en desktop.
 *
 * Flow :
 * 1. Sélection du salarié (recherche par nom/prénom/matricule)
 * 2. Date de début (par défaut aujourd'hui)
 * 3. Notes optionnelles
 * 4. Valider → clôture attribs actives + insert + update statut véhicule
 * 5. Ouverture automatique de AttestationSignatureModal pour la signature
 * 6. PDF généré + succès → refresh de la liste
 */
export function MobileAttributionModal({ vehicle, onClose, onSuccess }: MobileAttributionModalProps) {
  const { appUserId, appUserNom, appUserPrenom } = useAuth();
  const { appUser } = usePermissions();

  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [loadingSalaries, setLoadingSalaries] = useState(true);
  const [searchSalarie, setSearchSalarie] = useState('');
  const [selectedSalarieId, setSelectedSalarieId] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAttestation, setShowAttestation] = useState(false);
  const [attestationData, setAttestationData] = useState<any>(null);

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    setLoadingSalaries(true);
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('id, nom, prenom, matricule_tca')
        .eq('statut', 'actif')
        .order('nom');
      if (error) throw error;
      setSalaries(data || []);
    } catch (err) {
      console.error('Erreur chargement salariés:', err);
      setError('Impossible de charger la liste des salariés');
    } finally {
      setLoadingSalaries(false);
    }
  };

  const filteredSalaries = salaries.filter(s => {
    if (!searchSalarie.trim()) return false;
    const q = searchSalarie.toLowerCase().trim();
    return (
      s.nom?.toLowerCase().includes(q) ||
      s.prenom?.toLowerCase().includes(q) ||
      s.matricule_tca?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const selectedSalarie = salaries.find(s => s.id === selectedSalarieId);

  const handleValider = async () => {
    setError(null);

    if (!selectedSalarieId) {
      setError('Veuillez sélectionner un salarié');
      return;
    }
    if (!appUserId) {
      setError('Utilisateur non connecté');
      return;
    }
    if (!date) {
      setError('Veuillez saisir une date de début');
      return;
    }

    setSaving(true);
    try {
      // Étape 1 : Clôture des attributions actives (même logique que desktop = date_debut - 1)
      const hier = new Date(date);
      hier.setDate(hier.getDate() - 1);
      const hierStr = hier.toISOString().split('T')[0];

      await supabase
        .from('attribution_vehicule')
        .update({ date_fin: hierStr })
        .eq('vehicule_id', vehicle.id)
        .is('date_fin', null);

      // Étape 2 : Clôture des locations en cours (cohérence avec desktop)
      await supabase
        .from('locations')
        .update({ statut: 'terminee' })
        .eq('vehicule_id', vehicle.id)
        .eq('statut', 'en_cours');

      // Étape 3 : Création de la nouvelle attribution
      const { data: insertedAttribution, error: insertError } = await supabase
        .from('attribution_vehicule')
        .insert({
          vehicule_id: vehicle.id,
          profil_id: selectedSalarieId,
          loueur_id: null,
          type_attribution: 'principal',
          date_debut: date,
          date_fin: null,
          notes: notes || null,
          statut_vehicule: 'chauffeur_tca',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      const createdAttributionId = insertedAttribution?.id;

      // Étape 4 : Update statut véhicule
      await supabase
        .from('vehicule')
        .update({ statut: 'chauffeur_tca' })
        .eq('id', vehicle.id);

      // Étape 5 : Récupération du profil complet pour l'attestation
      const { data: profilComplet, error: profilError } = await supabase
        .from('profil')
        .select('id, nom, prenom, genre, date_naissance, matricule_tca, secteur:secteur_id(nom)')
        .eq('id', selectedSalarieId)
        .maybeSingle();

      if (profilError || !profilComplet) {
        throw new Error('Impossible de récupérer les informations du salarié');
      }

      // Étape 6 : Préparation des données pour la modal d'attestation
      setAttestationData({
        attributionId: createdAttributionId,
        vehiculeId: vehicle.id,
        immatriculation: vehicle.immatriculation,
        marque: vehicle.marque || '',
        modele: vehicle.modele || '',
        refTca: vehicle.ref_tca || null,
        carteEssence: vehicle.carte_essence_numero || null,
        licenceTransport: vehicle.licence_transport_numero || null,
        profilId: profilComplet.id,
        salarieNom: profilComplet.nom,
        salariePrenom: profilComplet.prenom,
        salarieGenre: profilComplet.genre,
        salarieMatriculeTca: profilComplet.matricule_tca,
        salarieDateNaissance: profilComplet.date_naissance,
        salarieSecteurNom: (profilComplet.secteur as any)?.nom || null,
        adminId: appUserId,
        adminNom: appUserNom || appUser?.nom || '',
        adminPrenom: appUserPrenom || appUser?.prenom || '',
      });

      setShowAttestation(true);
    } catch (err) {
      console.error('Erreur attribution mobile:', err);
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur lors de l'attribution : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Si la modal d'attestation est ouverte, on l'affiche à la place (overlay)
  if (showAttestation && attestationData) {
    return (
      <AttestationSignatureModal
        isOpen={showAttestation}
        onClose={() => {
          setShowAttestation(false);
          setAttestationData(null);
          onSuccess();
          onClose();
        }}
        onSuccess={() => {
          setShowAttestation(false);
          setAttestationData(null);
          onSuccess();
          onClose();
        }}
        {...attestationData}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Car className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Attribution</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{vehicle.immatriculation}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={saving}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Véhicule</p>
          <p className="text-lg font-bold text-gray-900">{vehicle.immatriculation}</p>
          <p className="text-sm text-gray-700">
            {vehicle.marque || '—'} {vehicle.modele || ''}
          </p>
          {vehicle.ref_tca && (
            <p className="text-xs text-gray-500 mt-1">Réf. TCA : {vehicle.ref_tca}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Chauffeur à attribuer <span className="text-red-500">*</span>
          </label>

          {selectedSalarie ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {selectedSalarie.prenom} {selectedSalarie.nom}
                  </p>
                  {selectedSalarie.matricule_tca && (
                    <p className="text-xs text-gray-500">Matricule : {selectedSalarie.matricule_tca}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSalarieId('');
                  setSearchSalarie('');
                }}
                disabled={saving}
                className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou matricule..."
                  value={searchSalarie}
                  onChange={(e) => setSearchSalarie(e.target.value)}
                  disabled={saving || loadingSalaries}
                  className="w-full pl-9 pr-3 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all disabled:opacity-50"
                />
              </div>

              {loadingSalaries && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Chargement des salariés...
                </p>
              )}

              {!loadingSalaries && searchSalarie.trim() && (
                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm max-h-72 overflow-y-auto">
                  {filteredSalaries.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Aucun salarié trouvé pour "{searchSalarie}"
                    </div>
                  ) : (
                    filteredSalaries.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSalarieId(s.id);
                          setSearchSalarie('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {s.prenom} {s.nom}
                          </p>
                          {s.matricule_tca && (
                            <p className="text-xs text-gray-500">Mat. {s.matricule_tca}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {!loadingSalaries && !searchSalarie.trim() && (
                <p className="text-xs text-gray-500 mt-2">
                  {salaries.length} salariés actifs — tapez pour rechercher
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date de début <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            rows={3}
            placeholder="Ex: véhicule de remplacement..."
            className="w-full px-3 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all resize-none disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Prochaine étape :</strong> Après validation, vous signerez l'attestation de mise à disposition avec le chauffeur sur cet écran.
          </p>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={handleValider}
          disabled={saving || !selectedSalarieId}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              Continuer
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}