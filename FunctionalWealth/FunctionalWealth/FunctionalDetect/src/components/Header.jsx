import React from 'react';
import { Settings, Activity } from 'lucide-react';

export default function Header({ onOpenSettings }) {
  return (
    <header className="app-header">
      <div className="logo-container">
        <span style={{ 
          background: '#0ea5e9',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          width: '32px',
          height: '32px'
        }}>
          A
        </span>
        <span style={{ color: '#0ea5e9', fontWeight: '800', letterSpacing: '0.05em' }}>AI Accessibility Hub</span>
      </div>
      <button className="settings-btn" onClick={onOpenSettings}>
        <Settings size={18} />
        <span>API Settings</span>
      </button>
    </header>
  );
}
