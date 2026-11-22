import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import cssText from './styles/index.css?inline';
import referenceCssText from './styles/reference-theme.css?inline';
import './styles/index.css';
import './styles/reference-theme.css';

// Double protection : Vite produit normalement un fichier CSS séparé,
// mais l’injection garantit aussi le rendu si un serveur ou un cache bloque cet asset.
if (!document.getElementById('restoclik-inline-style')) {
  const style = document.createElement('style');
  style.id = 'restoclik-inline-style';
  style.textContent = `${cssText}\n${referenceCssText}`;
  document.head.appendChild(style);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
