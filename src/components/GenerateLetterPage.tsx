import { useState } from 'react';
import { GenerateLetterWizard } from './GenerateLetterWizard';

export function GenerateLetterPage() {
  const [showWizard, setShowWizard] = useState(true);

  const handleClose = () => {
    setShowWizard(false);
  };

  const handleComplete = () => {
    setShowWizard(false);
  };

  if (!showWizard) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Courrier généré avec succès</h2>
        <p className="text-gray-600 mb-6">Le document a été généré et téléchargé</p>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Générer un autre courrier
        </button>
      </div>
    );
  }

  return <GenerateLetterWizard onClose={handleClose} onComplete={handleComplete} />;
}
