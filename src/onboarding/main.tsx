import React from 'react';
import { createRoot } from 'react-dom/client';
import '../popup/index.css';
import Onboarding from './Onboarding';

const root = createRoot(document.getElementById('root')!);
root.render(<Onboarding />);
