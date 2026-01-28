import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft, ChevronRight, Check, Car, FileText, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface VehicleCreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface VehicleFormData {
  immatriculation: string;
  reference_tca: string;
  marque: string;
  modele: string;
  annee: number | '';
  type: string;
  date_premiere_mise_en_circulation: string;
  date_mise_en_service: string;
  assurance_type: 'tca' | 'externe';
  assurance_compagnie: string;
  assurance_numero_contrat: string;
  licence_transport_numero: string;
  carte_essence_numero: string;
  carte_essence_attribuee: boolean;
  kilometrage_actuel: number | '';
  statut: string;
}

interface Equipment {
  type: string;
  quantite: number;
}

interface DocumentFile {
  type: 'carte_grise' | 'assurance' | 'carte_ris' | 'controle_technique' | 'autre';
  file: File;
  date_emission?: string;
  date_expiration?: string;
}

interface Brand {
  id: string;
  nom: string;
}

interface Model {
  id: string;
  nom: string;
  marque_id: string;
}

const STEPS = [
  { id: 1, title: 'Informations générales', icon: Car },
  { id: 2, title: 'Références et dates', icon: FileText },
  { id: 3, title: 'Assurance et licence', icon: FileText },
  { id: 4, title: 'Équipements', icon: Car },
  { id: 5, title: 'Kilométrage et photo', icon: ImageIcon },
  { id: 6, title: 'Documents', icon: FileText },
];

const OTHER_OPTION = '__other__';

