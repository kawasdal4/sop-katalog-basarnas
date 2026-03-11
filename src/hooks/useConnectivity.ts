import { useState, useEffect } from 'react';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(window.navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optional: Add a ping check for true internet connectivity
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
        setIsOnline(response.ok);
      } catch (error) {
        setIsOnline(false);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
