import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupGlobalShortcuts } from './utils/shortcutHandler';
import './styles/globals.css';

// Set up global shortcuts for backward compatibility
setupGlobalShortcuts();

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root and render app
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);