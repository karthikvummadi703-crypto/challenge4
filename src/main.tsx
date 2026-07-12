/**
 * Application entry point.
 *
 * Mounts the React application tree inside `#root` under React `StrictMode`.
 * All global CSS is imported here so Vite can tree-shake unused styles.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
