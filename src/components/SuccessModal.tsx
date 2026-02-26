import { X, CheckCircle, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  autoCloseDuration?: number;
}

export function SuccessModal({
  isOpen,
  onClose,
  title = 'Succès',
  message,
  autoCloseDuration = 3000
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDuration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-slideUp">
        <div className="relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 px-6 py-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-scaleIn">
              <CheckCircle className="w-12 h-12 text-green-600 animate-checkmark" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              {title}
              <Sparkles className="w-5 h-5 animate-pulse" />
            </h3>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-lg p-2 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-8 text-center">
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {message}
          </p>

          {autoCloseDuration > 0 && (
            <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden mb-6">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-progress"
                style={{
                  animation: `progress ${autoCloseDuration}ms linear forwards`
                }}
              ></div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            OK
          </button>
        </div>
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

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0) rotate(-45deg);
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-checkmark {
          animation: checkmark 0.5s ease-out 0.2s both;
        }

        .animate-progress {
          animation-name: progress;
        }
      `}</style>
    </div>
  );
}
