import { useState, useEffect } from 'react';

/**
 * Hook qui retourne true si la largeur de la fenêtre est inférieure au breakpoint mobile.
 * Breakpoint par défaut : 768px (standard Tailwind "md").
 *
 * Se met à jour automatiquement quand la fenêtre est redimensionnée.
 *
 * Utilisation :
 *   const isMobile = useIsMobile();
 *   return isMobile ? <VueMobile /> : <VueDesktop />;
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}