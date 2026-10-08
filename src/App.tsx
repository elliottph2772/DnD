import { useEffect, useState } from 'react';
import Console from './routes/Console';
import Play from './routes/Play';
import { currentRoute, type Route } from './lib/route';

/**
 * The router. One build, two views, chosen by the hash — so an invite link
 * from before the rebuild still lands in the right place.
 */
export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return route.view === 'play' ? <Play route={route} /> : <Console route={route} />;
}
