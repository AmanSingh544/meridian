import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// ─── Mock API (remove when real APIs are ready) ─────────────────
// To disable: delete the two lines below and remove src/mocks/
// import { installMockHandler } from './mocks/handler';
// installMockHandler();
// ────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
