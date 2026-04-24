import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Smartphone, Monitor, LogOut, Search, RefreshCw, Car, X, Loader2 } from 'lucide-react';
import { MobileVehicleCard } from './MobileVehicleCard';
import { AttestationSignatureModal } from './AttestationSignatureModal';
import { RestitutionModal } from './RestitutionModal';
import { EDLModal } from './EDLModal';
import { LocationContractModal } from './LocationContractModal';

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

// Composant de recherche salarié (même pattern que desktop)
function SalarieSearchMobile({ salaries, selectedId, onSelect }: {
  salaries: { id: string; nom: string; prenom: string; matricule_tca?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = salaries.filter(s => {
    const q = search.toLowerCase();
    return (
      s.nom?.toLowerCase().includes(q) ||
      s.prenom?.toLowerCase().includes(q) ||
      (s as any).matricule_tca?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const selected = salaries.find(s => s.id === selectedId);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Rechercher par nom ou matricule..."
        value={search || (selected ? `${selected.prenom} ${selected.nom}` : '')}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); onSelect(''); }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
      />
      {open && search.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Aucun résultat</div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
              >
                <span>{s.prenom} {s.nom}</span>
                {(s as any).matricule_tca && (
                  <span className="text-xs text-gray-400 ml-2">{(s as any).matricule_tca}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function MobileFlotteHome({ onSwitchToDesktop }: MobileFlotteHomeProps) {
  const { appUser } = usePermissions();
  const { appUserId, appUserNom, appUserPrenom } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Restitution
  const [showRestitutionModal, setShowRestitutionModal] = useState(false);
  const [restitutionData, setRestitutionData] = useState<any>(null);

  // 🆕 Attribution popup (même pattern que desktop VehicleListNew)
  const [showAttributionModal, setShowAttributionModal] = useState(false);
  const [attributionVehicle, setAttributionVehicle] = useState<Vehicle | null>(null);
  const [attributionType, setAttributionType] = useState('');
  const [attributionDate, setAttributionDate] = useState(new Date().toISOString().split('T')[0]);
  const [attributionNotes, setAttributionNotes] = useState('');
  const [attributionSalarieId, setAttributionSalarieId] = useState('');
  const [savingAttribution, setSavingAttribution] = useState(false);
  const [salaries, setSalaries] = useState<{ id: string; nom: string; prenom: string; matricule_tca?: string }[]>([]);

  // Attestation + EDL
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [attestationData, setAttestationData] = useState<any>(null);
const [showEDLModal, setShowEDLModal] = useState(false);
  const [edlData, setEdlData] = useState<any>(null);
  const [showLocationContractModal, setShowLocationContractModal] = useState(false);
  const [locationContractData, setLocationContractData] = useState<any>(null);

  useEffect(() => {
    fetchVehicles();
    fetchSalaries();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_vehicles_list_ui')
        .select('id, immatriculation, ref_tca, marque, modele, annee, statut, chauffeurs_actifs, locataire_affiche, locataire_type, carte_essence_numero, licence_transport_numero')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles((data || []).map(v => ({ ...v, chauffeurs_actifs: Array.isArray(v.chauffeurs_actifs) ? v.chauffeurs_actifs : [] })));
    } catch (error) {
      console.error('Erreur chargement vehicules mobile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaries = async () => {
    try {
      const { data } = await supabase
        .from('profil')
        .select('id, nom, prenom, matricule_tca')
        .eq('statut', 'actif')
        .order('nom');
      setSalaries(data || []);
    } catch (error) {
      console.error('Erreur chargement salariés:', error);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleAttribuer = (vehicle: Vehicle) => {
    setAttributionVehicle(vehicle);
    setAttributionType('');
    setAttributionSalarieId('');
    setAttributionDate(new Date().toISOString().split('T')[0]);
    setAttributionNotes('');
    setShowAttributionModal(true);
  };

  const handleRestituer = async (vehicle: Vehicle) => {
    if (vehicle.statut !== 'chauffeur_tca') {
      alert('Restitution disponible uniquement pour les chauffeurs TCA pour le moment.');
      return;
    }
    if (!appUserId) { alert('Utilisateur non connecté'); return; }
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

      if (error || !attribution) { alert('Aucune attribution active trouvée'); return; }

      const profil: any = attribution.profil;
      const admin: any = attribution.admin;

      setRestitutionData({
        attributionId: attribution.id, vehiculeId: vehicle.id,
        immatriculation: vehicle.immatriculation, marque: vehicle.marque || '', modele: vehicle.modele || '',
        refTca: vehicle.ref_tca || null, carteEssence: vehicle.carte_essence_numero || null,
        licenceTransport: vehicle.licence_transport_numero || null,
        profilId: profil?.id || '', salarieNom: profil?.nom || '', salariePrenom: profil?.prenom || '',
        salarieGenre: profil?.genre || null, salarieMatriculeTca: profil?.matricule_tca || null,
        salarieDateNaissance: profil?.date_naissance || null, salarieSecteurNom: profil?.secteur?.nom || null,
        kmDepart: attribution.km_depart || 0, dateDepart: attribution.date_debut || '',
        signatureChauffeurDepart: attribution.signature_chauffeur || '',
        signatureAdminDepart: attribution.signature_admin || '',
        adminDepartNom: admin?.nom || '', adminDepartPrenom: admin?.prenom || '',
        dateDepartResponsable: attribution.created_at || '',
        adminId: appUserId, adminNom: appUserNom || '', adminPrenom: appUserPrenom || '',
      });
      setShowRestitutionModal(true);
    } catch (e) {
      console.error('Erreur récupération attribution mobile:', e);
      alert('Erreur lors de la récupération des données');
    }
  };

  // 🆕 Logique d'attribution (copié-adapté de VehicleListNew.handleValiderAttribution)
  const handleValiderAttribution = async () => {
    if (!attributionVehicle || !attributionType) return;
    setSavingAttribution(true);
    try {
      const hier = new Date(attributionDate);
      hier.setDate(hier.getDate() - 1);
      const hierStr = hier.toISOString().split('T')[0];

      await supabase.from('attribution_vehicule').update({ date_fin: hierStr }).eq('vehicule_id', attributionVehicle.id).is('date_fin', null);

     if (attributionType !== 'location_pure' && attributionType !== 'location_vente_particulier' && attributionType !== 'location_vente_societe') {
        await supabase.from('locations').update({ statut: 'terminee' }).eq('vehicule_id', attributionVehicle.id).eq('statut', 'en_cours');
      }

    const necessitePersonne = ['chauffeur_tca', 'direction_administratif', 'en_pret'].includes(attributionType);
      let createdAttributionId: string | null = null;
      if (necessitePersonne && attributionSalarieId) {
        const { data: insertedAttribution, error: insertError } = await supabase
          .from('attribution_vehicule')
          .insert({
            vehicule_id: attributionVehicle.id,
            profil_id: attributionSalarieId || null,
            loueur_id: null,
            type_attribution: 'principal',
            date_debut: attributionDate,
            date_fin: null,
            notes: attributionNotes || null,
            statut_vehicule: attributionType,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        createdAttributionId = insertedAttribution?.id || null;
      }

      await supabase.from('vehicule').update({ statut: attributionType }).eq('id', attributionVehicle.id);

      const wasChauffeurTca = attributionType === 'chauffeur_tca';

      if (wasChauffeurTca && createdAttributionId && appUserId) {
        const { data: profilComplet } = await supabase
          .from('profil')
          .select('id, nom, prenom, genre, date_naissance, matricule_tca, secteur:secteur_id(nom)')
          .eq('id', attributionSalarieId)
          .maybeSingle();

        if (profilComplet) {
          setAttestationData({
            attributionId: createdAttributionId,
            vehiculeId: attributionVehicle.id,
            immatriculation: attributionVehicle.immatriculation,
            marque: attributionVehicle.marque || '',
            modele: attributionVehicle.modele || '',
            refTca: attributionVehicle.ref_tca || null,
            carteEssence: attributionVehicle.carte_essence_numero || null,
            licenceTransport: attributionVehicle.licence_transport_numero || null,
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
          setShowAttributionModal(false);
          setAttributionVehicle(null);
          setShowAttestationModal(true);
          setSavingAttribution(false);
          return;
        }
      }

  // 🆕 L2 : Si c'est une location, ouvrir le formulaire de contrat
      const isLocation = ['location_pure', 'location_vente_particulier', 'location_vente_societe'].includes(attributionType);
      if (isLocation) {
        setLocationContractData({
          vehiculeId: attributionVehicle.id,
          immatriculation: attributionVehicle.immatriculation,
          marque: attributionVehicle.marque || '',
          modele: attributionVehicle.modele || '',
          refTca: attributionVehicle.ref_tca || null,
          typeLocation: attributionType,
          dateDebut: attributionDate,
        });
        setShowAttributionModal(false);
        setAttributionVehicle(null);
        setAttributionType('');
        setAttributionNotes('');
        setShowLocationContractModal(true);
        setSavingAttribution(false);
        return;
      }

      // Pour les autres types : juste fermer et refresh
      await fetchVehicles();
      setShowAttributionModal(false);
      setAttributionVehicle(null);
    } catch (error) {
      console.error('Erreur attribution mobile:', error);
      alert("Erreur lors de l'attribution. Veuillez réessayer.");
    } finally {
      setSavingAttribution(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles;
    const searchLower = search.toLowerCase().trim();
    return vehicles.filter(v =>
      v.immatriculation?.toLowerCase().includes(searchLower) ||
      v.ref_tca?.toLowerCase().includes(searchLower) ||
      v.marque?.toLowerCase().includes(searchLower) ||
      v.modele?.toLowerCase().includes(searchLower)
    );
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
              <p className="text-sm font-semibold text-gray-900 truncate">{appUser?.prenom} {appUser?.nom}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onSwitchToDesktop} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Basculer en mode Desktop">
              <Monitor className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Se déconnecter">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Rechercher par immat, marque..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-9 py-2.5 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {loading ? 'Chargement...' : `${filteredVehicles.length} véhicule${filteredVehicles.length > 1 ? 's' : ''}`}
              {search && vehicles.length > filteredVehicles.length && <span className="text-gray-400"> · filtré de {vehicles.length}</span>}
            </p>
            <button onClick={fetchVehicles} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gray-500">Chargement des véhicules...</p>
          </div>
        )}

        {!loading && filteredVehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">{search ? 'Aucun véhicule trouvé' : 'Aucun véhicule'}</p>
            <p className="text-sm text-gray-500">{search ? `Aucun résultat pour "${search}"` : 'La liste est vide.'}</p>
            {search && <button onClick={() => setSearch('')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm">Effacer</button>}
          </div>
        )}

        {!loading && filteredVehicles.length > 0 && filteredVehicles.map(vehicle => (
          <MobileVehicleCard key={vehicle.id} vehicle={vehicle} onAttribuer={handleAttribuer} onRestituer={handleRestituer} />
        ))}
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">PARC SYNC · Mode Mobile · v0.5</p>
      </div>

      {/* 🆕 Popup attribution (même design que desktop) */}
      {showAttributionModal && attributionVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Attribution véhicule</h3>
                <p className="text-sm text-gray-500">{attributionVehicle.immatriculation} · {attributionVehicle.marque} {attributionVehicle.modele}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'attribution</label>
                <select value={attributionType} onChange={(e) => setAttributionType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Sélectionner --</option>
                  <option value="sur_parc">🅿 Sur parc</option>
                  <option value="chauffeur_tca">👤 Chauffeur TCA</option>
                  <option value="direction_administratif">🏢 Direction / Administratif</option>
                 <option value="location_pure">🔄 Location pure</option>
                  <option value="location_vente_particulier">💰 Location-vente particulier</option>
                  <option value="location_vente_societe">🏢 Location-vente société</option>
                  <option value="en_pret">🤝 En prêt</option>
                  <option value="en_garage">🛠 En garage</option>
                  <option value="hors_service">🚫 Hors service</option>
                  <option value="sorti_flotte">📦 Sorti de flotte</option>
                </select>
              </div>
              {(attributionType === 'chauffeur_tca' || attributionType === 'direction_administratif') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salarié</label>
                  <SalarieSearchMobile salaries={salaries} selectedId={attributionSalarieId} onSelect={setAttributionSalarieId} />
                </div>
              )}
            {(['location_pure', 'location_vente_particulier', 'location_vente_societe'].includes(attributionType)) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">📋 Contrat de location</p>
                  <p className="text-xs text-blue-600 mt-1">Après validation, créez le contrat depuis la page "Locations".</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <input type="date" value={attributionDate} onChange={(e) => setAttributionDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input type="text" value={attributionNotes} onChange={(e) => setAttributionNotes(e.target.value)} placeholder="Ex: véhicule de remplacement..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => { setShowAttributionModal(false); setAttributionVehicle(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Annuler</button>
              <button onClick={handleValiderAttribution} disabled={savingAttribution || !attributionType} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {savingAttribution ? 'Enregistrement...' : "Valider l'attribution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attestation signature (chauffeur TCA) */}
      {showAttestationModal && attestationData && (
        <AttestationSignatureModal
          isOpen={showAttestationModal}
          onClose={async () => {
            setShowAttestationModal(false);
            setAttestationData(null);
            await fetchVehicles();
          }}
          onSuccess={(_pdfPath: string, kmDepart: number) => {
            if (!attestationData) return;
            setEdlData({
              typeEdl: 'sortie',
              attributionId: attestationData.attributionId,
              vehiculeId: attestationData.vehiculeId,
              profilId: attestationData.profilId,
              immatriculation: attestationData.immatriculation,
              marque: attestationData.marque,
              modele: attestationData.modele,
              refTca: attestationData.refTca,
              salarieNom: attestationData.salarieNom,
              salariePrenom: attestationData.salariePrenom,
              kmInitial: kmDepart,
              adminId: attestationData.adminId,
              adminNom: attestationData.adminNom,
              adminPrenom: attestationData.adminPrenom,
            });
            setShowAttestationModal(false);
            setAttestationData(null);
            setShowEDLModal(true);
          }}
          {...attestationData}
        />
      )}

      {/* EDL après attestation */}
      {showEDLModal && edlData && (
        <EDLModal
          isOpen={showEDLModal}
          onClose={async () => {
            setShowEDLModal(false);
            setEdlData(null);
            await fetchVehicles();
          }}
          onSuccess={async () => {
            setShowEDLModal(false);
            setEdlData(null);
            await fetchVehicles();
          }}
          {...edlData}
        />
      )}

{/* 🆕 L2 : Modal contrat de location */}
      {showLocationContractModal && locationContractData && (
        <LocationContractModal
          isOpen={showLocationContractModal}
          onClose={async () => {
            setShowLocationContractModal(false);
            setLocationContractData(null);
            await fetchVehicles();
          }}
          onSuccess={(data) => {
            setEdlData({
              typeEdl: 'sortie',
              attributionId: data.attributionId,
              vehiculeId: locationContractData.vehiculeId,
              profilId: '',
              immatriculation: locationContractData.immatriculation,
              marque: locationContractData.marque,
              modele: locationContractData.modele,
              refTca: locationContractData.refTca,
              salarieNom: data.locataireNom,
              salariePrenom: data.locatairePrenom,
              kmInitial: data.kmDepart,
              adminId: appUserId || '',
              adminNom: appUserNom || '',
              adminPrenom: appUserPrenom || '',
            });
            setShowLocationContractModal(false);
            setLocationContractData(null);
            setShowEDLModal(true);
          }}
          {...locationContractData}
        />
  )}

      {showRestitutionModal && restitutionData && (
        <RestitutionModal
          isOpen={showRestitutionModal}
          onClose={() => { setShowRestitutionModal(false); setRestitutionData(null); }}
          onSuccess={async () => { setShowRestitutionModal(false); setRestitutionData(null); await fetchVehicles(); }}
          {...restitutionData}
        />
      )}
    </div>
  );
}