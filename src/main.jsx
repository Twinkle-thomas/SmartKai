import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { createConfiguredClient } from './services/supabase.js';
const client = createConfiguredClient();
createRoot(document.getElementById('root')).render(<React.StrictMode><App client={client} /></React.StrictMode>);
