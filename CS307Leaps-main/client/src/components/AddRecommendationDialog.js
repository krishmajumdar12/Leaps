import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import '../styles/AddtoTripDialog.css';
import { useNavigate } from "react-router-dom";

const AddRecommendationDialog = ({ open, onClose, item }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    if (!token) {
      setError('You must be logged in to add items to trips');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    fetch('/api/trips', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Session expired. Please log in again');
        }
        if (!res.ok) throw new Error(`Failed to fetch trips: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Trips fetched:', data);
        setTrips(Array.isArray(data) ? data : []);
        
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setTrips([]);
        setError('Could not load trips. Are you logged in?');
      })
      .finally(() => setLoading(false));
  }, [open, token]);


  const addToTrip = (tripId) => {
    setLoading(true);
    console.log("Would send to server:", { tripId, itemType: item.type, itemId: item.id });
    fetch('/api/trips/add-item', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ tripId, itemType: item.type, itemId: item.id }),
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to add item');
      console.log("Sending to server:", { tripId, itemType: item.type, itemId: item.id });
      setSuccess(`Successfully added to trip!`);
      setTimeout(() => onClose(), 1500);
    })
    .catch(err => {
      console.error('Add item error:', err);
      setError('Failed to add item to trip.');
    })
    .finally(() => setLoading(false));

};

  const createTrip = () => {
    setLoading(true);
    fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
        body: JSON.stringify({
        name: `Trip with ${item.name || item.type}`,
        description: 'Auto-generated trip',
        destination: item.location || item.arrival_location || 'Unknown',
        start_date: item.start_time || item.departure || new Date().toISOString().split('T')[0],
        end_date: item.end_time || item.arrival || new Date().toISOString().split('T')[0],
        is_public: false,
      }),
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create trip');
      return res.json();
    })
    .then(trip => {
      console.log('Trip created:', trip);
      addToTrip(trip.id);
    })
    .catch(err => {
      console.error('Create trip error:', err);
      setError('Failed to create trip.');
      setLoading(false);
    });
  };


  return (
    <Dialog open={open} onClose={onClose} className="trip-dialog">
      <DialogTitle>Add to Trip</DialogTitle>
      <DialogContent>
        {loading ? (
          <div className="dialog-message loading-message">
            Loading trips...
          </div>
        ) : error ? (
          <div className="dialog-message error-message">
            {error}
          </div>
        ) : success ? (
          <div className="dialog-message success-message">
            {success}
          </div>
        ) : trips.length === 0 ? (
          <div className="no-trips-container">
            No trips yet.
            <button 
              className="create-trip-button" 
              onClick={createTrip}
            >
              Create New Trip
            </button>
          </div>
        ) : (
          <div className="trips-list-container">
            Select a trip:
            <ul className="trips-list">
              {trips.map(trip => (
                <li key={trip.id} className="trip-item">
                  <div className="trip-name">{trip.name}</div>
                  <button 
                    className="add-button" 
                    onClick={() => addToTrip(trip.id)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
            <div className="create-new-container">
              <button 
                className="create-trip-button" 
                onClick={createTrip}
              >
                Create New Trip
              </button>
            </div>
          </div>
        )}
      </DialogContent>
      <div className="dialog-actions">
        <button className="cancel-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
};

export default AddRecommendationDialog;