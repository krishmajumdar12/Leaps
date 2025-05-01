import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        // Basic validation
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const response = await fetch('https://leaps-ohwd.onrender.com/api/password-reset/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setSuccess(data.message || 'Password reset successful!');
                setTimeout(() => navigate('/login'), 2000); // Redirect to login after success
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (err) {
            setError('Error connecting to the server');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="reset-container">
                <h2>Invalid Reset Link</h2>
                <p>The password reset link is invalid or has expired.</p>
                <button 
                    onClick={() => navigate('/login')}
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="reset-container">
            <h2>Reset Password</h2>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleReset}>
                <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <button 
                    type="submit" 
                    disabled={isLoading}
                >
                    {isLoading ? "Resetting..." : "Reset Password"}
                </button>
            </form>
            
            <p onClick={() => navigate('/login')}>
                Back to Login
            </p>
        </div>
    );
};

export default ResetPassword;