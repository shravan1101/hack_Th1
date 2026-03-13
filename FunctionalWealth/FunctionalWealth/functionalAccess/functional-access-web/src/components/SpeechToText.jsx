import { useEffect, useState, useRef } from 'react';

export default function SpeechToText({ isMicOn, onTranscriptUpdate }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Pass the text up to the parent Room component
      onTranscriptUpdate(finalTranscript, interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
    };

    recognition.onend = () => {
       // Auto-restart if it was supposed to be listening
       if (isListening) {
           recognition.start();
       }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
         recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isMicOn && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start recognition", e);
      }
    } else if (!isMicOn && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isMicOn, isListening]);

  return null; // This is a logic-only component
}
