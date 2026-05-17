'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Inversiones from '@/components/Inversiones';
import Captura from '@/components/Captura';
import Historial from '@/components/Historial';
import Liabilities from '@/components/Liabilities';
import Expenses from '@/components/Expenses';

type Screen = 'dashboard' | 'inversiones' | 'captura' | 'historial' | 'liabilities' | 'expenses';

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  return (
    <div className="app">
      <div className="header">
        <div className="header-top">
          <div>
            <div className="app-name">Personal Wealth</div>
            <div className="header-date">Updated May 1, 2026</div>
          </div>
          <span className="pill pill-green">
            <i className="ti ti-trending-up" style={{ fontSize: '12px' }}></i> +$4.6M this month
          </span>
        </div>
        <div className="nav">
          <button
            className={`nav-btn ${activeScreen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveScreen('dashboard')}
          >
            <i className="ti ti-layout-dashboard"></i>
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-btn ${activeScreen === 'inversiones' ? 'active' : ''}`}
            onClick={() => setActiveScreen('inversiones')}
          >
            <i className="ti ti-chart-pie"></i>
            <span>Investments</span>
          </button>
          <button
            className={`nav-btn ${activeScreen === 'liabilities' ? 'active' : ''}`}
            onClick={() => setActiveScreen('liabilities')}
          >
            <i className="ti ti-credit-card"></i>
            <span>Liabilities</span>
          </button>
          <button
            className={`nav-btn ${activeScreen === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveScreen('expenses')}
          >
            <i className="ti ti-wallet"></i>
            <span>Expenses</span>
          </button>
          <button
            className={`nav-btn ${activeScreen === 'captura' ? 'active' : ''}`}
            onClick={() => setActiveScreen('captura')}
          >
            <i className="ti ti-edit"></i>
            <span>Data Entry</span>
          </button>
          <button
            className={`nav-btn ${activeScreen === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveScreen('historial')}
          >
            <i className="ti ti-history"></i>
            <span>History</span>
          </button>
        </div>
      </div>

      <div className="content">
        {activeScreen === 'dashboard'   && <Dashboard />}
        {activeScreen === 'inversiones' && <Inversiones />}
        {activeScreen === 'liabilities' && <Liabilities />}
        {activeScreen === 'expenses'    && <Expenses />}
        {activeScreen === 'captura'     && <Captura />}
        {activeScreen === 'historial'   && <Historial />}
      </div>
    </div>
  );
}
