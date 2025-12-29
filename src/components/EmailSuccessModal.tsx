import { useEffect } from 'react';
import { CheckCircle, Mail, Sparkles, X } from 'lucide-react';

interface EmailSuccessModalProps {
  message: string;
  recipient?: string;
  onClose: () => void;
}

export function EmailSuccessModal({ message, recipient, onClose }: EmailSuccessModalProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] animate-fadeIn">
      <div
        className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-bounceIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-all duration-200 group"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
        </button>

        <div className="relative pt-12 pb-8 px-8">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 opacity-10" />

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-20 animate-ping" />

              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg animate-scaleIn">
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500 animate-checkmark" />
                </div>
              </div>

              <div className="absolute -top-2 -right-2 animate-float">
                <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </div>

              <div className="absolute -bottom-1 -left-2 animate-float-delayed">
                <Mail className="w-6 h-6 text-blue-400 fill-blue-400" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent animate-slideDown">
                Envoyé avec succès !
              </h3>

              <p className="text-gray-600 text-lg leading-relaxed animate-slideUp">
                {message}
              </p>

              {recipient && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-full border border-green-200 animate-fadeIn">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{recipient}</span>
                </div>
              )}
            </div>

            <div className="w-full h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-full animate-progressBar" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-100px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
        }

        @keyframes progressBar {
          from {
            transform: scaleX(0);
            transform-origin: left;
          }
          to {
            transform: scaleX(1);
            transform-origin: left;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-bounceIn {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both;
        }

        .animate-checkmark {
          animation: checkmark 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.5s both;
        }

        .animate-slideDown {
          animation: slideDown 0.5s ease-out 0.4s both;
        }

        .animate-slideUp {
          animation: slideUp 0.5s ease-out 0.5s both;
        }

        .animate-float {
          animation: float 2s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 2s ease-in-out 0.5s infinite;
        }

        .animate-progressBar {
          animation: progressBar 3.5s linear;
        }
      `}</style>
    </div>
  );
}
