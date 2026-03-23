import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemSettingsProvider>
      <App />
    </SystemSettingsProvider>
  </StrictMode>,
);
