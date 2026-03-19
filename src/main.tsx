// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import App from './App.tsx';
// import './index.css';

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>
// );


import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent scroll-to-change on number inputs globally
document.addEventListener('wheel', (e) => {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement && el.type === 'number') {
    el.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <App />
  </StrictMode>
);
