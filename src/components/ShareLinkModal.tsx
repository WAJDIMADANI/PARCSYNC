import { useState, useRef } from 'react';
import { X, Copy, Download, Share2, CheckCircle, Mail, Send } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface ShareLinkModalProps {
  onClose: () => void;
}

export function ShareLinkModal({ onClose }: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  const applyUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/apply`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(applyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'qr-code-candidature.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const sendEmail = async () => {
    if (!email.trim()) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setSending(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-application-link`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateEmail: email,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi de l\'email');
      }

      setSent(true);
      setEmail('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-3 rounded-xl">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Partager le lien candidature</h2>
            <p className="text-sm text-slate-600">Permettez aux candidats de postuler facilement</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Envoyer par email</h3>
                <p className="text-sm text-slate-600">Invitez directement un candidat à postuler</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendEmail()}
                placeholder="email@candidat.com"
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
              <button
                onClick={sendEmail}
                disabled={sending || !email.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi...
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Envoyé
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
            {sent && (
              <p className="mt-2 text-sm text-green-600 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Email envoyé avec succès !
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">Ou partagez le lien</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Lien de candidature
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={applyUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-sm text-slate-700"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-xl transition-all duration-200 shadow-soft hover:shadow-glow font-medium"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              QR Code
            </label>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border-2 border-slate-200">
              <div className="flex flex-col items-center">
                <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-lg mb-4">
                  <QRCodeCanvas
                    value={applyUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <button
                  onClick={downloadQRCode}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  Télécharger le QR Code
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-accent-50 to-secondary-50 rounded-xl p-4 border border-accent-200">
            <p className="text-sm text-slate-700 font-medium">
              <strong>Astuce:</strong> Imprimez le QR code et placez-le à l'accueil, sur vos offres d'emploi ou partagez le lien sur vos réseaux sociaux pour faciliter les candidatures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
