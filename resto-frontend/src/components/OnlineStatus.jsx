import { useEffect, useState } from 'react';

export default function OnlineStatus() {
  const [enLigne, setEnLigne] = useState(() => navigator.onLine);

  useEffect(() => {
    const actualiser = () => setEnLigne(navigator.onLine);
    window.addEventListener('online', actualiser);
    window.addEventListener('offline', actualiser);
    return () => {
      window.removeEventListener('online', actualiser);
      window.removeEventListener('offline', actualiser);
    };
  }, []);

  if (enLigne) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      Vous êtes hors ligne. Les pages déjà visitées peuvent rester accessibles, mais les commandes nécessitent Internet.
    </div>
  );
}
