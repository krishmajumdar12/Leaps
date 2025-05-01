import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Link } from "react-router-dom";
import "./Navbar.css";
import LeapsLogo from "../assets/logopng.png";
import NotificationBell from "../assets/bell.png";
import { isAuthenticated, isGuest, logout } from '../services/authService';


const Navbar = () => {
    const [hoverEvent, setHoverEvent] = useState(false);

    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [auth, setAuth] = useState(isAuthenticated());

    useEffect(() => {
        // Get Unread Notifcation Count
        const fetchUnreadCount = async () => {
            try {
                const res = await fetch('https://leaps-ohwd.onrender.com/api/notifications/count', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
    
                const data = await res.json();
                if (res.ok) {
                    console.log(data.count);
                    setUnreadCount(data.count);
                }
            } catch (err) {
                console.error('Failed to fetch unread notification count:', err);
            }
        };
        setAuth(isAuthenticated()); 
        if (isAuthenticated()) {
            fetchUnreadCount();
            const intervalId = setInterval(fetchUnreadCount, 1000);
            return () => clearInterval(intervalId);
        } 
    }, []);

    const handleLogout = async () => {
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

        // Save current theme to backend
        try {
          await fetch('https://leaps-ohwd.onrender.com/api/users/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ theme_preference: theme })
          });
        } catch (err) {
          console.error('Error saving theme preference on logout:', err);
        }
        setAuth(false);
        logout();
        navigate('/login');
    };

    return (
        
        <nav className="navbar">
            {/*Home button*/}
            <div className="home">
                <Link to="/home">
                <img src={LeapsLogo} alt="Home" className="home"/>
                </Link>
            </div>
            <div className="navbar-container">


                <div className="nav-links">
                    <Link to="/trips" className="nav-item">Trips</Link>
                    <div className="nav-item dropdown" 
                         onMouseEnter={() => setHoverEvent(true)} 
                         onMouseLeave={() => setHoverEvent(false)}>
                        <span className="dropdown-toggle">Events</span>
                        {hoverEvent && (
                            <div className="dropdown-menu">
                                <Link to="/search" className="dropdown-item">Public Events</Link>
                                <Link to="/customevents" className="dropdown-item">Custom Events</Link>
                            </div>
                        )}
                    </div>
                    <Link to="/lodgings" className="nav-item">Lodging</Link>
                    {/*<Link to="/search" className="nav-item">Events</Link>*/}
                    <Link to="/travel" className="nav-item">Travel</Link>
                    <Link to="/users" className="nav-item">Friends</Link>
                    <Link to="/accountpage" className="nav-item">My Account</Link>
                </div>  

                <div className="auth-links">
                    {isAuthenticated() ? (
                        <>
                            <Link to="/notifications" className="bell-container">
                                <img src={NotificationBell} alt="Bell" className="bell"/>
                                {unreadCount > 0 && (<span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
                            </Link>
                            <Link onClick={handleLogout} className="logout-button">Logout</Link>
                        </>
                    ) : (
                        <>
                            <span className="guest-label">Guest Mode</span>
                            <Link to="/login" className="login-link nav-item">Login</Link>
                            <Link to="/signup" className="signup-link nav-item">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
