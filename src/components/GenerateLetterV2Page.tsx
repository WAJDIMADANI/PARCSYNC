import { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useLetterTemplatesV2, LetterTemplateV2 } from '../hooks/useLetterTemplatesV2';
import { useLetterGeneration } from '../lib/useLetterGeneration';
import { LoadingSpinner } from './LoadingSpinner';

export function GenerateLetterV2Page() {
  const { templates, loading: loadingTemplates } = useLetterTemplatesV2();
  const { loading: generating, error: generationError, generateLetter, downloadGeneratedLetter } = useLetterGeneration();

  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplateV2 | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTemplate) {
      const initialValues: Record<string, string> = {};
      selectedTemplate.variables_detectees.forEach(varName => {
        initialValues[varName] = '';
      });
      setVariableValues(initialValues);
    }
  }, [selectedTemplate]);

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setSuccessMessage(null);

    try {
      if (!selectedTemplate.fichier_word_url) {
        throw new Error('Fichier Word manquant pour ce modele');
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

      const fileName = `${selectedTemplate.nom}_${new Date().toISOString().split('T')[0]}.docx`;
      downloadGeneratedLetter(blob, fileName);

      setSuccessMessage('Courrier genere avec succes');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erreur generation:', err);
    }
  };

  const isVariableRequired = (varName: string): boolean => {
    return selectedTemplate?.variables_requises?.includes(varName) || false;
  };

  const canGenerate = (): boolean => {
    if (!selectedTemplate) return false;

    const requiredVars = selectedTemplate.variables_requises || [];
    return requiredVars.every(varName => {
      const value = variableValues[varName];
      return value && value.trim().length > 0;
    });
  };

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des modeles..." />
      </div>
    );
  }

  const activeTemplates = templates.filter(t => t.actif);

  return (
    <div className="max-w-4xl mx-auto">
      {generationError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Erreur de generation</p>
            <p className="text-sm text-red-700 mt-1">{generationError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-green-900">{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Etape 1: Selectionnez un modele</h2>
        </div>

        <div className="p-6">
          {activeTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucun modele actif disponible</p>
              <p className="text-sm text-gray-500 mt-1">Creez des modeles dans Modeles Courriers V2</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-400 ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      selectedTemplate?.id === template.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{template.nom}</div>
                      {template.description && (
                        <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {template.type_courrier}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {template.variables_detectees.length} variables
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Etape 2: Remplissez les variables</h2>
          </div>

          <div className="p-6 space-y-4">
            {selectedTemplate.variables_detectees.map(varName => {
              const isRequired = isVariableRequired(varName);
              return (
                <div key={varName}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {varName}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={variableValues[varName] || ''}
                    onChange={e => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isRequired ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={`Entrez ${varName}`}
                  />
                </div>
              );
            })}

            {selectedTemplate.variables_detectees.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-4">
                Aucune variable detectee dans ce modele
              </p>
            )}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Etape 3: Generer le courrier</h2>
          </div>

          <div className="p-6">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate() || generating}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <LoadingSpinner size="sm" />
                  Generation en cours...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Generer et Telecharger
                </>
              )}
            </button>

            {!canGenerate() && selectedTemplate && (
              <p className="text-sm text-orange-600 mt-3 text-center">
                Veuillez remplir toutes les variables requises (marquees avec *)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