export function VehicleCreateModal({ onClose, onSuccess }: VehicleCreateModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [brandSearch, setBrandSearch] = useState<string>('');
  const [modelSearch, setModelSearch] = useState<string>('');

  const [formData, setFormData] = useState<VehicleFormData>({
    immatriculation: '',
    reference_tca: '',
    marque: '',
    modele: '',
    annee: '',
    type: 'VL',
    date_premiere_mise_en_circulation: '',
    date_mise_en_service: '',
    assurance_type: 'tca',
    assurance_compagnie: '',
    assurance_numero_contrat: '',
    licence_transport_numero: '',
    carte_essence_numero: '',
    carte_essence_attribuee: false,
    kilometrage_actuel: '',
    statut: 'actif',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicule_marque')
        .select('id, nom')
        .order('nom');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Erreur chargement marques:', error);
    }
  };

  const fetchModels = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicule_modele')
        .select('id, nom, marque_id')
        .eq('marque_id', brandId)
        .order('nom');

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
    }
  };

  const handleBrandChange = (value: string) => {
    setSelectedBrandId(value);
    setSelectedModelId('');
    setCustomModel('');
    setModelSearch('');
    setModels([]);

    if (value === OTHER_OPTION) {
      setFormData(prev => ({ ...prev, marque: '', modele: '' }));
      setCustomBrand('');
    } else if (value) {
      const brand = brands.find(b => b.id === value);
      if (brand) {
        setFormData(prev => ({ ...prev, marque: brand.nom, modele: '' }));
        fetchModels(value);
      }
    } else {
      setFormData(prev => ({ ...prev, marque: '', modele: '' }));
    }
  };

  const handleModelChange = (value: string) => {
    setSelectedModelId(value);

    if (value === OTHER_OPTION) {
      setFormData(prev => ({ ...prev, modele: '' }));
      setCustomModel('');
    } else if (value) {
      const model = models.find(m => m.id === value);
      if (model) {
        setFormData(prev => ({ ...prev, modele: model.nom }));
      }
    } else {
      setFormData(prev => ({ ...prev, modele: '' }));
    }
  };

  const handleCustomBrandChange = (value: string) => {
    setCustomBrand(value);
    setFormData(prev => ({ ...prev, marque: value }));
  };

  const handleCustomModelChange = (value: string) => {
    setCustomModel(value);
    setFormData(prev => ({ ...prev, modele: value }));
  };

  const handleInputChange = (field: keyof VehicleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEquipment = () => {
    setEquipments([...equipments, { type: '', quantite: 1 }]);
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: any) => {
    const updated = [...equipments];
    updated[index] = { ...updated[index], [field]: value };
    setEquipments(updated);
  };

  const removeEquipment = (index: number) => {
    setEquipments(equipments.filter((_, i) => i !== index));
  };

  const addDocument = (file: File, type: DocumentFile['type']) => {
    setDocuments([...documents, { type, file }]);
  };

  const updateDocumentDates = (index: number, field: 'date_emission' | 'date_expiration', value: string) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    setDocuments(updated);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.immatriculation && formData.marque && formData.modele);
      case 2:
        return true;
      case 3:
        return formData.assurance_type === 'tca' || !!(formData.assurance_compagnie && formData.assurance_numero_contrat);
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(6, prev + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      let photoPath = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        photoPath = `vehicle-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicle-photos')
          .upload(photoPath, photoFile);

        if (uploadError) throw uploadError;
      }

      const vehicleData = {
        ...formData,
        annee: formData.annee || null,
        kilometrage_actuel: formData.kilometrage_actuel || null,
        derniere_maj_kilometrage: formData.kilometrage_actuel ? new Date().toISOString().split('T')[0] : null,
        materiel_embarque: equipments.filter(eq => eq.type && eq.quantite > 0),
        photo_path: photoPath,
      };

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicule')
        .insert([vehicleData])
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      if (vehicle && formData.kilometrage_actuel) {
        await supabase.from('historique_kilometrage').insert([{
          vehicule_id: vehicle.id,
          date_releve: new Date().toISOString().split('T')[0],
          kilometrage: formData.kilometrage_actuel,
          source: 'manuel',
        }]);
      }

      if (vehicle && documents.length > 0) {
        for (const doc of documents) {
          const fileExt = doc.file.name.split('.').pop();
          const fileName = `${vehicle.id}/${doc.type}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('documents-vehicules')
            .upload(fileName, doc.file);

          if (uploadError) throw uploadError;

          await supabase.from('document_vehicule').insert([{
            vehicule_id: vehicle.id,
            type_document: doc.type,
            nom_fichier: doc.file.name,
            fichier_url: fileName,
            date_emission: doc.date_emission || null,
            date_expiration: doc.date_expiration || null,
          }]);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur création véhicule:', error);
      alert('Erreur lors de la création du véhicule');
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter(b =>
    b.nom.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const filteredModels = models.filter(m =>
    m.nom.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.immatriculation}
                onChange={(e) => handleInputChange('immatriculation', e.target.value.toUpperCase())}
                placeholder="AB-123-CD"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marque <span className="text-red-500">*</span>
              </label>
              {selectedBrandId === OTHER_OPTION ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => handleCustomBrandChange(e.target.value)}
                    placeholder="Saisir la marque"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSelectedBrandId('');
                      setCustomBrand('');
                      setFormData(prev => ({ ...prev, marque: '' }));
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Revenir à la liste
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Rechercher une marque..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={selectedBrandId}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={8}
                    required
                  >
                    <option value="">-- Sélectionner une marque --</option>
                    {filteredBrands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.nom}
                      </option>
                    ))}
                    <option value={OTHER_OPTION}>Autre...</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modèle <span className="text-red-500">*</span>
              </label>
              {selectedModelId === OTHER_OPTION ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => handleCustomModelChange(e.target.value)}
                    placeholder="Saisir le modèle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSelectedModelId('');
                      setCustomModel('');
                      setFormData(prev => ({ ...prev, modele: '' }));
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Revenir à la liste
                  </button>
                </div>
              ) : selectedBrandId && selectedBrandId !== OTHER_OPTION ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Rechercher un modèle..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={selectedModelId}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={8}
                    required
                  >
                    <option value="">-- Sélectionner un modèle --</option>
                    {filteredModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.nom}
                      </option>
                    ))}
                    <option value={OTHER_OPTION}>Autre...</option>
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  disabled
                  placeholder={selectedBrandId === OTHER_OPTION ? 'Saisir d\'abord la marque' : 'Sélectionner d\'abord une marque'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="VL">VL (Véhicule Léger)</option>
                <option value="VUL">VUL (Véhicule Utilitaire Léger)</option>
                <option value="PL">PL (Poids Lourd)</option>
                <option value="TC">TC (Transport en Commun)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <input
                type="number"
                value={formData.annee}
                onChange={(e) => handleInputChange('annee', e.target.value ? parseInt(e.target.value) : '')}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => handleInputChange('statut', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="actif">Actif</option>
                <option value="maintenance">En maintenance</option>
                <option value="hors service">Hors service</option>
                <option value="en location">En location</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence TCA</label>
              <input
                type="text"
                value={formData.reference_tca}
                onChange={(e) => handleInputChange('reference_tca', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de 1ère mise en circulation
              </label>
              <input
                type="date"
                value={formData.date_premiere_mise_en_circulation}
                onChange={(e) => handleInputChange('date_premiere_mise_en_circulation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de mise en service
              </label>
              <input
                type="date"
                value={formData.date_mise_en_service}
                onChange={(e) => handleInputChange('date_mise_en_service', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'assurance</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="tca"
                    checked={formData.assurance_type === 'tca'}
                    onChange={(e) => handleInputChange('assurance_type', e.target.value)}
                    className="mr-2"
                  />
                  Assuré TCA
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="externe"
                    checked={formData.assurance_type === 'externe'}
                    onChange={(e) => handleInputChange('assurance_type', e.target.value)}
                    className="mr-2"
                  />
                  Assuré ailleurs
                </label>
              </div>
            </div>

            {formData.assurance_type === 'externe' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compagnie d'assurance
                  </label>
                  <input
                    type="text"
                    value={formData.assurance_compagnie}
                    onChange={(e) => handleInputChange('assurance_compagnie', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de contrat
                  </label>
                  <input
                    type="text"
                    value={formData.assurance_numero_contrat}
                    onChange={(e) => handleInputChange('assurance_numero_contrat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Licence de transport (numéro)
              </label>
              <input
                type="text"
                value={formData.licence_transport_numero}
                onChange={(e) => handleInputChange('licence_transport_numero', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Matériel embarqué</h3>
              <button
                onClick={addEquipment}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </button>
            </div>

            {equipments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Aucun équipement ajouté. Cliquez sur "Ajouter" pour en ajouter un.
              </p>
            ) : (
              <div className="space-y-3">
                {equipments.map((eq, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={eq.type}
                        onChange={(e) => updateEquipment(idx, 'type', e.target.value)}
                        placeholder="Type d'équipement (ex: siège bébé)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={eq.quantite}
                        onChange={(e) => updateEquipment(idx, 'quantite', parseInt(e.target.value) || 1)}
                        min="1"
                        placeholder="Qté"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => removeEquipment(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro carte essence
                </label>
                <input
                  type="text"
                  value={formData.carte_essence_numero}
                  onChange={(e) => handleInputChange('carte_essence_numero', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.carte_essence_attribuee}
                    onChange={(e) => handleInputChange('carte_essence_attribuee', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Carte essence attribuée</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilométrage actuel
              </label>
              <input
                type="number"
                value={formData.kilometrage_actuel}
                onChange={(e) => handleInputChange('kilometrage_actuel', e.target.value ? parseInt(e.target.value) : '')}
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Ce kilométrage sera enregistré comme valeur initiale dans l'historique
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo du véhicule
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Formats acceptés: JPG, PNG (max 5MB)
                  </p>
                </div>
                {photoPreview && (
                  <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                    <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Vous pouvez uploader les documents maintenant ou les ajouter plus tard depuis la fiche du véhicule.
              </p>
            </div>

            {['carte_grise', 'assurance', 'carte_ris', 'controle_technique'].map((docType) => {
              const doc = documents.find(d => d.type === docType);
              const labels: Record<string, string> = {
                carte_grise: 'Carte grise',
                assurance: 'Assurance',
                carte_ris: 'Carte RIS',
                controle_technique: 'Contrôle technique',
              };

              return (
                <div key={docType} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{labels[docType]}</h4>
                  {doc ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <span className="text-sm text-gray-700">{doc.file.name}</span>
                        <button
                          onClick={() => removeDocument(documents.indexOf(doc))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Date d'émission</label>
                          <input
                            type="date"
                            value={doc.date_emission || ''}
                            onChange={(e) => updateDocumentDates(documents.indexOf(doc), 'date_emission', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Date d'expiration</label>
                          <input
                            type="date"
                            value={doc.date_expiration || ''}
                            onChange={(e) => updateDocumentDates(documents.indexOf(doc), 'date_expiration', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) addDocument(file, docType as DocumentFile['type']);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Ajouter un véhicule</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span
                      className={`text-xs mt-1 text-center ${
                        isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStep()}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Précédent
          </button>

          <span className="text-sm text-gray-600">
            Étape {currentStep} sur {STEPS.length}
          </span>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                validateStep(currentStep)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Suivant
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !validateStep(currentStep)}
              className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Création...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Créer le véhicule
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
