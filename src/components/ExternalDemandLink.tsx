import { useState } from 'react';
import { Link2, Copy, QrCode, Download, CheckCircle, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export function ExternalDemandLink() {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // Utilise l'URL de production depuis les variables d'environnement
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const demandLink = `${baseUrl}/demande-externe`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(demandLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'demande-externe-qr-code.png';
      link.click();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
          <ExternalLink className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lien de demande externe</h2>
          <p className="text-sm text-slate-600">Partagez ce lien avec vos chauffeurs externes</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            URL de la page publique
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a
                  href={demandLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm truncate"
                >
                  {demandLink}
                </a>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Copié!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copier
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Les chauffeurs peuvent accéder à cette page sans authentification
          </p>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all font-medium"
          >
            <QrCode className="w-5 h-5" />
            {showQR ? 'Masquer le QR Code' : 'Afficher le QR Code'}
          </button>
        </div>

        {showQR && (
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                <QRCodeCanvas
                  id="qr-code"
                  value={demandLink}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-slate-600 mb-4 text-center">
                Scannez ce QR code pour accéder directement au formulaire de demande
              </p>
              <button
                onClick={downloadQR}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Télécharger le QR Code (PNG)
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2 text-sm">Comment utiliser</h3>
          <ul className="space-y-1 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Copiez le lien ou téléchargez le QR code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Partagez-le avec vos chauffeurs externes par email, SMS ou affichage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Les chauffeurs peuvent envoyer des demandes directement aux pôles concernés</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Vous recevrez une notification dans votre inbox pour chaque nouvelle demande</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
