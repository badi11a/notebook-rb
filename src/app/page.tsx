'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Inversiones from '@/components/Inversiones';
import Captura from '@/components/Captura';
import Historial from '@/components/Historial';
import Liabilities from '@/components/Liabilities';
import Expenses from '@/components/Expenses';

type Screen = 'dashboard' | 'inversiones' | 'captura' | 'historial' | 'liabilities' | 'expenses';

const NAV_ITEMS: { id: Screen; icon: string; label: string }[] = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { id: 'inversiones', icon: 'ti-chart-pie',         label: 'Invest' },
  { id: 'liabilities', icon: 'ti-credit-card',       label: 'Liabilities' },
  { id: 'expenses',    icon: 'ti-wallet',             label: 'Expenses' },
  { id: 'captura',     icon: 'ti-edit',               label: 'Entry' },
  { id: 'historial',   icon: 'ti-history',            label: 'History' },
];

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  return (
    <div className="app">
      <div className="content">
        {activeScreen === 'dashboard'   && <Dashboard />}
        {activeScreen === 'inversiones' && <Inversiones />}
        {activeScreen === 'liabilities' && <Liabilities />}
        {activeScreen === 'expenses'    && <Expenses />}
        {activeScreen === 'captura'     && <Captura />}
        {activeScreen === 'historial'   && <Historial />}
      </div>

      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`bottom-nav-btn ${activeScreen === id ? 'active' : ''}`}
            onClick={() => setActiveScreen(id)}
          >
            <i className={`ti ${icon}`}></i>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
