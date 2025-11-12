import { QRCodeSVG } from 'qrcode.react';
import { X, ExternalLink } from 'lucide-react';

export function OnboardingQRModal({ onClose }: { onClose: () => void }) {
  const onboardingUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/onboarding`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(onboardingUrl);
    alert('Lien copié dans le presse-papier!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">QR Code Embauche</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-4 text-center font-medium">
              Scannez ce QR code pour accéder au formulaire d'embauche complet
            </p>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeSVG value={onboardingUrl} size={160} level="H" includeMargin />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lien direct</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={onboardingUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Copier
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Informations collectées</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Informations personnelles complètes</li>
              <li>• IBAN et NIR (optionnel)</li>
              <li>• Détails du permis de conduire</li>
              <li>• Documents: CNI, Carte Vitale, RIB, Permis</li>
              <li>• Consentement RGPD obligatoire</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Les candidats seront ajoutés avec le statut "À préqualifier"
          </p>
        </div>
      </div>
    </div>
  );
}
