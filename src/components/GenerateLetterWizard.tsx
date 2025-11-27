import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Search, ChevronRight, ChevronLeft, FileText, Eye } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import {
  formatProfileData,
  replaceAllVariables,
  generatePDF,
  uploadLetterPDF,
  saveGeneratedLetter
} from '../lib/letterTemplateGenerator';

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
}

interface GenerateLetterWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export function GenerateLetterWizard({ onClose, onComplete }: GenerateLetterWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
        .select('*, site:site_id(nom), secteur:secteur_id(nom)')
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
    setStep((step - 1) as 1 | 2 | 3);
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
      // Récupérer l'ID app_utilisateur à partir de auth.users.id
      const { data: appUser } = await supabase
        .from('app_utilisateur')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      const systemValues = formatProfileData(selectedProfile);
      const { subject, content } = getPreviewContent();

      const allVariables = {
        ...systemValues,
        ...customValues
      };

      const pdfBlob = await generatePDF(
        content,
        subject,
        `${selectedProfile.prenom} ${selectedProfile.nom}`
      );

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

      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplate.nom}_${selectedProfile.nom}_${new Date().toLocaleDateString('fr-FR')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onComplete();
    } catch (err: any) {
      console.error('Erreur génération:', err);
      setError(err.message || 'Erreur lors de la génération du courrier');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Générer un Courrier - Étape {step}/3</h2>
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

              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{template.nom}</div>
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

          {step === 3 && selectedProfile && selectedTemplate && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Remplissez les informations</h3>
                <p className="text-sm text-gray-600">
                  Modèle: <span className="font-medium">{selectedTemplate.nom}</span> • Salarié: <span className="font-medium">{selectedProfile.prenom} {selectedProfile.nom}</span>
                </p>
              </div>

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
                      .map(([name, config]) => (
                        <div key={name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {config.label} {config.required && <span className="text-red-600">*</span>}
                          </label>

                          {config.type === 'textarea' ? (
                            <textarea
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          ) : config.type === 'date' ? (
                            <input
                              type="date"
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          ) : config.type === 'number' ? (
                            <input
                              type="number"
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          ) : config.type === 'select' ? (
                            <select
                              value={customValues[name] || ''}
                              onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            />
                          )}
                        </div>
                      ))}
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
                  Génération...
                </>
              ) : step === 3 ? (
                'Générer et Télécharger PDF'
              ) : (
                <>
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
