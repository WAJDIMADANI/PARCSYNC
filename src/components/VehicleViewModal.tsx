import { useState, useEffect } from 'react';
import { X, Car, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface Vehicle {
  id: string;
  immatriculation: string;
  immat_norm: string;
  ref_tca: string | null;
  marque: string | null;
  modele: string | null;
  finition: string | null;
  energie: string | null;
  couleur: string | null;
  annee: number | null;
  type: string | null;
  statut: string;
  date_mise_en_service: string | null;
  date_premiere_mise_en_circulation: string | null;
  fournisseur: string | null;
  financeur_nom: string | null;
  financeur_adresse: string | null;
  financeur_code_postal: string | null;
  financeur_ville: string | null;
  financeur_telephone: string | null;
  proprietaire_carte_grise: string | null;
  mode_acquisition: string | null;
  prix_ht: number | null;
  prix_ttc: number | null;
  mensualite_ht: number | null;
  mensualite_ttc: number | null;
  duree_contrat_mois: number | null;
  date_debut_contrat: string | null;
  date_fin_prevue_contrat: string | null;
  reste_a_payer_ttc: number | null;
  photo_path: string | null;
  assurance_type: 'tca' | 'externe' | null;
  assurance_compagnie: string | null;
  assurance_numero_contrat: string | null;
  licence_transport_numero: string | null;
  carte_essence_fournisseur: string | null;
  carte_essence_numero: string | null;
  carte_essence_attribuee: boolean;
  kilometrage_actuel: number | null;
  derniere_maj_kilometrage: string | null;
  materiel_embarque: any[] | null;
}

interface Document {
  id: string;
  nom_fichier: string;
  type_document: string;
  date_upload: string;
}

interface Props {
  vehicleId: string;
  onClose: () => void;
  onEdit?: () => void;
}

export function VehicleViewModal({ vehicleId, onClose, onEdit }: Props) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;

    const fetchVehicleData = async () => {
      try {
        setLoading(true);

        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicule')
          .select('*')
          .eq('id', vehicleId)
          .single();

        if (vehicleError) throw vehicleError;

        setVehicle(vehicleData);

        if (vehicleData.photo_path) {
          const { data: signedUrl } = await supabase.storage
            .from('vehicle-photos')
            .createSignedUrl(vehicleData.photo_path, 3600);

          if (signedUrl) {
            setPhotoUrl(signedUrl.signedUrl);
          }
        }

        const { data: docsData, error: docsError } = await supabase
          .from('document_vehicule')
          .select('id, nom_fichier, type_document, date_upload')
          .eq('vehicule_id', vehicleId)
          .order('date_upload', { ascending: false });

        if (docsError) throw docsError;

        setDocuments(docsData || []);
      } catch (error) {
        console.error('Erreur chargement véhicule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <LoadingSpinner size="lg" text="Chargement..." />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt={vehicle.immatriculation} className="w-full h-full object-cover" />
              ) : (
                <Car className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{vehicle.immatriculation}</h2>
              {vehicle.ref_tca && (
                <p className="text-sm text-gray-600">Réf. TCA: {vehicle.ref_tca}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Informations générales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Immatriculation" value={vehicle.immatriculation} />
              <InfoField label="Référence TCA" value={vehicle.ref_tca} />
              <InfoField label="Marque" value={vehicle.marque} />
              <InfoField label="Modèle" value={vehicle.modele} />
              <InfoField label="Finition" value={vehicle.finition} />
              <InfoField label="Énergie" value={vehicle.energie} />
              <InfoField label="Couleur" value={vehicle.couleur} />
              <InfoField label="Année" value={vehicle.annee?.toString()} />
              <InfoField label="Type" value={vehicle.type} />
              <InfoField label="Statut" value={vehicle.statut} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Références et dates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Date 1ère mise en circulation" value={vehicle.date_premiere_mise_en_circulation} type="date" />
              <InfoField label="Date mise en service" value={vehicle.date_mise_en_service} type="date" />
              <InfoField label="Propriétaire carte grise" value={vehicle.proprietaire_carte_grise} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Acquisition
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Fournisseur" value={vehicle.fournisseur} />
              <InfoField label="Mode d'acquisition" value={vehicle.mode_acquisition} />
              <InfoField label="Financeur" value={vehicle.financeur_nom} />
              <InfoField label="Adresse financeur" value={vehicle.financeur_adresse} />
              <InfoField label="Code postal" value={vehicle.financeur_code_postal} />
              <InfoField label="Ville" value={vehicle.financeur_ville} />
              <InfoField label="Téléphone financeur" value={vehicle.financeur_telephone} />
              <InfoField label="Prix HT" value={vehicle.prix_ht?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'} />
              <InfoField label="Prix TTC" value={vehicle.prix_ttc?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'} />
              <InfoField label="Mensualité HT" value={vehicle.mensualite_ht?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'} />
              <InfoField label="Mensualité TTC" value={vehicle.mensualite_ttc?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'} />
              <InfoField label="Durée contrat (mois)" value={vehicle.duree_contrat_mois?.toString()} />
              <InfoField label="Date début contrat" value={vehicle.date_debut_contrat} type="date" />
              <InfoField label="Date fin prévue" value={vehicle.date_fin_prevue_contrat} type="date" />
              <InfoField label="Reste à payer TTC" value={vehicle.reste_a_payer_ttc?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Assurance et licence
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Type d'assurance" value={vehicle.assurance_type === 'tca' ? 'Assuré TCA' : vehicle.assurance_type === 'externe' ? 'Assurance externe' : null} />
              <InfoField label="Compagnie d'assurance" value={vehicle.assurance_compagnie} />
              <InfoField label="Numéro de contrat" value={vehicle.assurance_numero_contrat} />
              <InfoField label="Numéro de licence transport" value={vehicle.licence_transport_numero} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Équipements
            </h3>
            <div className="space-y-4">
              {vehicle.materiel_embarque && Array.isArray(vehicle.materiel_embarque) && vehicle.materiel_embarque.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Matériel embarqué:</p>
                  {vehicle.materiel_embarque.map((eq: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-700">{eq.type}</span>
                      <span className="text-sm text-gray-500">×{eq.quantite}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun équipement enregistré</p>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Carte essence:</p>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Carte attribuée" value={vehicle.carte_essence_attribuee ? 'Oui' : 'Non'} />
                  <InfoField label="Fournisseur" value={vehicle.carte_essence_fournisseur} />
                  <InfoField label="Numéro de carte" value={vehicle.carte_essence_numero} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Kilométrage et photo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Kilométrage actuel" value={vehicle.kilometrage_actuel ? `${vehicle.kilometrage_actuel.toLocaleString('fr-FR')} km` : null} />
              <InfoField label="Dernière mise à jour" value={vehicle.derniere_maj_kilometrage} type="date" />
            </div>
            {photoUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Photo du véhicule:</p>
                <div className="w-64 h-48 rounded-lg overflow-hidden border border-gray-200">
                  <img src={photoUrl} alt={vehicle.immatriculation} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Documents
            </h3>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.nom_fichier}</p>
                      <p className="text-xs text-gray-500">{doc.type_document}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.date_upload).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Aucun document uploadé</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, type = 'text' }: { label: string; value?: string | null; type?: 'text' | 'date' }) {
  const displayValue = value ? (type === 'date' ? new Date(value).toLocaleDateString('fr-FR') : value) : '-';

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900">{displayValue}</p>
    </div>
  );
}
