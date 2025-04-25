import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LeapsLogo from "../assets/Leapspng.png";
import "../styles/auth.css";
import { isAuthenticated } from "../services/authService";

const Login = ({ setAuth, setTheme }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showResetForm, setShowResetForm] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [resetMessageType, setResetMessageType] = useState("");
    const [isResetLoading, setIsResetLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess("Login successful!");
                localStorage.setItem("token", data.token);
                setTimeout(() => {
                    setAuth(true);
                    setTheme(data.user.theme_preference || 'light');
                    navigate("/accountpage");
                }, 1000);
            
                //navigate("/accountpage");  // Change to your main page after login
            } else {
                localStorage.removeItem("token");
                setError(data.message);
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };



    const handleResetRequest = async (e) => {
        e.preventDefault();
        setIsResetLoading(true);
        setResetMessage("");
        
        try {
            const response = await fetch('/api/password-reset/request-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            });
            
            const data = await response.json();
            
            setResetMessage(data.message || "Check your email for reset instructions");
            setResetMessageType(response.ok ? "success" : "error");
            
            if (data.previewUrl) console.log('Email Preview:', data.previewUrl); // For testing
        } catch (err) {
            setResetMessage('Error connecting to the server');
            setResetMessageType("error");
        } finally {
            setIsResetLoading(false);
        }
    };

    const toggleResetForm = () => {
        setShowResetForm(!showResetForm);
        setResetMessage("");
        setResetEmail("");
    };

    return (
        <div className="auth-container">
            <img src={LeapsLogo} alt="Leaps Logo" className="logo" />
            
            {/* Main Login Form */}
            {!showResetForm ? (
                <>
                    <h2>Login</h2>
                    
                    {error && <p className="error-message">{error}</p>}
                    {success && <div className="success-message">{success}</div>}
                    
                    <form onSubmit={handleLogin}>
                        <input 
                            type="text"
                            placeholder="Username" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                        <input
                            type="password" 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? "Logging In..." : "Log In"}    
                        </button>
                    </form>
                    
                    <p className="forgot-password" onClick={toggleResetForm}>
                        Forgot Password?
                    </p>
                    <p className="new-user" onClick={() => navigate("/signup")}>
                        New User?
                    </p>
                </>
            ) : (
                /* Password Reset Request Form */
                <>
                    <h2>Reset Password</h2>
                    
                    {resetMessage && (
                        <p className={resetMessageType === "success" ? "success" : "error"}>
                            {resetMessage}
                        </p>
                    )}
                    
                    <form onSubmit={handleResetRequest}>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={isResetLoading}>
                            {isResetLoading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                    
                    <p onClick={toggleResetForm}>
                        Back to Login
                    </p>
                </>
            )}
        </div>
    );
};

export default Login;