import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Friends.css';

const Friends = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [isLoading, setIsLoading] = useState(false);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    // Fetch friends list on mount
    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchFriends();
    }, [token, navigate]);

    const fetchFriends = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://leaps-ohwd.onrender.com/api/friends/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch friends');
            const data = await response.json();
            setFriends(data);
            setMessage('');
        } catch (err) {
            setMessage('Error loading friends');
            setMessageType('error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };


    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setMessage('Please enter a search term');
            setMessageType('error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/friends/search?query=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to search users');
            const data = await response.json();
            setSearchResults(data);
            setMessage(data.length === 0 ? 'No users found' : '');
            setMessageType(data.length === 0 ? 'error' : '');
        } catch (err) {
            setMessage('Error searching users');
            setMessageType('error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFriend = async (friendIdToRemove) => {
        setIsLoading(true);
        try {
            const response = await fetch('https://leaps-ohwd.onrender.com/api/friends/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friend_id: friendIdToRemove })
            });
            const data = await response.json();
            setMessage(response.ok ? 'Friend removed successfully' : data.message);
            setMessageType(response.ok ? 'success' : 'error');
            if (response.ok) fetchFriends();
        } catch (err) {
            setMessage('Error removing friend');
            setMessageType('error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="friends-container">
            <h2>Friends</h2>
            
            {message && (
                <p className={messageType === 'success' ? 'success' : 'error'}>
                    {message}
                </p>
            )}

            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search users by username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? "Searching..." : "Search"}
                </button>
            </form>
            <h3>Your Friends</h3>

            {isLoading ? (
                <div className="loading">Loading...</div>
            ) : friends.length === 0 ? (
                <div className="no-friends">No friends yet</div>
            ) : (
                <ul className="friends-list">
                    {friends.map(friend => (
                        <li key={friend.id}>
                            <span className="friend-info">{friend.username}</span>
                            <button
                                onClick={() => handleRemoveFriend(friend.id)}
                                className="remove-btn"
                                disabled={isLoading}>
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}          
            <button 
                onClick={() => navigate('/accountpage')}
                className="back-btn"
                disabled={isLoading}
            >
                Back to Account
            </button>
        </div>
    );
};

export default Friends;