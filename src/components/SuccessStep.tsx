import { useEffect, useState } from 'react';
import { CheckCircle, Download, ExternalLink, X } from 'lucide-react';

interface SuccessStepProps {
  pdfBlob: Blob;
  fileName: string;
  onClose: () => void;
}

export function SuccessStep({ pdfBlob, fileName, onClose }: SuccessStepProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    const url = window.URL.createObjectURL(pdfBlob);
    setPdfUrl(url);

    return () => {
      window.URL.revokeObjectURL(url);
    };
  }, [pdfBlob]);

  useEffect(() => {
    if (!timerActive) return;

    if (secondsLeft === 0) {
      onClose();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, timerActive, onClose]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleCancelTimer = () => {
    setTimerActive(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-scaleIn">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Courrier généré avec succès!</h3>
        <p className="text-gray-600">Votre courrier administratif a été créé et enregistré.</p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-700 mb-4">Choisissez une action:</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Télécharger le PDF
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            Ouvrir dans un nouvel onglet
          </button>
        </div>
      </div>

      {timerActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm text-yellow-800">
                Fermeture automatique dans <span className="font-bold text-lg">{secondsLeft}s</span>
              </div>
            </div>
            <button
              onClick={handleCancelTimer}
              className="px-3 py-1 text-sm bg-white border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Fermer
        </button>
      </div>
    </div>
  );
}
