import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Users.css';

const Users = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    // const [users, setUsers] = useState([]);
    const [friends, setFriends] = useState([]); 
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);

    //REQUESTING
    const [pendingRequests, setPendingRequests] = useState([]); // incoming
    const [outgoingRequests, setOutgoingRequests] = useState([]); // you sent

    const [suggestedFriends, setSuggestedFriends] = useState([]);

    const token = localStorage.getItem('token');
    const navigate = useNavigate();


    useEffect(() => {
        if (!token) {
          navigate('/login');
          return;
        }
        const fetchProfile = async () => {
            try {
              const res = await fetch('/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (!res.ok) throw new Error('Failed to fetch profile');
              const data = await res.json();
              setCurrentUserId(data.id);
            } catch (err) {
              console.error('Error fetching user profile:', err);
            }
          };
          
        const fetchFriends = async () => {
          try {
            const response = await fetch('/api/friends/list', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch friends');
            const data = await response.json();
            setFriends(data);
          } catch (err) {
            console.error('Error fetching friends:', err);
          }
        };

        const fetchRequests = async () => {
          try {
            const res = await fetch('/api/friends/requests', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setPendingRequests(Array.isArray(data) ? data : []); // ← Ensure it's an array
          } catch (err) {
            console.error('Error fetching incoming requests:', err);
            setPendingRequests([]); // ← Fallback to empty array
          }
        };        
        
        const fetchOutgoingRequests = async () => {
          try {
            const res = await fetch('/api/friends/outgoing', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setOutgoingRequests(Array.isArray(data) ? data : []);
          } catch (err) {
            console.error('Error fetching outgoing requests:', err);
            setOutgoingRequests([]);
          }
        };
        
        const fetchSuggestions = async () => {
          try {
            const res = await fetch('/api/friends/suggestions', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setSuggestedFriends(data);
          } catch (err) {
            console.error('Error fetching suggestions:', err);
          }
        };
        
        fetchProfile();
        fetchFriends();
        fetchRequests();
        fetchOutgoingRequests();
        fetchSuggestions();        
    }, [token, navigate]);
    
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!token) {
            navigate('/login');
            return;
        }
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setMessage('Please enter a search term');
            setMessageType('error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
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

    /*const handleAddFriend = async (friendId) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/friends/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friend_id: friendId })
            });
            const data = await response.json();
            setMessage(response.ok ? 'Friend added successfully' : data.message);
            setMessageType(response.ok ? 'success' : 'error');
            if (response.ok) {
                const addedUser = searchResults.find(user => user.id === friendId);
                if (addedUser) setFriends(prev => [...prev, addedUser]);
                // Optionally refresh search to reflect updated friend status
                handleSearch({ preventDefault: () => {} });
            }
        } catch (err) {
            setMessage('Error adding friend');
            setMessageType('error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };*/

    const handleRemoveFriend = async (friendId) => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/friends/remove', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ friend_id: friendId })
          });
          const data = await response.json();
          setMessage(response.ok ? 'Friend removed successfully' : data.message);
          setMessageType(response.ok ? 'success' : 'error');
          if (response.ok) {
            setFriends(prev => prev.filter(friend => friend.id !== friendId));
            // Optional: re-search to refresh UI
            if (searchQuery.trim()) handleSearch({ preventDefault: () => {} });
          }
        } catch (err) {
          setMessage('Error removing friend');
          setMessageType('error');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
    };

    const handleSendRequest = async (receiverId) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/friends/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ receiver_id: receiverId })
        });
    
        const data = await res.json();
        setMessage(data.message);
        setMessageType(res.ok ? 'success' : 'error');
    
        if (res.ok) {
          setOutgoingRequests(prev => [...prev, { receiver_id: receiverId }]);
        }
      } catch (err) {
        console.error('Error sending request:', err);
        setMessage('Error sending request');
        setMessageType('error');
      } finally {
        setIsLoading(false);
      }
    };
    
    const respondToRequest = async (requestId, action) => {
      try {
        const res = await fetch('/api/friends/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ request_id: requestId, action })
        });
        const data = await res.json();
        setMessage(data.message);
        setMessageType(res.ok ? 'success' : 'error');
        if (res.ok) {
          setPendingRequests(prev => prev.filter(r => r.id !== requestId));
          if (action === 'accept') {
            const fetchFriends = async () => {
              const response = await fetch('/api/friends/list', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await response.json();
              setFriends(data);
            };
            fetchFriends();
          }
        }
      } catch (err) {
        console.error('Error responding to request:', err);
      }
    };

    const handleCancelRequest = async (receiverId) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/friends/request', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ receiver_id: receiverId })
        });
    
        const data = await res.json();
        setMessage(data.message);
        setMessageType(res.ok ? 'success' : 'error');
    
        if (res.ok) {
          setOutgoingRequests(prev => prev.filter(r => r.receiver_id !== receiverId));
        }
      } catch (err) {
        console.error('Error canceling friend request:', err);
        setMessage('Error canceling request');
        setMessageType('error');
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div className="users-container">
      <h2>Friends</h2>

      {/* Search Section */}
      <section>
        <h3>Find New Friends</h3>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </button>
        </form>
        {message && <p className={messageType === 'success' ? 'success-message' : 'message'}>{message}</p>}
        {searchResults.length > 0 && (
          <ul className="users-list">
            {searchResults
            .filter(user => user.id !== currentUserId)
            .map(user => {
              const isFriend = friends.some(f => f.id === user.id);
              const isPending = outgoingRequests.some(r => r.receiver_id === user.id);

              return (
                <li key={user.id}>
                  <span className="user-info">
                                <img src={user.profile_pic} className='profile-pic'/>
                                {user.username}
                                ({user.email})
                            </span>
                  {isFriend ? (
                    <span className="friend-status">Friend</span>
                  ) : isPending ? (
                    <div className="pending-status">
                      Pending
                      <button
                        onClick={() => handleCancelRequest(user.id)}
                        disabled={isLoading}
                        className="remove-btn"
                        style={{ marginLeft: '10px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      disabled={isLoading}
                      className="add-btn"
                    >
                      Add Friend
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {/* Friends Requests Section */}      
      <section>
        <h3>Friend Requests</h3>
        {pendingRequests.length === 0 ? (
          <p>No incoming requests</p>
        ) : (
          <ul className="users-list">
            {pendingRequests.map(req => (
              <li key={req.id}>
                <span className="user-info">{req.username} ({req.email})</span>
                <button onClick={() => respondToRequest(req.id, 'accept')} className="add-btn">Accept</button>
                <button onClick={() => respondToRequest(req.id, 'reject')} className="remove-btn">Reject</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* Friends List Section */}
      <section>
        <h3>Your Friends</h3>
        {friends.length === 0 ? (
          <p>You haven’t added any friends yet.</p>
        ) : (
          <ul className="users-list">
            {friends.map(friend => (
                <li key={friend.id}>
                    <span className="user-info">
                      <img src={friend.profile_pic} className='profile-pic'/>
                      {friend.username} ({friend.email})</span>
                    <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        disabled={isLoading}
                        className="remove-btn"
                    >
                        Remove
                    </button>
                </li>            
            ))}
          </ul>
        )}
      </section>
      {/* Friends Suggestions Section */}
      <section>
        <h3>Friend Suggestions</h3>
        {suggestedFriends.length === 0 ? (
          <p>No suggestions right now.</p>
        ) : (
          <ul className="users-list">
            {suggestedFriends.map(user => {
              const isPending = outgoingRequests.some(r => r.receiver_id === user.id);

              return (
                <li key={user.id}>
                  <div className="user-info">
                    {user.username} ({user.email})
                    <div className="mutual-count">{user.mutual_count} mutual friend{user.mutual_count !== 1 ? 's' : ''}</div>
                  </div>
                  {isPending ? (
                    <span className="pending-status">Pending</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      disabled={isLoading}
                      className="add-btn"
                    >
                      Add Friend
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Users;