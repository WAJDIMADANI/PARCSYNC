import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, ChevronRight, ChevronLeft, FileText, AlertTriangle, CheckCircle2, Calendar, Clock } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { useLetterTemplatesV2, LetterTemplateV2 } from '../hooks/useLetterTemplatesV2';
import { useLetterGeneration } from '../lib/useLetterGeneration';
import { formatProfileData, extractVariables } from '../lib/letterTemplateGenerator';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  matricule_tca: string;
  email: string;
  tel: string;
  poste: string;
  genre: string;
  site: { nom: string } | null;
  secteur: { nom: string } | null;
  [key: string]: any;
}

interface GenerateLetterV2WizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export function GenerateLetterV2Wizard({ onClose, onComplete }: GenerateLetterV2WizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplateV2 | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [autoFilledVars, setAutoFilledVars] = useState<string[]>([]);
  const [searchProfile, setSearchProfile] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { templates, loading: loadingTemplates } = useLetterTemplatesV2();
  const { loading: generating, error: generationError, generateLetter, downloadGeneratedLetter } = useLetterGeneration();

  useEffect(() => {
    if (step === 1) {
      fetchProfiles();
    }
  }, [step]);

  useEffect(() => {
    if (selectedProfile && selectedTemplate) {
      autoFillVariables();
    }
  }, [selectedProfile, selectedTemplate]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('*, site:site_id(nom), secteur:secteur_id(nom)')
        .order('nom', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Erreur chargement profils:', err);
      setError('Erreur lors du chargement des profils');
    } finally {
      setLoading(false);
    }
  };

  const autoFillVariables = () => {
    if (!selectedProfile || !selectedTemplate) return;

    const profileData = formatProfileData(selectedProfile);
    const newValues: Record<string, string> = {};
    const autoFilled: string[] = [];

    // Collecter les variables du template
    const variables = [...selectedTemplate.variables_detectees];

    // Si adresse ou code_postal est présent, ajouter ville automatiquement
    const hasAdresseFields = variables.some(v => v === 'adresse' || v === 'code_postal');
    if (hasAdresseFields && !variables.includes('ville')) {
      variables.push('ville');
    }

    variables.forEach(varName => {
      if (profileData[varName]) {
        newValues[varName] = profileData[varName];
        autoFilled.push(varName);
      } else {
        newValues[varName] = '';
      }
    });

    setVariableValues(newValues);
    setAutoFilledVars(autoFilled);
  };

  const isDateVariable = (varName: string): boolean => {
    const lowerName = varName.toLowerCase();
    return lowerName.includes('date') || lowerName.includes('jour');
  };

  const isTimeVariable = (varName: string): boolean => {
    const lowerName = varName.toLowerCase();
    return lowerName.includes('heure') || lowerName.includes('time');
  };

  const getDisplayVariables = (): string[] => {
    if (!selectedTemplate) return [];

    const variables = [...selectedTemplate.variables_detectees];

    // Si adresse ou code_postal est présent, ajouter ville automatiquement
    const hasAdresseFields = variables.some(v => v === 'adresse' || v === 'code_postal');
    if (hasAdresseFields && !variables.includes('ville')) {
      variables.push('ville');
    }

    return variables;
  };

  const getVariableInputType = (varName: string): 'date' | 'time' | 'text' => {
    if (isDateVariable(varName)) return 'date';
    if (isTimeVariable(varName)) return 'time';
    return 'text';
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedProfile) return;

    setError('');
    setLoading(true);

    try {
      if (!selectedTemplate.fichier_word_url) {
        throw new Error('Fichier Word manquant pour ce modèle');
      }

      const blob = await generateLetter(
        {
          templateId: selectedTemplate.id,
          variables: variableValues,
          outputFormat: 'docx'
        },
        selectedTemplate.fichier_word_url.split('/').pop() || '',
        selectedTemplate.nom
      );

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFileName = `${selectedTemplate.nom}_${selectedProfile.nom}_${selectedProfile.prenom}_${timestamp}`;
      const docxFileName = `${baseFileName}.docx`;
      const storageFileName = `${Date.now()}_${docxFileName}`;

      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[courrier-v2] Auth error:', authError);
        throw authError || new Error('Utilisateur non authentifié');
      }
      console.log('[courrier-v2] auth uid', user.id);

      // Récupérer l'app_utilisateur.id correspondant
      const { data: appUser, error: appUserError } = await supabase
        .from('app_utilisateur')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (appUserError || !appUser) {
        console.error('[courrier-v2] app_utilisateur introuvable:', appUserError);
        throw appUserError || new Error('app_utilisateur introuvable pour cet utilisateur');
      }
      console.log('[courrier-v2] appUser.id', appUser.id);

      const { error: uploadError } = await supabase.storage
        .from('courriers')
        .upload(storageFileName, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('courriers')
        .getPublicUrl(storageFileName);

      const payload = {
        profil_id: selectedProfile.id,
        modele_courrier_id: selectedTemplate.id,
        modele_nom: selectedTemplate.nom,
        sujet: selectedTemplate.nom,
        contenu_genere: JSON.stringify(variableValues),
        variables_remplies: variableValues,
        fichier_pdf_url: publicUrlData.publicUrl,
        status: 'generated',
        created_by: appUser.id
      };

      console.log('[courrier-v2] payload.created_by', payload.created_by);

      const { error: dbError } = await supabase
        .from('courrier_genere')
        .insert(payload);

      if (dbError) {
        console.error('[courrier-v2] insert error', dbError);
        throw dbError;
      }

      downloadGeneratedLetter(blob, docxFileName);

      onComplete();

      setStep(4);
    } catch (err) {
      console.error('Erreur génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = (): boolean => {
    if (!selectedTemplate) return false;

    const requiredVars = selectedTemplate.variables_requises || [];
    return requiredVars.every(varName => {
      const value = variableValues[varName];
      return value && value.trim().length > 0;
    });
  };

  const filteredProfiles = profiles.filter(p =>
    `${p.prenom} ${p.nom} ${p.matricule_tca}`.toLowerCase().includes(searchProfile.toLowerCase())
  );

  const activeTemplates = templates.filter(t => t.actif);
  const filteredTemplates = activeTemplates.filter(t =>
    t.nom.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((stepNum) => (
        <div key={stepNum} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
            step === stepNum
              ? 'bg-blue-600 text-white'
              : step > stepNum
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {step > stepNum ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
          </div>
          {stepNum < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              step > stepNum ? 'bg-green-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">1. Sélectionnez un salarié</h2>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, matricule..."
            value={searchProfile}
            onChange={(e) => setSearchProfile(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Chargement des salariés..." />
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                selectedProfile?.id === profile.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {profile.prenom} {profile.nom}
                  </p>
                  <p className="text-sm text-gray-600">
                    {profile.matricule_tca} - {profile.poste}
                  </p>
                  {profile.site && (
                    <p className="text-xs text-gray-500">{profile.site.nom}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Annuler
        </button>
        <button
          onClick={() => setStep(2)}
          disabled={!selectedProfile}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">2. Sélectionnez un modèle</h2>

      {selectedProfile && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            Salarié : {selectedProfile.prenom} {selectedProfile.nom}
          </p>
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un modèle..."
            value={searchTemplate}
            onChange={(e) => setSearchTemplate(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loadingTemplates ? (
        <LoadingSpinner size="lg" text="Chargement des modèles..." />
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{template.nom}</p>
                  <p className="text-sm text-gray-600">
                    {template.variables_detectees.length} variable(s) détectée(s)
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between gap-3 mt-6">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!selectedTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">3. Remplissez les informations</h2>

      {selectedProfile && selectedTemplate && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            Modèle : {selectedTemplate.nom} - Salarié : {selectedProfile.prenom} {selectedProfile.nom}
          </p>
        </div>
      )}

      {autoFilledVars.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Variables automatiques ({autoFilledVars.length})
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {generationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{generationError}</p>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {getDisplayVariables().map((varName) => {
          const isAutoFilled = autoFilledVars.includes(varName);
          const isRequired = selectedTemplate?.variables_requises?.includes(varName);
          const inputType = getVariableInputType(varName);

          return (
            <div key={varName} className={`p-3 rounded-lg ${
              isAutoFilled ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-300'
            }`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  {inputType === 'date' && <Calendar className="w-4 h-4 text-blue-600" />}
                  {inputType === 'time' && <Clock className="w-4 h-4 text-blue-600" />}
                  <span>{varName}</span>
                  {isRequired && <span className="text-red-500">*</span>}
                  {isAutoFilled && (
                    <span className="text-xs text-green-600 font-normal">(rempli automatiquement)</span>
                  )}
                </div>
              </label>

              {inputType === 'date' ? (
                <div>
                  <DatePicker
                    value={variableValues[varName] || ''}
                    onChange={(date) => setVariableValues({
                      ...variableValues,
                      [varName]: date
                    })}
                    placeholder={`Sélectionnez ${varName}`}
                    className={isAutoFilled ? 'bg-green-50' : ''}
                  />
                  {variableValues[varName] && (
                    <p className="mt-1 text-sm text-gray-600">
                      Sélectionné : <span className="font-medium text-gray-900">{variableValues[varName]}</span>
                    </p>
                  )}
                </div>
              ) : inputType === 'time' ? (
                <div>
                  <TimePicker
                    value={variableValues[varName] || ''}
                    onChange={(time) => setVariableValues({
                      ...variableValues,
                      [varName]: time
                    })}
                    placeholder={`Sélectionnez ${varName}`}
                    className={isAutoFilled ? 'bg-green-50' : ''}
                  />
                  {variableValues[varName] && (
                    <p className="mt-1 text-sm text-gray-600">
                      Sélectionné : <span className="font-medium text-gray-900">{variableValues[varName]}</span>
                    </p>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={variableValues[varName] || ''}
                  onChange={(e) => setVariableValues({
                    ...variableValues,
                    [varName]: e.target.value
                  })}
                  placeholder={`Entrez ${varName}`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isAutoFilled ? 'bg-green-50 border-green-300' : 'border-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <button
          onClick={() => setStep(2)}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate() || generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <LoadingSpinner size="sm" />
              Génération...
            </>
          ) : (
            'Générer le PDF Professionnel'
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Courrier généré avec succès !</h2>
      <p className="text-gray-600 mb-2">
        Le courrier pour {selectedProfile?.prenom} {selectedProfile?.nom} a été généré et téléchargé.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 mx-8">
        <p className="text-sm text-blue-800">
          Le courrier a été enregistré et est maintenant disponible dans l'onglet <span className="font-semibold">Courriers</span>.
        </p>
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => {
            setStep(1);
            setSelectedProfile(null);
            setSelectedTemplate(null);
            setVariableValues({});
            setAutoFilledVars([]);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Générer un autre courrier
        </button>
        <button
          onClick={() => {
            onComplete();
            onClose();
          }}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Fermer
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Générer un Courrier</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {renderStepIndicator()}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}
