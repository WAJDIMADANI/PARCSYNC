import { useState } from 'react';
import { Plus, FileText, Sparkles } from 'lucide-react';
import { GenerateLetterV2Wizard } from './GenerateLetterV2Wizard';

export function GenerateLetterV2Page() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Générer un Courrier Professionnel
        </h1>

        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Créez des courriers personnalisés en quelques clics. Sélectionnez un salarié,
          choisissez un modèle, et les informations seront automatiquement remplies.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Sélectionnez un salarié</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Choisissez un modèle</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Variables auto-remplies</p>
          </div>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Générer un Courrier
        </button>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Avantages du système V2</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Remplissage automatique des données salarié (nom, prénom, adresse, poste, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Génération de PDF professionnel à partir de modèles Word</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Interface guidée étape par étape</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Variables personnalisées pour chaque type de courrier</span>
          </li>
        </ul>
      </div>

      {showWizard && (
        <GenerateLetterV2Wizard
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
          }}
        />
      )}
    </div>
  );
}
