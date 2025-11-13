import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="home-hero">
        <div className="hero-icon"></div>
        <h1>Cancer Risk Stratification System</h1>
        <p className="tagline">
          Intelligent pathology report analysis powered by OCR and LLM
        </p>

        {!isAuthenticated ? (
          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Register
            </Link>
          </div>
        ) : (
          <div className="welcome-message">
            <h2>Welcome back, {user?.username}!</h2>
            <p>Role: <strong>{user?.role}</strong></p>
            
            {user?.role === 'pathologist' && (
              <Link to="/upload" className="btn btn-primary">
                Go to Upload Portal
              </Link>
            )}

            {user?.role === 'doctor' && (
              <Link to="/reports" className="btn btn-primary">
                Go to Reports Dashboard
              </Link>
            )}
          </div>
        )}
      </div>

      {/* How It Works Section - show only to unauthenticated visitors */}
      {!isAuthenticated && (
        <div className="info-section">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Upload Report</h4>
              <p>Pathologist uploads a pathology report image or PDF</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>Process</h4>
              <p>System performs OCR extraction and LLM analysis</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Store</h4>
              <p>Results stored in MongoDB with patient information</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h4>Review</h4>
              <p>Doctor reviews and verifies the analysis</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};