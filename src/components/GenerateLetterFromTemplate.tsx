import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileDown, X, Search, Download, FileText } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import {
  generateWordDocument,
  uploadGeneratedDocument,
  downloadWordDocument,
  prepareTemplateData
} from '../lib/wordTemplateGenerator';

interface Template {
  id: string;
  nom: string;
  type_courrier: string;
  variables_systeme: string[];
  variables_personnalisees: Record<string, any>;
  fichier_word_url?: string;
  utilise_template_word?: boolean;
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  pays?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  pays_naissance?: string;
  numero_securite_sociale?: string;
  iban?: string;
  genre?: string;
  poste?: any;
  site?: any;
  secteur?: any;
  salaire?: string;
  type_contrat?: string;
  duree_travail?: string;
  date_debut?: string;
  date_fin?: string;
}

interface GeneratedLetter {
  id: string;
  modele_id: string;
  profil_id: string;
  fichier_word_genere_url?: string;
  variables_utilisees: Record<string, any>;
  created_at: string;
  modele_courrier: { nom: string };
  profil: { nom: string; prenom: string; matricule: string };
}

export function GenerateLetterFromTemplate() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [customVariables, setCustomVariables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchProfile, setSearchProfile] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, profilesRes, lettersRes] = await Promise.all([
        supabase
          .from('modele_courrier')
          .select('*')
          .eq('actif', true)
          .eq('utilise_template_word', true)
          .order('nom'),
        supabase
          .from('profil')
          .select('*, poste:poste_id(nom), site:site_id(nom), secteur:secteur_id(nom)')
          .order('nom'),
        supabase
          .from('courrier_genere')
          .select('*, modele_courrier(nom), profil(nom, prenom, matricule)')
          .not('fichier_word_genere_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (lettersRes.data) setGeneratedLetters(lettersRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLetter = async () => {
    if (!selectedTemplate || !selectedProfile) {
      alert('Veuillez sélectionner un modèle et un profil');
      return;
    }

    if (!selectedTemplate.fichier_word_url) {
      alert('Ce modèle ne contient pas de fichier Word');
      return;
    }

    setGenerating(true);

    try {
      const templateData = prepareTemplateData(selectedProfile, customVariables);

      const blob = await generateWordDocument(
        selectedTemplate.fichier_word_url,
        templateData
      );

      const filename = `${selectedTemplate.nom}_${selectedProfile.matricule}_${Date.now()}.docx`;

      const fileUrl = await uploadGeneratedDocument(blob, filename);

      const { error: insertError } = await supabase
        .from('courrier_genere')
        .insert({
          modele_id: selectedTemplate.id,
          profil_id: selectedProfile.id,
          fichier_word_genere_url: fileUrl,
          variables_utilisees: templateData,
          type_courrier: selectedTemplate.type_courrier,
          contenu: `Document Word généré: ${filename}`
        });

      if (insertError) throw insertError;

      downloadWordDocument(blob, filename);

      alert('Document généré avec succès!');

      setSelectedTemplate(null);
      setSelectedProfile(null);
      setCustomVariables({});
      fetchData();
    } catch (error) {
      console.error('Erreur génération courrier:', error);
      alert('Erreur lors de la génération du document: ' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadLetter = async (letter: GeneratedLetter) => {
    if (!letter.fichier_word_genere_url) return;

    try {
      const response = await fetch(letter.fichier_word_genere_url);
      const blob = await response.blob();
      const filename = letter.fichier_word_genere_url.split('/').pop() || 'document.docx';
      downloadWordDocument(blob, filename);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      alert('Erreur lors du téléchargement du document');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.nom.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  const filteredProfiles = profiles.filter(p =>
    `${p.nom} ${p.prenom} ${p.matricule}`.toLowerCase().includes(searchProfile.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Générer un Courrier Word</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un modèle Word
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un modèle..."
                value={searchTemplate}
                onChange={(e) => setSearchTemplate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucun modèle Word disponible
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template);
                      const vars: Record<string, any> = {};
                      Object.keys(template.variables_personnalisees || {}).forEach(key => {
                        vars[key] = '';
                      });
                      setCustomVariables(vars);
                    }}
                    className={`w-full text-left p-3 hover:bg-blue-50 transition-colors border-b last:border-b-0 ${
                      selectedTemplate?.id === template.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{template.nom}</div>
                        <div className="text-xs text-gray-500">
                          {template.variables_systeme?.length || 0} variables système,{' '}
                          {Object.keys(template.variables_personnalisees || {}).length} personnalisées
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                        Word
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un employé
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={searchProfile}
                onChange={(e) => setSearchProfile(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {filteredProfiles.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucun employé trouvé
                </div>
              ) : (
                filteredProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full text-left p-3 hover:bg-blue-50 transition-colors border-b last:border-b-0 ${
                      selectedProfile?.id === profile.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {profile.prenom} {profile.nom}
                    </div>
                    <div className="text-xs text-gray-500">
                      {profile.matricule} - {profile.poste?.nom || 'N/A'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {selectedTemplate && Object.keys(selectedTemplate.variables_personnalisees || {}).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Variables personnalisées</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(selectedTemplate.variables_personnalisees).map(([key, config]: [string, any]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {config.label || key}
                  </label>
                  <input
                    type={config.type || 'text'}
                    value={customVariables[key] || ''}
                    onChange={(e) => setCustomVariables({ ...customVariables, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleGenerateLetter}
            disabled={!selectedTemplate || !selectedProfile || generating}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Génération en cours...</span>
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                <span>Générer le Document Word</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">Documents générés récents</h3>
        </div>
        <div className="divide-y">
          {generatedLetters.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Aucun document généré
            </div>
          ) : (
            generatedLetters.map((letter) => (
              <div key={letter.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {letter.modele_courrier?.nom}
                      </div>
                      <div className="text-sm text-gray-500">
                        {letter.profil?.prenom} {letter.profil?.nom} ({letter.profil?.matricule})
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(letter.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadLetter(letter)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
