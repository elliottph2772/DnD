import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// The design system is the source of truth for the look; retune it there.
import '../design/nocturne-styles.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
