import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./SearchResults.css";

const SearchResults = ({ results, onAddToTrip }) => {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const renderItem = (item, type) => {
    if (type === 'events') {
      const date = new Date(item.start_time).toLocaleDateString();
      const price = item.price || 'Price unavailable';
      
      return (
        <>
          {/* Add image if available */}
          {(item.image) ? (
            <img 
              src={item.image} 
              alt={item.name || 'Event'} 
              className="result-thumbnail"
            />
          ) : (
            <div className="result-thumbnail-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
          )}
          <div className="result-text">
            {`${item.name} (${item.eventType}) - ${item.location} | ${date} | ${price}`}
          </div>
        </>
      );
    }
    if (type === 'travel') return `${item.type} from ${item.departure_location} to ${item.arrival_location}`;
    if (type === 'lodging') return `${item.name} (${item.type}) - ${item.location}`;
    return null;
  };

  const handleViewEvent = async (item, type) => {
    console.log(`Recording view for ${type} ID: ${item.id}`);
    try {
      // Similar pattern as in TripDetails page
      const url = `https://leaps-ohwd.onrender.com/api/items/${type}/${item.id}/view`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source: 'search',
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to record view event');
      }
    } catch (err) {
      console.error('Error recording view event:', err);
    }
  };

  const handleItemClick = (item, type) => {
    console.log(`${type} clicked:`, item);
    setSelected(item);
    
    // First record the view event
    handleViewEvent(item, type);
    
    // Then navigate based on item type - following the pattern in TripDetails
    if (type === 'events') {
      navigate(`/viewevent/${item.id}`);
    } else if (type === 'lodging') {
      navigate(`/lodging/${item.id}`);
    } else if (type === 'travel') {
      navigate(`/travel/${item.id}`);
    }
  };

  const hasResults = Object.values(results).some(items => items.length > 0);

  return (
    <div className="search-results">
      {hasResults ? (
        Object.entries(results).map(([type, items]) => (
          items.length > 0 && (
            <div key={type} className="results-section">
              <h3 className="section-title">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
              <div className="results-list">
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item, type)}
                    className="result-item"
                  >
                    <div className="result-content">
                      {renderItem(item, type)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Add to Trip clicked:', item);
                          onAddToTrip({ ...item, type });
                        }}
                        className="add-to-trip-btn"
                      >
                        Add to Trip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))
      ) : (
        <div className="no-results">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <path d="M5 8l6 6"/>
            <path d="M11 5l-6 6"/>
          </svg>
          <p>No results found. Try a different query or location.</p>
        </div>
      )}
      {selected && !navigate.pathname?.includes('/event') && (
        <div style={{ marginTop: '20px' }}>
          Details: {JSON.stringify(selected)}
        </div>
      )}
    </div>
  );
};

export default SearchResults;