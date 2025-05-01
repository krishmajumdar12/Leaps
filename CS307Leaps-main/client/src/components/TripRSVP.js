import React, { useState, useEffect } from 'react';
import '../styles/TripRSVP.css';

const TripRSVP = ({ tripId, currentUserId, isCreator, onRsvpUpdate }) => {
  const [currentUserRsvp, setCurrentUserRsvp] = useState('no_response');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUserRsvpStatus();
  }, [tripId, currentUserId]);

  const fetchUserRsvpStatus = async () => {
    try {
      const response = await fetch(`https://leaps-ohwd.onrender.com/api/trip-rsvp/${tripId}/rsvp-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch RSVP status');

      const data = await response.json();
      
      // Find current user's RSVP
      const currentUser = data.find(member => member.id === currentUserId);
      if (currentUser) {
        setCurrentUserRsvp(currentUser.status || 'no_response');
      }
    } catch (err) {
      console.error('Error fetching user RSVP:', err);
      // Don't show error to avoid cluttering the UI
    }
  };

  const handleRsvpChange = async (status) => {
    // Don't do anything if status is the same
    if (status === currentUserRsvp) return;
    
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`https://leaps-ohwd.onrender.com/api/trip-rsvp/${tripId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update RSVP status');

      // Update local state
      setCurrentUserRsvp(status);
      
      // Call the parent component's update handler to update the members list
      if (onRsvpUpdate) {
        onRsvpUpdate(currentUserId, status);
      }
      
      // Briefly show success message
      setSuccess('RSVP updated!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error updating RSVP status:', err);
      setError('Could not update RSVP. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rsvp-container">
      <h3>Your RSVP</h3>
      <div className="rsvp-buttons">
        <button 
          className={`rsvp-btn ${currentUserRsvp === 'attending' ? 'active' : ''}`}
          onClick={() => handleRsvpChange('attending')}
          disabled={isUpdating}
        >
          Going
        </button>
        <button 
          className={`rsvp-btn ${currentUserRsvp === 'maybe' ? 'active' : ''}`}
          onClick={() => handleRsvpChange('maybe')}
          disabled={isUpdating}
        >
          Maybe
        </button>
        <button 
          className={`rsvp-btn ${currentUserRsvp === 'not_attending' ? 'active' : ''}`}
          onClick={() => handleRsvpChange('not_attending')}
          disabled={isUpdating}
        >
          Not Going
        </button>
      </div>

      {error && <div className="rsvp-error">{error}</div>}
      {success && <div className="rsvp-success">{success}</div>}
    </div>
  );
}

export default TripRSVP;