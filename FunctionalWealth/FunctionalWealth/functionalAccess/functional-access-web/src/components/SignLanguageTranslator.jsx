import { useEffect, useRef, useState } from 'react';

export default function SignLanguageTranslator({ isActive, videoRef, onTranslationUpdate }) {
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create hidden canvas for frame extraction
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    
    return () => {
      // Cleanup
      if (wsRef.current) wsRef.current.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive && !isConnected) {
      connectWebSocket();
    } else if (!isActive && isConnected) {
      disconnectWebSocket();
    }
  }, [isActive]);

  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:8000/ws/translate');
      
      wsRef.current.onopen = () => {
        console.log('Connected to Sign Language Translation Server');
        setIsConnected(true);
        startStreaming();
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'translation') {
          onTranslationUpdate(data.text, data.confidence);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('Disconnected from translation server');
        setIsConnected(false);
        stopStreaming();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    stopStreaming();
  };

  const startStreaming = () => {
    // Capture a frame every 200ms (5 FPS) to send to backend
    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      
      const video = videoRef.current;
      if (video.videoWidth === 0) return; // Video not playing yet

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 JPEG to save bandwidth
      const base64Frame = canvas.toDataURL('image/jpeg', 0.5);
      
      wsRef.current.send(base64Frame);
    }, 200);
  };

  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return null; // Headless component
}
