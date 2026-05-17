'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Inversiones from '@/components/Inversiones';
import Captura from '@/components/Captura';
import Historial from '@/components/Historial';

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'inversiones' | 'captura' | 'historial'>('dashboard');

  return (
    <div className="app">
      <div className="header">
        <div className="header-top">
          <div>
            <div className="app-name">Patrimonio personal</div>
            <div className="header-date">Actualizado 1 may 2026</div>
          </div>
          <span className="pill pill-green">
            <i className="ti ti-trending-up" style={{ fontSize: '12px' }}></i> +$4.6M mes
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
            <span>Inversiones</span>
          </button>
          <button 
            className={`nav-btn ${activeScreen === 'captura' ? 'active' : ''}`}
            onClick={() => setActiveScreen('captura')}
          >
            <i className="ti ti-edit"></i>
            <span>Captura</span>
          </button>
          <button 
            className={`nav-btn ${activeScreen === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveScreen('historial')}
          >
            <i className="ti ti-history"></i>
            <span>Historial</span>
          </button>
        </div>
      </div>

      <div className="content">
        {activeScreen === 'dashboard' && <Dashboard />}
        {activeScreen === 'inversiones' && <Inversiones />}
        {activeScreen === 'captura' && <Captura />}
        {activeScreen === 'historial' && <Historial />}
      </div>
    </div>
  );
}
