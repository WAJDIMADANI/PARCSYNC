import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

interface SuccessNotificationProps {
  message: string;
  onClose: () => void;
}

export function SuccessNotification({ message, onClose }: SuccessNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] animate-fadeIn">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slideUp">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-scaleIn">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Succès !</h3>
            <p className="text-gray-600 text-lg">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
