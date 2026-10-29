import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ConnectedApp from './ConnectedApp.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(<React.StrictMode>{import.meta.env.VITE_APP_MODE === 'demo' ? <App/> : <ConnectedApp/>}</React.StrictMode>);
