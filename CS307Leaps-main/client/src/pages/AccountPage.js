import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import '../styles/AccountPage.css';
import UploadImage from '../components/UploadProfilePicture';

function AccountPage({ theme, setTheme }) {

    const [userInfo, setUserInfo] = useState({
        username: '',
        email: '',
        password: '',
        pic: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const fetchUserData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            console.log('Profile response status:', response.status);

            if (!response.ok) throw new Error('Failed to fetch user data');

            const userData = await response.json();
            setUserInfo({
                username: userData.username || '',
                email: userData.email || '',
                password: '',
                pic: userData.profile_pic || ''
              });
              setTheme(userData.theme_preference || 'light'); // <- this sets it              
        } catch (err) {
            setError('Error loading your account information. Please try again later.');
            console.error('Error fetching user data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [token, setTheme]);

    useEffect(() => {
        if (token) {
            fetchUserData();
        } else {
            setError('You must be logged in to view this page');
            setIsLoading(false);
        }
    }, [fetchUserData, token]);

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 3000);
    
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const imageChange = async (base64String) => {
        userInfo.pic = base64String;
        console.log("image changed");
        await handleSaveChanges();
        setIsEditing(true);
        console.log("editing status: %b", isEditing);
    };

    const handleSaveChanges = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            // Only send fields that have values
            const updatedFields = {};
            if (userInfo.username) updatedFields.username = userInfo.username;
            if (userInfo.email) updatedFields.email = userInfo.email;
            if (userInfo.password) updatedFields.password = userInfo.password;
            if (userInfo.pic) updatedFields.pic = userInfo.pic;
            
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/users/update`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedFields),
            });

            console.log('Update response status:', response.status);

            if (!response.ok) throw new Error('Failed to update profile');

            const data = await response.json();
            console.log('Profile updated:', data);

            setSuccess('Profile updated successfully!');
            
            // Clear password field after update
            setUserInfo(prev => ({...prev, password: ''}));
            
            // Refresh user data
            fetchUserData();
            setIsEditing(false);
            console.log("finished saving");

        } catch (err) {
            setError('Error updating your profile. Please try again.');
            console.error('Error updating profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelEdit = () => {
        // Reset form data and exit edit mode
        fetchUserData();
        setIsEditing(false);
    };

    const handleDeleteAccount = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const response = await fetch('https://leaps-ohwd.onrender.com/api/users/delete', {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete account');

            // Clear localStorage and redirect to home/login
            localStorage.removeItem('token');
            navigate('/login');
        } catch (err) {
            setError('Error deleting your account. Please try again.');
            console.error('Error deleting account:', err);
        } finally {
            setIsLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('theme');
        setTheme('light'); // Reset to default
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        navigate('/login');
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        await fetch('https://leaps-ohwd.onrender.com/api/users/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ theme_preference: newTheme })
        });
    };

    if (!token) {
        return <div className="account-container">Please login to view your account.</div>;
    }
    
    return (
        <div className="account-container">
            {/* Profile Section */}
            <div className="profile-section">
                <div id="pic-container" className="profile-picture">
                    <img 
                        src={userInfo.pic} 
                        alt="Profile Picture" 
                        className="profile-picture"
                    />
                </div>
                
                <h2 className="username-title">{userInfo.username}</h2>
                
                {!isEditing ? (
                    <button 
                        className="edit-btn" 
                        onClick={() => setIsEditing(true)}
                        disabled={isLoading}
                    >
                        Edit
                    </button>
                ) : (
                    <div>
                        <div>
                            <UploadImage updateImage={imageChange}></UploadImage>
                        </div>
                        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                            <button 
                                onClick={handleSaveChanges}
                                disabled={isLoading}
                            >
                                {isLoading ? "Saving..." : "Save"}
                            </button>
                            <button 
                                onClick={handleCancelEdit}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="theme-toggle-container">
                <label className="switch">
                    <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                    <span className="slider round"></span>
                </label>
                <span style={{ marginLeft: '10px' }}>
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </span>
            </div>


            {/* Display status messages */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Account Information Section */}
            <div className="account-info">
                <div className="account-fields">
                    <input 
                        type="email" 
                        name="email"
                        placeholder="Email" 
                        value={userInfo.email} 
                        onChange={handleInputChange}
                        disabled={!isEditing || isLoading}
                    />

                    <input 
                        type="text" 
                        name="username"
                        placeholder="Username" 
                        value={userInfo.username} 
                        onChange={handleInputChange}
                        disabled={!isEditing || isLoading}
                    />

                    {isEditing && (
                        <input 
                            type="password" 
                            name="password"
                            placeholder="New Password" 
                            value={userInfo.password} 
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                    )}
                </div>
            </div>

            <button 
                className="manage-friends-btn" 
                onClick={() => navigate('/trips?status=Past')}
                disabled={isLoading}>
                Past Trips
            </button>

            <button     
                className="log-out-btn" 
                onClick={handleLogout}
                disabled={isLoading}> 
                Logout
            </button>


            {/* Delete Account Section */}
            {!showDeleteConfirm ? (
                <button 
                    className="delete-btn" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                >
                    Delete Account
                </button>
            ) : (
                <div className="delete-confirm-container">
                    <div className="delete-confirm-text">Are you sure you want to delete your account?</div>
                    <div className="delete-confirm-buttons">
                        <button 
                            className="delete-btn" 
                            onClick={handleDeleteAccount}
                            disabled={isLoading}
                        >
                            Yes, Delete
                        </button>
                        <button 
                            className="cancel-btn"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>  
            )}
        </div>
    );

}

export default AccountPage;
