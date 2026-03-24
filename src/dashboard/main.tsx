import React from 'react';
import { createRoot } from 'react-dom/client';
import '../popup/index.css';
import Dashboard from './Dashboard';

const root = createRoot(document.getElementById('root')!);
root.render(<Dashboard />);
