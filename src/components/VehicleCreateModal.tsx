import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft, ChevronRight, Check, Car, FileText, Image as ImageIcon, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
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
  fournisseur: string;
  mode_acquisition: string;
  prix_ht: number | '';
  prix_ttc: number | '';
  mensualite_ht: number | '';
  mensualite_ttc: number | '';
  duree_contrat_mois: number | '';
  date_debut_contrat: string;
  date_fin_prevue_contrat: string;
  assurance_type: 'tca' | 'externe';
  assurance_compagnie: string;
  assurance_numero_contrat: string;
  licence_transport_numero: string;
  carte_essence_fournisseur: string;
  carte_essence_numero: string;
  carte_essence_attribuee: boolean;
  kilometrage_actuel: number | '';
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
  { id: 3, title: 'Acquisition', icon: FileText },
  { id: 4, title: 'Assurance et licence', icon: FileText },
  { id: 5, title: 'Équipements', icon: Car },
  { id: 6, title: 'Kilométrage et photo', icon: ImageIcon },
  { id: 7, title: 'Documents', icon: FileText },
];

export function VehicleCreateModal({ onClose, onSuccess }: VehicleCreateModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [error, setError] = useState<string>('');
  const [immatWarning, setImmatWarning] = useState<string>('');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [brandSearch, setBrandSearch] = useState<string>('');
  const [modelSearch, setModelSearch] = useState<string>('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<VehicleFormData>({
    immatriculation: '',
    reference_tca: '',
    marque: '',
    modele: '',
    annee: '',
    type: 'VL',
    date_premiere_mise_en_circulation: '',
    date_mise_en_service: '',
    fournisseur: '',
    mode_acquisition: '',
    prix_ht: '',
    prix_ttc: '',
    mensualite_ht: '',
    mensualite_ttc: '',
    duree_contrat_mois: '',
    date_debut_contrat: '',
    date_fin_prevue_contrat: '',
    assurance_type: 'tca',
    assurance_compagnie: '',
    assurance_numero_contrat: '',
    licence_transport_numero: '',
    carte_essence_fournisseur: '',
    carte_essence_numero: '',
    carte_essence_attribuee: false,
    kilometrage_actuel: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node) &&
          brandInputRef.current && !brandInputRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node) &&
          modelInputRef.current && !modelInputRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrandId(brand.id);
    setBrandSearch(brand.nom);
    setFormData(prev => ({ ...prev, marque: brand.nom, modele: '' }));
    setShowBrandDropdown(false);
    setSelectedModelId('');
    setModelSearch('');
    setModels([]);
    fetchModels(brand.id);
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModelId(model.id);
    setModelSearch(model.nom);
    setFormData(prev => ({ ...prev, modele: model.nom }));
    setShowModelDropdown(false);
  };

  const handleBrandInputChange = (value: string) => {
    setBrandSearch(value);
    setFormData(prev => ({ ...prev, marque: value, modele: '' }));
    setShowBrandDropdown(true);
    setSelectedBrandId('');
    setSelectedModelId('');
    setModelSearch('');
    setModels([]);
  };

  const handleModelInputChange = (value: string) => {
    setModelSearch(value);
    setFormData(prev => ({ ...prev, modele: value }));
    setShowModelDropdown(true);
    setSelectedModelId('');
  };

  const checkImmatriculationExists = async (immat: string) => {
    if (!immat || immat.length < 3) {
      setImmatWarning('');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vehicule')
        .select('id, immatriculation')
        .eq('immatriculation', immat)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setImmatWarning(`Cette immatriculation existe déjà dans le système.`);
      } else {
        setImmatWarning('');
      }
    } catch (error) {
      console.error('Erreur vérification immatriculation:', error);
    }
  };

  const handleInputChange = (field: keyof VehicleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'immatriculation') {
      const timeoutId = setTimeout(() => {
        checkImmatriculationExists(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
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
        return !!(formData.immatriculation && formData.marque && formData.modele && !immatWarning);
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return formData.assurance_type === 'tca' || !!(formData.assurance_compagnie && formData.assurance_numero_contrat);
      case 5:
        return true;
      case 6:
        return true;
      case 7:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(7, prev + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const cleanPayloadForInsert = (data: any) => {
    const cleaned = { ...data };

    const dateFields = ['date_premiere_mise_en_circulation', 'date_mise_en_service', 'derniere_maj_kilometrage'];
    dateFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null;
      }
    });

    const integerFields = ['annee', 'kilometrage_actuel'];
    integerFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const num = Number(cleaned[field]);
        cleaned[field] = isNaN(num) ? null : num;
      }
    });

    if (cleaned.materiel_embarque === '' || cleaned.materiel_embarque === undefined) {
      cleaned.materiel_embarque = null;
    }

    return cleaned;
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError('');
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

      const vehicleData = cleanPayloadForInsert({
        ...formData,
        derniere_maj_kilometrage: formData.kilometrage_actuel ? new Date().toISOString().split('T')[0] : null,
        materiel_embarque: equipments.filter(eq => eq.type && eq.quantite > 0),
        photo_path: photoPath,
      });

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
    } catch (error: any) {
      console.error('Erreur création véhicule:', JSON.stringify(error, null, 2));
      console.error('Erreur détaillée:', error);

      if (error?.code === '23505') {
        if (error.message?.includes('vehicule_immatriculation_key')) {
          setError(`L'immatriculation "${formData.immatriculation}" existe déjà. Veuillez en choisir une autre.`);
          setCurrentStep(1);
        } else {
          setError('Ce véhicule existe déjà dans la base de données.');
          setCurrentStep(1);
        }
      } else if (error?.code === '23503') {
        setError('Erreur : une référence liée est invalide.');
      } else if (error?.message) {
        setError(error.message);
      } else {
        setError('Erreur lors de la création du véhicule. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = (() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands;

    const score = (name: string) => {
      const n = name.toLowerCase();
      if (n.startsWith(q)) return 2;
      if (n.includes(q)) return 1;
      return -1;
    };

    return brands
      .filter(b => score(b.nom) >= 0)
      .sort((a, b) => score(b.nom) - score(a.nom) || a.nom.localeCompare(b.nom));
  })();

  const filteredModels = (() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return models;

    const score = (name: string) => {
      const n = name.toLowerCase();
      if (n.startsWith(q)) return 2;
      if (n.includes(q)) return 1;
      return -1;
    };

    return models
      .filter(m => score(m.nom) >= 0)
      .sort((a, b) => score(b.nom) - score(a.nom) || a.nom.localeCompare(b.nom));
  })();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.immatriculation}
                onChange={(e) => handleInputChange('immatriculation', e.target.value.toUpperCase())}
                placeholder="AB-123-CD ou AB123CD"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                  immatWarning
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              />
              {immatWarning ? (
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <X className="w-3 h-3 mr-1" />
                  {immatWarning}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Avec ou sans tirets</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marque <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={brandInputRef}
                    type="text"
                    value={brandSearch}
                    onChange={(e) => handleBrandInputChange(e.target.value)}
                    onFocus={() => setShowBrandDropdown(true)}
                    placeholder="Rechercher ou saisir une marque..."
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                {showBrandDropdown && filteredBrands.length > 0 && (
                  <div
                    ref={brandDropdownRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredBrands.slice(0, 50).map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => handleBrandSelect(brand)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-gray-700 group-hover:text-blue-600 font-medium">{brand.nom}</span>
                        {selectedBrandId === brand.id && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modèle <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={modelInputRef}
                    type="text"
                    value={modelSearch}
                    onChange={(e) => handleModelInputChange(e.target.value)}
                    onFocus={() => {
                      if (selectedBrandId || brandSearch) {
                        setShowModelDropdown(true);
                      }
                    }}
                    placeholder={selectedBrandId || brandSearch ? "Rechercher ou saisir un modèle..." : "Sélectionnez d'abord une marque"}
                    disabled={!selectedBrandId && !brandSearch}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                {showModelDropdown && filteredModels.length > 0 && (
                  <div
                    ref={modelDropdownRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredModels.slice(0, 50).map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleModelSelect(model)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-gray-700 group-hover:text-blue-600 font-medium">{model.nom}</span>
                        {selectedModelId === model.id && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de véhicule</label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="VL">VL - Véhicule Léger</option>
                <option value="VUL">VUL - Véhicule Utilitaire Léger</option>
                <option value="PL">PL - Poids Lourd</option>
                <option value="TC">TC - Transport en Commun</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Référence TCA</label>
              <input
                type="text"
                value={formData.reference_tca}
                onChange={(e) => handleInputChange('reference_tca', e.target.value)}
                placeholder="Ex: TCA-2024-001"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de 1ère mise en circulation
                </label>
                <input
                  type="date"
                  value={formData.date_premiere_mise_en_circulation}
                  onChange={(e) => handleInputChange('date_premiere_mise_en_circulation', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de mise en service
                </label>
                <input
                  type="date"
                  value={formData.date_mise_en_service}
                  onChange={(e) => handleInputChange('date_mise_en_service', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur du véhicule</label>
              <input
                type="text"
                value={formData.fournisseur}
                onChange={(e) => handleInputChange('fournisseur', e.target.value)}
                placeholder="Ex: Renault Trucks, Peugeot, Mercedes..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode d'acquisition</label>
              <select
                value={formData.mode_acquisition}
                onChange={(e) => handleInputChange('mode_acquisition', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">-- Sélectionner --</option>
                <option value="LLD">LLD - Location Longue Durée</option>
                <option value="LOA">LOA - Location avec Option d'Achat</option>
                <option value="LCD">LCD - Location Courte Durée</option>
                <option value="Achat pur">Achat pur</option>
                <option value="Prêt">Prêt</option>
                <option value="Location société">Location société</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.mode_acquisition === 'Achat pur' ? 'Prix d\'achat HT' : 'Prix HT'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prix_ht}
                  onChange={(e) => {
                    const prixHT = parseFloat(e.target.value);
                    handleInputChange('prix_ht', e.target.value);
                    if (!isNaN(prixHT)) {
                      handleInputChange('prix_ttc', (prixHT * 1.2).toFixed(2));
                    }
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.mode_acquisition === 'Achat pur' ? 'Prix d\'achat TTC (auto)' : 'Prix TTC (auto)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prix_ttc}
                  readOnly
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
            </div>

            {formData.mode_acquisition !== 'Achat pur' && formData.mode_acquisition !== '' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensualité HT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mensualite_ht}
                    onChange={(e) => {
                      const mensualiteHT = parseFloat(e.target.value);
                      handleInputChange('mensualite_ht', e.target.value);
                      if (!isNaN(mensualiteHT)) {
                        handleInputChange('mensualite_ttc', (mensualiteHT * 1.2).toFixed(2));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensualité TTC (auto)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mensualite_ttc}
                    readOnly
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            )}

            {formData.mode_acquisition !== 'Achat pur' && formData.mode_acquisition !== '' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée du contrat (en mois)</label>
                  <input
                    type="number"
                    value={formData.duree_contrat_mois}
                    onChange={(e) => handleInputChange('duree_contrat_mois', e.target.value)}
                    placeholder="Ex: 24, 36, 48..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date début contrat</label>
                    <input
                      type="date"
                      value={formData.date_debut_contrat}
                      onChange={(e) => handleInputChange('date_debut_contrat', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date fin prévue</label>
                    <input
                      type="date"
                      value={formData.date_fin_prevue_contrat}
                      onChange={(e) => handleInputChange('date_fin_prevue_contrat', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Type d'assurance</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.assurance_type === 'tca'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="tca"
                    checked={formData.assurance_type === 'tca'}
                    onChange={(e) => handleInputChange('assurance_type', e.target.value)}
                    className="mr-3 w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium text-gray-700">Assuré TCA</span>
                </label>
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.assurance_type === 'externe'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="externe"
                    checked={formData.assurance_type === 'externe'}
                    onChange={(e) => handleInputChange('assurance_type', e.target.value)}
                    className="mr-3 w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium text-gray-700">Assurance externe</span>
                </label>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compagnie d'assurance
                </label>
                <input
                  type="text"
                  value={formData.assurance_compagnie}
                  onChange={(e) => handleInputChange('assurance_compagnie', e.target.value)}
                  placeholder="Ex: AXA, Allianz, Groupama..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de contrat
                </label>
                <input
                  type="text"
                  value={formData.assurance_numero_contrat}
                  onChange={(e) => handleInputChange('assurance_numero_contrat', e.target.value)}
                  placeholder="Ex: 123456789"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Licence de transport
              </label>
              <input
                type="text"
                value={formData.licence_transport_numero}
                onChange={(e) => handleInputChange('licence_transport_numero', e.target.value)}
                placeholder="Numéro de licence"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Matériel embarqué</h3>
                <p className="text-sm text-gray-500 mt-1">Optionnel - Ajoutez les équipements du véhicule</p>
              </div>
              <button
                type="button"
                onClick={addEquipment}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </button>
            </div>

            {equipments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Aucun équipement ajouté</p>
                <p className="text-sm text-gray-400 mt-1">Cliquez sur "Ajouter" pour ajouter du matériel</p>
              </div>
            ) : (
              <div className="space-y-3">
                {equipments.map((eq, idx) => (
                  <div key={idx} className="flex gap-3 items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={eq.type}
                        onChange={(e) => updateEquipment(idx, 'type', e.target.value)}
                        placeholder="Type d'équipement (ex: siège bébé, GPS, etc.)"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        value={eq.quantite}
                        onChange={(e) => updateEquipment(idx, 'quantite', parseInt(e.target.value) || 1)}
                        min="1"
                        placeholder="Qté"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEquipment(idx)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-5 mt-6 space-y-4">
              <h4 className="text-base font-semibold text-gray-900">Carte essence</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fournisseur
                  </label>
                  <input
                    type="text"
                    value={formData.carte_essence_fournisseur}
                    onChange={(e) => handleInputChange('carte_essence_fournisseur', e.target.value)}
                    placeholder="Ex: Total, Shell, etc."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de carte essence
                  </label>
                  <input
                    type="text"
                    value={formData.carte_essence_numero}
                    onChange={(e) => handleInputChange('carte_essence_numero', e.target.value)}
                    placeholder="Ex: CE-123456"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.carte_essence_attribuee
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.carte_essence_attribuee}
                    onChange={(e) => handleInputChange('carte_essence_attribuee', e.target.checked)}
                    className="mr-3 w-4 h-4 text-green-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Carte essence attribuée au véhicule</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kilométrage actuel
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.kilometrage_actuel}
                  onChange={(e) => handleInputChange('kilometrage_actuel', e.target.value ? parseInt(e.target.value) : '')}
                  min="0"
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">km</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-start">
                <span className="text-blue-500 mr-1">ℹ</span>
                Ce kilométrage sera enregistré comme valeur initiale dans l'historique
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Photo du véhicule
              </label>
              {photoPreview ? (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                    <img src={photoPreview} alt="Aperçu" className="w-full h-64 object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview('');
                    }}
                    className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                    <span className="text-sm font-medium text-gray-700">Cliquez pour ajouter une photo</span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG (max 5MB)</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Documents optionnels</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Vous pouvez ajouter les documents maintenant ou plus tard depuis la fiche du véhicule
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {['carte_grise', 'assurance', 'carte_ris', 'controle_technique'].map((docType) => {
                const doc = documents.find(d => d.type === docType);
                const labels: Record<string, string> = {
                  carte_grise: 'Carte grise',
                  assurance: 'Assurance',
                  carte_ris: 'Carte CMI',
                  controle_technique: 'Contrôle technique',
                };

                return (
                  <div key={docType} className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <h4 className="font-semibold text-gray-900 mb-3">{labels[docType]}</h4>
                    {doc ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                          <div className="flex items-center flex-1 min-w-0">
                            <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{doc.file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(documents.indexOf(doc))}
                            className="ml-3 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {docType === 'carte_grise' ? (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Date d'émission</label>
                            <input
                              type="date"
                              value={doc.date_emission || ''}
                              onChange={(e) => updateDocumentDates(documents.indexOf(doc), 'date_emission', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date d'émission</label>
                              <input
                                type="date"
                                value={doc.date_emission || ''}
                                onChange={(e) => updateDocumentDates(documents.indexOf(doc), 'date_emission', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date d'expiration</label>
                              <input
                                type="date"
                                value={doc.date_expiration || ''}
                                onChange={(e) => updateDocumentDates(documents.indexOf(doc), 'date_expiration', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) addDocument(file, docType as DocumentFile['type']);
                          }}
                          className="hidden"
                          id={`doc-${docType}`}
                        />
                        <label
                          htmlFor={`doc-${docType}`}
                          className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <Plus className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Ajouter un fichier</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white px-8 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Nouveau véhicule</h2>
              <p className="text-blue-100 text-sm mt-0.5">Ajoutez un véhicule au parc</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                        isCompleted
                          ? 'bg-green-500 text-white shadow-green-200'
                          : isActive
                          ? 'bg-blue-600 text-white shadow-blue-200 ring-4 ring-blue-100'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span
                      className={`text-xs mt-2 text-center font-medium transition-colors ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-3 rounded-full transition-all ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
              <div className="flex-shrink-0">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="flex-shrink-0 ml-3 text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {renderStep()}
        </div>

        <div className="border-t border-gray-200 px-8 py-5 flex justify-between items-center bg-white">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-5 py-2.5 rounded-lg font-medium transition-all ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Précédent
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all ${
                  step.id === currentStep
                    ? 'w-8 bg-blue-600'
                    : step.id < currentStep
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className={`inline-flex items-center px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm ${
                validateStep(currentStep)
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Suivant
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !validateStep(currentStep)}
              className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Création en cours...</span>
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
