import React, { useCallback, useState } from 'react';
import { UploadCloud, X, Camera } from 'lucide-react';

export default function ImageUploader({ imageFile, onImageSelect, onRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Generate preview URL when imageFile changes
  React.useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      } else {
        alert("Please upload an image file.");
      }
    }
  }, [onImageSelect]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelect(e.target.files[0]);
    }
  };

  if (previewUrl) {
    return (
      <div className="upload-card">
        <div className="preview-container">
          <img src={previewUrl} alt="Preview" className="image-preview" />
          <button 
            className="remove-btn" 
            onClick={onRemove}
            title="Remove image"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-card">
      <label 
        className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className="upload-icon" />
        <span className="upload-text">Drag & drop your image here</span>
        <span className="upload-hint">or click to browse from your device</span>
        <input 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
