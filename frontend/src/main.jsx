import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/win98.css';

// Paketlenmiş Electron sürümünde sayfa file:// üzerinden açılır; bu ortamda
// sunucu tabanlı adres yönlendirmesi (rewrite) olmadığından HashRouter
// kullanılır. Web sürümünde (http/https) her zamanki gibi BrowserRouter
// kullanılmaya devam eder.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
