import React, { useState } from 'react';
import { reportService } from '../services/reportService';
import './PathologistUpload.css';

export const PathologistDashboard = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedReport, setUploadedReport] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setFile(null);
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPG, PNG, and PDF files are allowed');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError('');
      setMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 20;
        });
      }, 500);

      const response = await reportService.uploadReport(file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedReport(response);
      setMessage('✅ Report uploaded successfully! Processing started.');
      setFile(null);
      setUploadProgress(0);

      setTimeout(() => {
        setMessage('');
        setUploadedReport(null);
        e.target.reset();
      }, 5000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to upload report. Please try again.'
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>📋 Upload Pathology Report</h1>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-wrapper">
            <label htmlFor="file-input" className="file-label">
              <span className="upload-icon">📁</span>
              <span className="upload-text">
                {file ? `Selected: ${file.name}` : 'Click to select a file or drag and drop'}
              </span>
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              accept=".jpg,.jpeg,.png,.pdf"
              className="file-input"
            />
          </div>

          {file && (
            <div className="file-info">
              <p><strong>File:</strong> {file.name}</p>
              <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
              <p><strong>Type:</strong> {file.type || 'Unknown'}</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          {uploading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="progress-text">{Math.round(uploadProgress)}%</p>
            </div>
          )}

          {uploadedReport && (
            <div className="report-details">
              <h3>📊 Report Details</h3>
              <p><strong>Report ID:</strong> {uploadedReport.reportId}</p>
              <p><strong>Status:</strong> In Progress</p>
              <p className="info-text">
                Your report has been submitted for processing. An LLM analysis and OCR extraction will be performed.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="upload-btn"
          >
            {uploading ? 'Uploading...' : 'Upload Report'}
          </button>
        </form>

        <div className="upload-info">
          <h3>ℹ️ Information</h3>
          <ul>
            <li>Supported formats: JPG, PNG, PDF</li>
            <li>Maximum file size: 10 MB</li>
            <li>Reports will be processed using OCR and LLM analysis</li>
            <li>Processing typically takes 1–5 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};