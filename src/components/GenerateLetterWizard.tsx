import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Search, ChevronRight, ChevronLeft, FileText, Eye, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { SuccessStep } from './SuccessStep';
import {
  formatProfileData,
  replaceAllVariables,
  uploadLetterPDF,
  saveGeneratedLetter
} from '../lib/letterTemplateGenerator';
import { generateAdministrativeLetter } from '../lib/administrativeLetterGenerator';
import { sanitizeFileName } from '../utils/fileNameSanitizer';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  matricule_tca: string;
  email: string;
  tel: string;
  poste: string;
  site: { nom: string } | null;
  secteur: { nom: string } | null;
  [key: string]: any;
}

interface LetterTemplate {
  id: string;
  nom: string;
  type_courrier: string;
  sujet: string;
  contenu: string;
  variables_systeme: string[];
  variables_personnalisees: Record<string, any>;
  utilise_template_word?: boolean;
  fichier_word_url?: string;
}

interface GenerateLetterWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

interface PreviousWarning {
  id: string;
  modele_nom: string;
  variables_remplies: Record<string, any>;
  created_at: string;
}

interface WarningsInfo {
  found: number;
  required: number;
  autofilled: string[];
}

export function GenerateLetterWizard({ onClose, onComplete }: GenerateLetterWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [searchProfile, setSearchProfile] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [loadingWarnings, setLoadingWarnings] = useState(false);
  const [warningsInfo, setWarningsInfo] = useState<WarningsInfo | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (step === 1) {
      fetchProfiles();
    } else if (step === 2) {
      fetchTemplates();
    }
  }, [step]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('*, site:site_id(nom), secteur:secteur_id(nom), genre')
        .order('nom', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Erreur chargement profils:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modele_courrier')
        .select('*')
        .eq('actif', true)
        .order('nom', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Erreur chargement modèles:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  const detectWarningLevel = (templateName: string): number => {
    const lowerName = templateName.toLowerCase();

    if (lowerName.includes('3ème') || lowerName.includes('3eme') || lowerName.includes('troisième') || lowerName.includes('troisieme')) {
      return 3;
    }
    if (lowerName.includes('2ème') || lowerName.includes('2eme') || lowerName.includes('deuxième') || lowerName.includes('deuxieme')) {
      return 2;
    }
    return 1;
  };

  const fetchPreviousVehicleWarnings = async (employeeId: string): Promise<PreviousWarning[]> => {
    try {
      const { data, error } = await supabase
        .from('courrier_genere')
        .select('id, modele_nom, variables_remplies, created_at')
        .eq('profil_id', employeeId)
        .ilike('modele_nom', '%Avertissement%utilisation du vehicule%')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur lors de la récupération des avertissements:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Erreur fetchPreviousVehicleWarnings:', err);
      return [];
    }
  };

  const mapPreviousWarningsToVariables = (
    warnings: PreviousWarning[],
    currentLevel: number
  ): Record<string, any> => {
    const mappedValues: Record<string, any> = {};

    if (currentLevel === 2 && warnings.length >= 1) {
      const first = warnings[0];
      mappedValues['date_1er_courrier'] = formatDateForDisplay(first.created_at);

      if (first.variables_remplies?.description_faits) {
        mappedValues['liste_infractions_1er'] = first.variables_remplies.description_faits;
      } else if (first.variables_remplies?.liste_infractions) {
        mappedValues['liste_infractions_1er'] = first.variables_remplies.liste_infractions;
      }
    }

    if (currentLevel === 3 && warnings.length >= 2) {
      const first = warnings[0];
      const second = warnings[1];

      mappedValues['date_1er_courrier'] = formatDateForDisplay(first.created_at);
      mappedValues['date_2eme_courrier'] = formatDateForDisplay(second.created_at);
      mappedValues['date_dernier_avertissement'] = formatDateForDisplay(second.created_at);

      if (first.variables_remplies?.description_faits) {
        mappedValues['liste_infractions_1er'] = first.variables_remplies.description_faits;
      } else if (first.variables_remplies?.liste_infractions) {
        mappedValues['liste_infractions_1er'] = first.variables_remplies.liste_infractions;
      }

      if (second.variables_remplies?.description_faits) {
        mappedValues['liste_infractions_2eme'] = second.variables_remplies.description_faits;
      } else if (second.variables_remplies?.liste_infractions) {
        mappedValues['liste_infractions_2eme'] = second.variables_remplies.liste_infractions;
      }
    }

    return mappedValues;
  };

  const handleTemplateSelection = async (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setWarningsInfo(null);

    const templateName = template.nom.toLowerCase();
    const isVehicleWarning = templateName.includes('avertissement') &&
                             templateName.includes('utilisation du vehicule');

    if (!isVehicleWarning || !selectedProfile) {
      return;
    }

    const level = detectWarningLevel(template.nom);

    if (level === 1) {
      return;
    }

    setLoadingWarnings(true);

    try {
      const warnings = await fetchPreviousVehicleWarnings(selectedProfile.id);

      const requiredWarnings = level - 1;
      const autofilledFields: string[] = [];

      if (warnings.length >= requiredWarnings) {
        const mappedValues = mapPreviousWarningsToVariables(warnings, level);

        setCustomValues(prev => ({
          ...prev,
          ...mappedValues
        }));

        Object.keys(mappedValues).forEach(key => {
          if (mappedValues[key]) {
            autofilledFields.push(key);
          }
        });

        setWarningsInfo({
          found: warnings.length,
          required: requiredWarnings,
          autofilled: autofilledFields
        });

        console.log(`✓ ${warnings.length} avertissement(s) trouvé(s), ${autofilledFields.length} champ(s) pré-rempli(s)`);
      } else {
        setWarningsInfo({
          found: warnings.length,
          required: requiredWarnings,
          autofilled: []
        });

        console.warn(`Attention: Seulement ${warnings.length} avertissement(s) trouvé(s) sur ${requiredWarnings} requis`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des avertissements précédents:', err);
    } finally {
      setLoadingWarnings(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    `${p.prenom} ${p.nom} ${p.matricule_tca} ${p.email}`.toLowerCase().includes(searchProfile.toLowerCase())
  );

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.nom.toLowerCase().includes(searchTemplate.toLowerCase());
    const matchType = filterType === 'all' || t.type_courrier === filterType;
    return matchSearch && matchType;
  });

  const uniqueTypes = [...new Set(templates.map(t => t.type_courrier))];

  const handleNext = () => {
    if (step === 1 && !selectedProfile) {
      setError('Veuillez sélectionner un salarié');
      return;
    }
    if (step === 2 && !selectedTemplate) {
      setError('Veuillez sélectionner un modèle');
      return;
    }
    if (step === 3) {
      handleGenerate();
      return;
    }

    setError('');
    setStep((step + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setError('');
    setStep((step - 1) as 1 | 2 | 3 | 4);
  };

  const validateCustomValues = (): boolean => {
    if (!selectedTemplate) return false;

    const errors: string[] = [];
    Object.entries(selectedTemplate.variables_personnalisees).forEach(([name, config]) => {
      if (config.required && (!customValues[name] || customValues[name] === '')) {
        errors.push(config.label);
      }
    });

    if (errors.length > 0) {
      setError(`Champs requis manquants: ${errors.join(', ')}`);
      return false;
    }

    return true;
  };

  const getPreviewContent = (): { subject: string, content: string } => {
    if (!selectedProfile || !selectedTemplate) return { subject: '', content: '' };

    const systemValues = formatProfileData(selectedProfile);
    const subject = replaceAllVariables(selectedTemplate.sujet, systemValues, customValues);
    const content = replaceAllVariables(selectedTemplate.contenu, systemValues, customValues);

    return { subject, content };
  };

  const handleGenerate = async () => {
    if (!validateCustomValues()) return;
    if (!selectedProfile || !selectedTemplate || !user) return;

    setGenerating(true);
    setError('');

    try {
      console.log('=== DÉBUT GÉNÉRATION ===');
      console.log('Profil:', selectedProfile.prenom, selectedProfile.nom);
      console.log('Modèle:', selectedTemplate.nom);
      console.log('Variables personnalisées:', customValues);

      // Récupérer l'ID app_utilisateur à partir de auth.users.id
      const { data: appUser, error: appUserError } = await supabase
        .from('app_utilisateur')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (appUserError) {
        console.warn('Attention: Utilisateur non trouvé dans app_utilisateur:', appUserError);
      }

      const systemValues = formatProfileData(selectedProfile);
      const { subject, content } = getPreviewContent();

      const allVariables = {
        ...systemValues,
        ...customValues
      };

      console.log('Toutes les variables préparées:', Object.keys(allVariables));

      console.log('=== GÉNÉRATION COURRIER ADMINISTRATIF ===');
      console.log('Genre du profil:', selectedProfile.genre);
      console.log('Civilité détectée:', systemValues.civilite);

      const civilite = systemValues.civilite || 'Madame, Monsieur';
      console.log('Civilité utilisée pour le PDF:', civilite);

      const pdfBlob = await generateAdministrativeLetter({
        recipient: {
          civilite: civilite as 'Madame' | 'Monsieur' | 'Madame, Monsieur',
          nom: selectedProfile.nom,
          prenom: selectedProfile.prenom,
          adresse: selectedProfile.adresse || undefined,
          code_postal: selectedProfile.code_postal || undefined,
          ville: selectedProfile.ville || undefined
        },
        object: subject,
        content: content,
        signature: {
          nom: user.user_metadata?.nom || 'Direction',
          prenom: user.user_metadata?.prenom,
          fonction: 'La Direction des Ressources Humaines'
        },
        options: {
          date: new Date(),
          lieu: 'Paris',
          showPageNumbers: true,
          showFooter: true
        }
      });

      console.log('Courrier administratif généré, taille:', pdfBlob.size, 'bytes');

      const pdfUrl = await uploadLetterPDF(
        pdfBlob,
        selectedProfile.id,
        selectedTemplate.nom
      );

      await saveGeneratedLetter(
        selectedProfile.id,
        selectedTemplate.id,
        selectedTemplate.nom,
        subject,
        content,
        allVariables,
        pdfUrl,
        appUser?.id || null
      );

      console.log('Enregistré en base de données');

      const rawFileName = `${selectedTemplate.nom}_${selectedProfile.nom}_${new Date().toLocaleDateString('fr-FR')}.pdf`;
      const fileName = sanitizeFileName(rawFileName);
      setGeneratedPdfBlob(pdfBlob);
      setGeneratedFileName(fileName);

      console.log('=== PDF GÉNÉRÉ AVEC SUCCÈS ===')

      setStep(4);
    } catch (err: any) {
      console.error('=== ERREUR GÉNÉRATION ===', err);
      const errorMessage = err.message || 'Erreur inconnue lors de la génération du courrier';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Générer un Courrier - Étape {step}/4</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className={`flex-1 text-center ${step >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              1. Salarié
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex-1 text-center ${step >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              2. Modèle
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex-1 text-center ${step >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              3. Génération
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex-1 text-center ${step >= 4 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
              4. Succès
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Sélectionnez le salarié</h3>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchProfile}
                  onChange={(e) => setSearchProfile(e.target.value)}
                  placeholder="Rechercher par nom, prénom, matricule..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedProfile && (
                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-blue-600 font-medium mb-1">✓ Salarié sélectionné</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedProfile.prenom} {selectedProfile.nom}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {selectedProfile.poste} • {selectedProfile.site?.nom || '-'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Matricule: {selectedProfile.matricule_tca}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProfile(null)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Changer
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredProfiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedProfile?.id === profile.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="font-medium text-gray-900">
                        {profile.prenom} {profile.nom}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {profile.poste} • {profile.site?.nom || '-'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Matricule: {profile.matricule_tca}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Choisissez un modèle</h3>
                <p className="text-sm text-gray-600">
                  Salarié: <span className="font-medium">{selectedProfile?.prenom} {selectedProfile?.nom}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTemplate}
                    onChange={(e) => setSearchTemplate(e.target.value)}
                    placeholder="Rechercher un modèle..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {loadingWarnings && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-blue-700">
                    Recherche des avertissements précédents...
                  </span>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelection(template)}
                      disabled={loadingWarnings}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        } ${loadingWarnings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="font-medium text-gray-900 truncate"
                              title={template.nom}
                            >
                              {template.nom}
                            </div>
                          </div>
                          {template.sujet && (
                            <div className="text-xs text-gray-500 mb-2 line-clamp-2" title={template.sujet}>
                              {template.sujet}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              {template.type_courrier}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            Variables système: {template.variables_systeme.length}
                          </div>
                          <div className="text-xs text-gray-600">
                            Variables à remplir: {Object.keys(template.variables_personnalisees).length}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && generatedPdfBlob && (
            <SuccessStep
              pdfBlob={generatedPdfBlob}
              fileName={generatedFileName}
              onClose={() => {
                onComplete();
                onClose();
              }}
            />
          )}

          {step === 3 && selectedProfile && selectedTemplate && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Remplissez les informations</h3>
                <p className="text-sm text-gray-600">
                  Modèle: <span className="font-medium">{selectedTemplate.nom}</span> • Salarié: <span className="font-medium">{selectedProfile.prenom} {selectedProfile.nom}</span>
                </p>
              </div>

              {warningsInfo && warningsInfo.autofilled.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        {warningsInfo.found} avertissement(s) précédent(s) trouvé(s) - Champs pré-remplis automatiquement
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {warningsInfo.autofilled.map(field => (
                          <span
                            key={field}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            <Info className="w-3 h-3" />
                            {field}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-blue-700 mt-2">
                        Vous pouvez modifier ces valeurs si nécessaire
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {warningsInfo && warningsInfo.found < warningsInfo.required && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-orange-900 mb-1">
                        Attention: Avertissements précédents manquants
                      </div>
                      <div className="text-sm text-orange-700">
                        Seulement {warningsInfo.found} avertissement(s) trouvé(s) sur {warningsInfo.required} requis.
                        Veuillez vérifier les données et remplir manuellement les champs manquants.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800 mb-2">
                  ✓ Variables automatiques ({selectedTemplate.variables_systeme.length})
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {selectedTemplate.variables_systeme.slice(0, 9).map(v => (
                    <div key={v} className="text-green-700 font-mono">{v}</div>
                  ))}
                  {selectedTemplate.variables_systeme.length > 9 && (
                    <div className="text-green-700">+{selectedTemplate.variables_systeme.length - 9} autres</div>
                  )}
                </div>
              </div>

              {Object.keys(selectedTemplate.variables_personnalisees).length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    Variables à compléter ({Object.keys(selectedTemplate.variables_personnalisees).length})
                  </div>

                  <div className="space-y-4">
                    {Object.entries(selectedTemplate.variables_personnalisees)
                      .sort(([, a], [, b]) => (a.ordre || 0) - (b.ordre || 0))
                      .map(([name, config]) => {
                        const isAutofilled = warningsInfo?.autofilled.includes(name) || false;
                        return (
                          <div key={name}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                              <span>
                                {config.label} {config.required && <span className="text-red-600">*</span>}
                              </span>
                              {isAutofilled && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  <Sparkles className="w-3 h-3" />
                                  Pré-rempli
                                </span>
                              )}
                            </label>

                          {config.type === 'textarea' ? (
                            <textarea
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required={config.required}
                            />
                          ) : config.type === 'date' ? (
                            <DatePicker
                              value={customValues[name] || ''}
                              onChange={(value) => setCustomValues({ ...customValues, [name]: value })}
                              required={config.required}
                            />
                          ) : config.type === 'time' ? (
                            <TimePicker
                              value={customValues[name] || ''}
                              onChange={(value) => setCustomValues({ ...customValues, [name]: value })}
                              required={config.required}
                            />
                          ) : config.type === 'datetime' ? (
                            <div className="space-y-2">
                              <DatePicker
                                value={customValues[`${name}_date`] || ''}
                                onChange={(value) => setCustomValues({
                                  ...customValues,
                                  [`${name}_date`]: value,
                                  [name]: `${value} ${customValues[`${name}_time`] || '00:00'}`
                                })}
                                required={config.required}
                                placeholder="Date"
                              />
                              <TimePicker
                                value={customValues[`${name}_time`] || ''}
                                onChange={(value) => setCustomValues({
                                  ...customValues,
                                  [`${name}_time`]: value,
                                  [name]: `${customValues[`${name}_date`] || ''} ${value}`
                                })}
                                required={config.required}
                                placeholder="Heure"
                              />
                            </div>
                          ) : config.type === 'number' ? (
                            <input
                              type="number"
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required={config.required}
                            />
                          ) : config.type === 'select' ? (
                            <select
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required={config.required}
                            >
                              <option value="">Sélectionnez...</option>
                              {config.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : config.type === 'boolean' ? (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={customValues[name] || false}
                                onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-600">Oui</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required={config.required}
                            />
                          )}

                          {config.type === 'date' && (
                            <p className="mt-1 text-xs text-gray-500">Format: JJ/MM/AAAA</p>
                          )}
                          {config.type === 'time' && (
                            <p className="mt-1 text-xs text-gray-500">Format: HH:MM (ex: 14:30)</p>
                          )}
                        </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {!showPreview ? (
                <button
                  onClick={() => setShowPreview(true)}
                  className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Voir l'aperçu du courrier
                </button>
              ) : (
                <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-blue-900">Aperçu du courrier généré</div>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Masquer
                    </button>
                  </div>
                  <div className="bg-white rounded p-4 max-h-64 overflow-y-auto">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      Objet: {getPreviewContent().subject}
                    </div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {getPreviewContent().content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {step !== 4 && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
            <div>
              {step > 1 && (
                <button
                  onClick={handleBack}
                  disabled={generating}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={generating}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleNext}
                disabled={generating || (step === 1 && !selectedProfile) || (step === 2 && !selectedTemplate)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Génération en cours...
                  </>
                ) : step === 3 ? (
                  'Générer le PDF Professionnel'
                ) : (
                  <>
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
