import { lazy, Suspense, useEffect, useState } from 'react';
const ClientDemo = lazy(() => import('./App.jsx'));
const ConnectedApp = lazy(() => import('./ConnectedApp.jsx'));
const KitchenApp = lazy(() => import('./operations/KitchenApp.jsx'));
const PracaApp = lazy(() => import('./operations/PracaApp.jsx'));
const AdminApp = lazy(() => import('./operations/AdminApp.jsx'));
const ConnectedOperations = lazy(() => import('./operations/ConnectedOperations.jsx'));
const ConnectedAdmin = lazy(() => import('./operations/ConnectedAdmin.jsx'));
const getArea = () => /^#\/operacao\/admin(?:\/|$|\?)/.test(window.location.hash) ? 'connected-admin' : /^#\/operacao\/(praca|cozinha|bar)(?:\/|$|\?)/.test(window.location.hash) ? `connected-${window.location.hash.split('/')[2].split('?')[0]}` : /^#\/(cozinha|bar)(\/|$|\?)/.test(window.location.hash) ? 'kitchen' : /^#\/praca(\/|$|\?)/.test(window.location.hash) ? 'floor' : /^#\/admin(\/|$|\?)/.test(window.location.hash) ? 'admin' : 'client';

export default function RootApp() {
  const [area, setArea] = useState(getArea);
  useEffect(() => {
    const update = () => setArea(getArea());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return <Suspense fallback={<p role="status" style={{ padding: 32 }}>Carregando…</p>}>
    {area === 'connected-admin' ? <ConnectedAdmin/> : area.startsWith('connected-') ? <ConnectedOperations key={area} area={area.slice('connected-'.length)}/> : area === 'kitchen' ? <KitchenApp/> : area === 'floor' ? <PracaApp/> : area === 'admin' ? <AdminApp/> : import.meta.env.VITE_APP_MODE === 'demo' ? <ClientDemo/> : <ConnectedApp/>}
  </Suspense>;
}
