import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LeapsLogo from "../assets/Leapspng.png";

const SignUp = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const response = await fetch("https://leaps-ohwd.onrender.com/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });
        
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token); // store token in local storage
                setSuccess("Account created successfully!"); // display success message
                setTimeout(() => { 
                    navigate("/accountpage");   
                }, 1000);
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

    return (
        <div className="auth-container">
            <img src={LeapsLogo} alt="Leaps Logo" className="logo" />
            <h2>Create Account</h2>
            
            {error && <p className="error-message">{error}</p>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleSignUp}>
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                />  
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
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
                    {isLoading ? "Creating..." : "Sign Up"}    
                </button>
            </form>
            <p onClick={() => navigate("/login")}>Existing User?</p>
        </div>
    );
};

export default SignUp;