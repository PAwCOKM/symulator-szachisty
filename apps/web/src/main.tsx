import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource/fira-sans/latin-400.css';
import '@fontsource/fira-sans/latin-500.css';
import '@fontsource/fira-sans/latin-600.css';
import '@fontsource/fira-sans/latin-700.css';
import '@fontsource/fira-sans/latin-ext-400.css';
import '@fontsource/fira-sans/latin-ext-500.css';
import '@fontsource/fira-sans/latin-ext-600.css';
import '@fontsource/fira-sans/latin-ext-700.css';
import '@fontsource/fira-code/latin-400.css';
import '@fontsource/fira-code/latin-500.css';
import '@fontsource/fira-code/latin-600.css';
import '@fontsource/fira-code/latin-ext-400.css';
import '@fontsource/fira-code/latin-ext-500.css';
import '@fontsource/fira-code/latin-ext-600.css';
import '@fontsource-variable/fraunces/opsz.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
