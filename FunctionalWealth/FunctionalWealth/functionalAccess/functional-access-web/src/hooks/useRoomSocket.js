import { useEffect, useRef, useState, useCallback } from 'react';

function randomName() {
  const adjectives = ['Swift', 'Bright', 'Calm', 'Bold', 'Kind', 'Sharp', 'Wise', 'Brave'];
  const nouns = ['Fox', 'Owl', 'Hawk', 'Wolf', 'Bear', 'Lynx', 'Deer', 'Kite'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] +
         nouns[Math.floor(Math.random() * nouns.length)];
}

let SESSION_NAME = null;
function getSessionName() {
  if (!SESSION_NAME) SESSION_NAME = randomName();
  return SESSION_NAME;
}

export function useRoomSocket(roomId, translationPrefsRef) {
  const wsRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [remoteTranscripts, setRemoteTranscripts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayNameState] = useState(getSessionName());

  useEffect(() => {
    if (!roomId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/room/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', name: SESSION_NAME }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'participants') {
          setParticipants(data.participants);
        } else if (data.type === 'transcript') {
          const entry = { id: Date.now() + Math.random(), sender: data.sender, text: data.text, kind: data.kind, confidence: data.confidence, remote: true, translatedText: null };
          
          if (translationPrefsRef?.current?.isLiveTranslationOn && translationPrefsRef?.current?.targetLanguage) {
             const targetLang = translationPrefsRef.current.targetLanguage;
             entry.translatedText = `${data.text} (Translating...)`;
             fetch('http://localhost:8000/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: data.text, target_lang: targetLang })
             }).then(res => res.json()).then(result => {
                setRemoteTranscripts(prev => prev.map(t => t.id === entry.id ? { ...t, translatedText: result.translatedText } : t));
             }).catch(e => console.error("Translation fail", e));
          }

          setRemoteTranscripts((prev) => [...prev, entry]);
        }
      } catch (e) {
        console.error('Room socket parse error', e);
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.error('Room socket error', e);

    return () => ws.close();
  }, [roomId]);

  const sendTranscript = useCallback((text, kind, confidence) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'transcript', text, kind, confidence }));
    }
  }, []);

  /** Rename the current user and notify the room */
  const rename = useCallback((newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    SESSION_NAME = trimmed;
    setDisplayNameState(trimmed);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'rename', name: trimmed }));
    }
  }, []);

  return { participants, remoteTranscripts, sendTranscript, connected, displayName, rename };
}
