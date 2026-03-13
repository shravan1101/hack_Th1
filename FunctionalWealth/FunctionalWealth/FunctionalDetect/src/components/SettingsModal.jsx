import React, { useState } from 'react';
import { X, Key } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, apiKey, onSave }) {
  const [keyInput, setKeyInput] = useState(apiKey || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(keyInput);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Key size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> API Settings</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="apiKey">Google Gemini API Key</label>
            <input
              id="apiKey"
              type="password"
              className="form-control"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              Your key is stored locally in your browser session and is not sent anywhere except directly to Google's API.
            </p>
          </div>
          
          <button type="submit" className="btn-primary">
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
