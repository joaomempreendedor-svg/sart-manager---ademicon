import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from './components/ui/sonner'; // Importar Toaster como named export
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Toaster /> {/* Adicionar Sonner Toaster aqui */}
    <App />
  </React.StrictMode>
);