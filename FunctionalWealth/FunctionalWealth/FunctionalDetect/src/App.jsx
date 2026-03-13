import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import AnalysisWorkspace from './components/AnalysisWorkspace';
import SettingsModal from './components/SettingsModal';
import { analyzeImage } from './services/gemini';
import { Sparkles } from 'lucide-react';
import './App.css';

function App() {
  const [imageFile, setImageFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // Try to load API key from env first, then session storage
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const storedKey = sessionStorage.getItem('geminiApiKey');
    
    if (envKey) {
      setApiKey(envKey);
    } else if (storedKey) {
      setApiKey(storedKey);
    } else {
      // If no key found, prompt user
      setIsSettingsOpen(true);
    }
  }, []);

  const handleSaveSettings = (key) => {
    setApiKey(key);
    sessionStorage.setItem('geminiApiKey', key);
    setIsSettingsOpen(false);
  };

  const handleImageSelect = (file) => {
    setImageFile(file);
    setAnalysisResult(null); // Clear previous results
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(imageFile, apiKey);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult({ error: error.message + " - If this is an API key error, please click 'API Settings' in the top right and update your key." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <main className="main-content">
        <div className="hero-section">
          <h1 className="hero-title">
            Functional<span className="gradient-text">Detect</span>
          </h1>
          <p className="hero-subtitle">
            Image-based early detection system for common conditions — directly from photos using on-device AI.
          </p>
        </div>

        <div className="workspace-grid">
          <div className="upload-column">
            <ImageUploader 
              imageFile={imageFile} 
              onImageSelect={handleImageSelect}
              onRemove={handleRemoveImage}
            />
            
            <button 
              className="analyze-btn" 
              onClick={handleAnalyze} 
              disabled={!imageFile || isAnalyzing}
            >
              <Sparkles size={20} />
              {isAnalyzing ? "Analyzing..." : "Analyze Image"}
            </button>
          </div>

          <div className="results-column">
            <AnalysisWorkspace 
              isAnalyzing={isAnalyzing} 
              analysisResult={analysisResult} 
            />
          </div>
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={apiKey}
        onSave={handleSaveSettings}
      />
    </>
  );
}

export default App;
