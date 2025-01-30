import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import BannerifyTimeline from './components/BannerifyTimeline';

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BannerifyTimeline />
    </React.StrictMode>
  );
});