import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AddToTripDialog from '../components/AddToTripDialog';
import '../styles/ViewEvent.css'; 

const ViewEvent = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://leaps-ohwd.onrender.com/api/events/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch event');
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Error loading event. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [id, token]);

  const handleAddToTrip = () => {
    setDialogOpen(true);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={handleGoBack}>Go Back</button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="not-found-container">
        <p>Event not found.</p>
        <button onClick={handleGoBack}>Go Back</button>
      </div>
    );
  }

    return (
    <div className="view-event-container">
      <div className="event-header">
        <button className="back-button" onClick={handleGoBack}>← Back</button>
        <h1>{event.name}</h1>
        <button className="add-trip-button" onClick={handleAddToTrip}>
          Add to Trip
        </button>
      </div>

      {event.image && (
        <div className="event-image-container">
          <img src={event.image} alt={event.name} className="event-image" />
        </div>
      )}

      <div className="event-info-container">
        <div className="event-details">
          <div className="detail-item">
            <span className="detail-label">Location:</span>
            <span className="detail-value">{event.location}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Date:</span>
            <span className="detail-value">{event.date}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Time:</span>
            <span className="detail-value">{event.time}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Type:</span>
            <span className="detail-value">{event.eventType}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Price:</span>
            <span className="detail-value">{event.price}</span>
          </div>
        </div>

        <div className="event-description">
          <h3>Description</h3>
          <p>{event.description}</p>
        </div>

        <div className="event-actions">
          {event.url !== 'N/A' && (
            <button className="buy-button" onClick={() => window.open(event.url || 'https://www.ticketmaster.com', '_blank')}>
              Buy Tickets
            </button>
          )}
        </div>
      </div>

      {/* Add to Trip Dialog */}
      <AddToTripDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        item={{ ...event, type: 'events', id: event.id }}
      />
    </div>
  );
};

export default ViewEvent;