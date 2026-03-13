import React from 'react';
import { AlertCircle, FileSearch, ShieldAlert } from 'lucide-react';

export default function AnalysisWorkspace({ isAnalyzing, analysisResult }) {
  const isError = analysisResult && analysisResult.error;

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return '#10b981'; // emerald-500
      case 'medium': return '#f59e0b'; // amber-500
      case 'high': return '#ef4444'; // red-500
      default: return '#38bdf8'; // light blue
    }
  };

  return (
    <div className="results-card">
      <div className="results-header">
        <FileSearch size={24} color="#38bdf8" />
        <h2>Analysis Results</h2>
      </div>

      {isAnalyzing ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Analyzing image with Gemini AI...</p>
        </div>
      ) : analysisResult ? (
        <div className="results-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {isError ? (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5' }}>
              <strong>Error:</strong> {analysisResult.error}
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '6px 12px', 
                borderRadius: '8px', 
                backgroundColor: `${getRiskColor(analysisResult.risk_level)}20`,
                color: getRiskColor(analysisResult.risk_level),
                border: `1px solid ${getRiskColor(analysisResult.risk_level)}50`,
                fontWeight: '600',
                marginBottom: '1.5rem',
                alignSelf: 'flex-start'
              }}>
                <ShieldAlert size={18} />
                Risk Level: {analysisResult.risk_level}
              </div>
              
              <p style={{ color: '#e2e8f0', lineHeight: '1.6', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                {analysisResult.observations}
              </p>

              <div className="disclaimer-card" style={{ marginTop: 'auto' }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Important Disclaimer:</strong> {analysisResult.disclaimer}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <FileSearch size={48} color="#475569" style={{ marginBottom: '1rem' }} />
          <p>Upload an image and click analyze to see results here.</p>
        </div>
      )}
    </div>
  );
}
