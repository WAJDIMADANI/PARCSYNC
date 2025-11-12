import { Battery, BatteryCharging } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'primary' | 'white';
}

const barWidthClasses = {
  sm: 'w-32',
  md: 'w-48',
  lg: 'w-64',
  xl: 'w-80'
};

const barHeightClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
  xl: 'h-5'
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

export function LoadingSpinner({ size = 'md', text, fullScreen = false, variant = 'primary' }: LoadingSpinnerProps) {
  const textColorClass = variant === 'white' ? 'text-white' : 'text-slate-700';
  const barBgClass = variant === 'white' ? 'bg-white/20' : 'bg-slate-200';
  const barFillClass = variant === 'white'
    ? 'bg-gradient-to-r from-white via-white to-white/80'
    : 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700';
  const iconColorClass = variant === 'white' ? 'text-white' : 'text-primary-600';

  const loader = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-3">
        <BatteryCharging className={`${iconSizeClasses[size]} ${iconColorClass} animate-pulse`} />
        <div className={`${barWidthClasses[size]} ${barHeightClasses[size]} ${barBgClass} rounded-full overflow-hidden shadow-inner`}>
          <div
            className={`h-full ${barFillClass} animate-loading-bar rounded-full shadow-lg`}
            style={{
              animation: 'loading-bar 1.5s ease-in-out infinite'
            }}
          />
        </div>
        <Battery className={`${iconSizeClasses[size]} ${iconColorClass} opacity-50`} />
      </div>
      {text && (
        <p className={`${textColorClass} font-medium text-sm animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {loader}
      </div>
    );
  }

  return loader;
}
