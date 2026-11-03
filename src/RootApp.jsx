import { lazy, Suspense, useEffect, useState } from 'react';
const ClientDemo = lazy(() => import('./App.jsx'));
const ConnectedApp = lazy(() => import('./ConnectedApp.jsx'));
const KitchenApp = lazy(() => import('./operations/KitchenApp.jsx'));
const isKitchenRoute = () => /^#\/(cozinha|bar)(\/|$|\?)/.test(window.location.hash);

export default function RootApp() {
  const [kitchen, setKitchen] = useState(isKitchenRoute);
  useEffect(() => {
    const update = () => setKitchen(isKitchenRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return <Suspense fallback={<p role="status" style={{ padding: 32 }}>Carregando…</p>}>
    {kitchen ? <KitchenApp/> : import.meta.env.VITE_APP_MODE === 'demo' ? <ClientDemo/> : <ConnectedApp/>}
  </Suspense>;
}
