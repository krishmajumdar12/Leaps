// client/src/components/AuthPrompt.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startGuestSession } from '../services/authService';
import '../styles/AuthPrompt.css'; // We'll create this next

const AuthPrompt = ({ message }) => {
  const navigate = useNavigate();

  const handleGuestClick = () => {
    startGuestSession();
    // Go back to previous page
    navigate(-1);
  };

  return (
    <div className="auth-prompt-container">
      <div className="auth-prompt">
        <h2>Sign In Required</h2>
        <p>{message || 'Please log in or create an account to access this feature.'}</p>
        <div className="auth-prompt-buttons">
          <Link to="/login" className="login-btn">Log In</Link>
          <Link to="/signup" className="signup-btn">Sign Up</Link>
          <button onClick={handleGuestClick} className="guest-btn">
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPrompt;