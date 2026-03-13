import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, Mic, MessageSquare, Hand, PhoneOff, Settings, MicOff, VideoOff, User, Users, Globe } from 'lucide-react';
import SpeechToText from '../components/SpeechToText';
import SignLanguageTranslator from '../components/SignLanguageTranslator';
import { useRoomSocket } from '../hooks/useRoomSocket';

export default function Room() {
  const navigate = useNavigate();
  const { id: roomId } = useParams();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isSignLanguageOn, setIsSignLanguageOn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // "transcript" | "participants"
  const [sidebarTab, setSidebarTab] = useState('transcript');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const [localTranscripts, setLocalTranscripts] = useState([]);
  const [interimText, setInterimText] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Translation Preferences
  const [isLiveTranslationOn, setIsLiveTranslationOn] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const translationPrefsRef = useRef({ isLiveTranslationOn, targetLanguage });

  useEffect(() => {
    translationPrefsRef.current = { isLiveTranslationOn, targetLanguage };
  }, [isLiveTranslationOn, targetLanguage]);

  // Room connectivity
  const { participants, remoteTranscripts, sendTranscript, connected, displayName, rename } = useRoomSocket(roomId, translationPrefsRef);

  // Merge and sort local + remote transcripts by id (timestamp-based)
  const allTranscripts = [...localTranscripts, ...remoteTranscripts].sort((a, b) => a.id - b.id);

  // Initialize Media Devices
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Error accessing media devices.', err);
      }
    };
    startMedia();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Toggle Tracks
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => { track.enabled = isMicOn; });
      streamRef.current.getVideoTracks().forEach(track => { track.enabled = isCamOn; });
    }
  }, [isMicOn, isCamOn]);

  // Auto-scroll transcript
  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [allTranscripts, interimText]);

  const handleSpeechResult = (finalText, interim) => {
    if (finalText) {
      const entry = { id: Date.now(), text: finalText, kind: 'speech', sender: displayName, local: true };
      
      if (translationPrefsRef.current?.isLiveTranslationOn && translationPrefsRef.current?.targetLanguage) {
        entry.translatedText = `${finalText} (Translating...)`;
        fetch('http://localhost:8000/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: finalText, target_lang: translationPrefsRef.current.targetLanguage })
        }).then(res => res.json()).then(result => {
          setLocalTranscripts(prev => prev.map(t => t.id === entry.id ? { ...t, translatedText: result.translatedText } : t));
        }).catch(console.error);
      }

      setLocalTranscripts(prev => [...prev, entry]);
      setInterimText('');
      sendTranscript(finalText, 'speech', null);
    } else {
      setInterimText(interim);
    }
  };

  const handleSignTranslation = (text, confidence) => {
    if (text) {
      const entry = { id: Date.now(), text, kind: 'sign', sender: displayName, confidence, local: true };

      if (translationPrefsRef.current?.isLiveTranslationOn && translationPrefsRef.current?.targetLanguage) {
        entry.translatedText = `${text} (Translating...)`;
        fetch('http://localhost:8000/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, target_lang: translationPrefsRef.current.targetLanguage })
        }).then(res => res.json()).then(result => {
          setLocalTranscripts(prev => prev.map(t => t.id === entry.id ? { ...t, translatedText: result.translatedText } : t));
        }).catch(console.error);
      }

      setLocalTranscripts(prev => [...prev, entry]);
      sendTranscript(text, 'sign', confidence);
    }
  };

  const lastVisible = allTranscripts[allTranscripts.length - 1];

  return (
    <div className="animate-fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>

      {/* Hidden Logic Components */}
      <SpeechToText isMicOn={isMicOn} onTranscriptUpdate={handleSpeechResult} />
      <SignLanguageTranslator isActive={isSignLanguageOn && isCamOn} videoRef={videoRef} onTranslationUpdate={handleSignTranslation} />

      {/* Top Header */}
      <div className="glass-panel" style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderTop: 'none', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
          Room: <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{roomId}</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            You: <strong style={{ color: '#fff' }}>{displayName}</strong>
          </span>
          <span style={{ color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connected ? 'var(--success)' : 'var(--danger)', display: 'inline-block' }} />
            {connected ? 'Connected' : 'Reconnecting…'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '16px', gap: '16px' }}>

        {/* Video Stage */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div className="glass-panel" style={{ flex: 2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: 'var(--radius-lg)' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: isCamOn ? 1 : 0, transition: 'opacity 0.3s ease' }}
            />
            {!isCamOn && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={40} color="var(--text-secondary)" />
                </div>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500 }}>{displayName} (You)</span>
              {!isMicOn && <MicOff size={16} color="var(--danger)" />}
            </div>

            {/* Subtitle Overlay */}
            {(interimText || lastVisible?.text) && (
              <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', padding: '10px 24px', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)', textAlign: 'center', maxWidth: '80%', transition: 'all 0.2s' }}>
                <p style={{ margin: 0, fontSize: '1.1rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  {interimText ? interimText : lastVisible?.text}
                </p>
                {lastVisible?.kind === 'sign' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px', display: 'block' }}>ASL Translated</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Tab Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)' }}>
              {[
                { key: 'transcript', label: 'Transcript', icon: <MessageSquare size={15} /> },
                { key: 'translation', label: 'Translation', icon: <Globe size={15} /> },
                { key: 'participants', label: `People (${participants.length})`, icon: <Users size={15} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSidebarTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '14px 4px',
                    border: 'none',
                    background: sidebarTab === tab.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: sidebarTab === tab.key ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.80rem',
                    fontWeight: sidebarTab === tab.key ? 600 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderBottom: sidebarTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Transcript / Translation Tabs */}
            {(sidebarTab === 'transcript' || sidebarTab === 'translation') && (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allTranscripts.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '32px' }}>
                    Transcripts will appear here once someone speaks or uses sign language.
                  </p>
                )}
                {allTranscripts.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      background: msg.local ? 'rgba(99,179,237,0.08)' : 'rgba(255,255,255,0.05)',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: msg.kind === 'sign' ? '3px solid var(--accent)' : msg.local ? '3px solid rgba(99,179,237,0.6)' : '3px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: msg.local ? 'var(--accent)' : '#aaa' }}>
                        {msg.sender} {msg.kind === 'sign' && '✋'} {msg.local && '(You)'}
                      </span>
                      {msg.confidence && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {Math.round(msg.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.95rem', margin: 0, lineHeight: 1.4 }}>
                      {sidebarTab === 'translation' ? (msg.translatedText || msg.text) : msg.text}
                    </p>
                  </div>
                ))}
                {interimText && (
                  <div style={{ padding: '12px', opacity: 0.6 }}>
                    <p style={{ fontSize: '0.95rem', margin: 0, fontStyle: 'italic' }}>{interimText}…</p>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Participants Tab */}
            {sidebarTab === 'participants' && (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {participants.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '32px' }}>
                    Connecting to room…
                  </p>
                )}
                {participants.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}>
                      {p.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                        {p.name === displayName && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.8rem', marginLeft: '6px' }}>(You)</span>}
                      </p>
                    </div>
                    {/* Online dot */}
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', zIndex: 10 }}>
        <button className="btn btn-icon" style={{ backgroundColor: isMicOn ? 'rgba(255,255,255,0.1)' : 'var(--danger)', color: 'white' }} onClick={() => setIsMicOn(!isMicOn)} title="Toggle Mic">
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button className="btn btn-icon" style={{ backgroundColor: isCamOn ? 'rgba(255,255,255,0.1)' : 'var(--danger)', color: 'white' }} onClick={() => setIsCamOn(!isCamOn)} title="Toggle Camera">
          {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--border-glass)', margin: '0 8px' }} />

        <button
          className="btn btn-icon"
          style={{ backgroundColor: isSignLanguageOn ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: 'white', width: 'auto', borderRadius: 'var(--radius-sm)', padding: '0 16px', transition: 'background-color 0.3s' }}
          onClick={() => setIsSignLanguageOn(!isSignLanguageOn)}
        >
          <Hand size={20} style={{ marginRight: '8px' }} />
          {isSignLanguageOn ? 'ASL Active' : 'Enable ASL'}
        </button>

        <button
          className="btn btn-icon"
          style={{ backgroundColor: isSidebarOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: 'white' }}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Toggle Sidebar"
        >
          <MessageSquare size={20} />
        </button>

        <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--border-glass)', margin: '0 8px' }} />

        <button
          className="btn btn-icon"
          style={{ backgroundColor: isSettingsOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: 'white', position: 'relative' }}
          title="Settings"
          onClick={() => { setNameInput(displayName); setIsSettingsOpen(o => !o); }}
        >
          <Settings size={20} />
        </button>

        {/* Settings popover */}
        {isSettingsOpen && (
          <div style={{
            position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--panel-bg, #1e1e2e)', border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)', padding: '24px', zIndex: 100,
            backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            width: '300px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>

            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Display Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { rename(nameInput); setIsSettingsOpen(false); } }}
              maxLength={30}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: '14px' }}
              autoFocus
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              onClick={() => { rename(nameInput); setIsSettingsOpen(false); }}
            >
              Save Name
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '16px 0' }} />
            
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Live Translation</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.9rem', color: '#fff' }}>Enable Translation</span>
              <input 
                type="checkbox" 
                checked={isLiveTranslationOn} 
                onChange={(e) => setIsLiveTranslationOn(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: '18px', height: '18px' }}
              />
            </div>
            
            {isLiveTranslationOn && (
              <>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Target Language</label>
                <select 
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid var(--border-glass)' }}
                >
                  <option value="es" style={{ color: '#000' }}>Spanish</option>
                  <option value="fr" style={{ color: '#000' }}>French</option>
                  <option value="de" style={{ color: '#000' }}>German</option>
                  <option value="zh-CN" style={{ color: '#000' }}>Chinese</option>
                  <option value="hi" style={{ color: '#000' }}>Hindi</option>
                  <option value="ar" style={{ color: '#000' }}>Arabic</option>
                  <option value="ru" style={{ color: '#000' }}>Russian</option>
                  <option value="pt" style={{ color: '#000' }}>Portuguese</option>
                </select>
              </>
            )}
          </div>
        )}

        <button
          className="btn btn-danger"
          style={{ marginLeft: '16px', padding: '10px 24px' }}
          onClick={() => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            navigate('/');
          }}
        >
          <PhoneOff size={18} /> Leave
        </button>
      </div>
    </div>
  );
}
