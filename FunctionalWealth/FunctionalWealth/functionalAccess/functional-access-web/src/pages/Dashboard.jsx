import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Plus, Hash } from 'lucide-react';

function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 2) result += '-';
  }
  return result; // e.g. "ab3x-9kqz-7mnr"
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    const id = roomInput.trim().toLowerCase();
    if (!id) {
      setError('Please enter a room ID.');
      return;
    }
    navigate(`/room/${id}`);
  };

  const handleCreate = () => {
    const newId = generateRoomId();
    navigate(`/room/${newId}`);
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '48px',
      }}
    >
      {/* Branding */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.8rem', marginBottom: '12px', fontWeight: 700 }}>
          Functional<span style={{ color: 'var(--accent)' }}>Access</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '480px' }}>
          Real-time Sign Language &amp; Speech-to-Text communication for everyone.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '820px',
        }}
      >
        {/* Join a Room */}
        <div
          className="glass-panel"
          style={{ flex: '1 1 340px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99,179,237,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogIn size={22} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Join a Room</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Enter an existing room ID
              </p>
            </div>
          </div>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <Hash
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="e.g. ab3x-9kqz-7mnr"
                value={roomInput}
                onChange={(e) => { setRoomInput(e.target.value); setError(''); }}
                style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            {error && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</p>
            )}
            <button type="submit" className="btn btn-primary" style={{ padding: '13px', fontSize: '1rem' }}>
              Join Room
            </button>
          </form>
        </div>

        {/* Create a Room */}
        <div
          className="glass-panel"
          style={{
            flex: '1 1 340px',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(129,199,132,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={22} color="var(--success)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Create a Room</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Start a new meeting instantly
              </p>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
            A unique room ID will be generated for you. Share it with others so they can join your session.
          </p>

          <button
            onClick={handleCreate}
            className="btn btn-primary"
            style={{
              padding: '13px',
              fontSize: '1rem',
              background: 'linear-gradient(135deg, var(--success) 0%, #2e7d32 100%)',
            }}
          >
            <Plus size={18} style={{ marginRight: '8px' }} />
            Create New Room
          </button>
        </div>
      </div>
    </div>
  );
}
