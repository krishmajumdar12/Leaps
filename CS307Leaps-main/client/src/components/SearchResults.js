import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchResults = ({ results, onAddToTrip }) => {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');


  const renderItem = (item, type) => {
    if (type === 'events') {
      const date = new Date(item.start_time).toLocaleDateString();
      const price = item.price || 'Price unavailable';
      return `${item.name} (${item.eventType}) - ${item.location} | ${date} | ${price}`;
    }
    if (type === 'travel') return `${item.type} from ${item.departure_location} to ${item.arrival_location}`;
    if (type === 'lodging') return `${item.name} (${item.type}) - ${item.location}`;
    return null;
  };


  const handleViewEvent = async (item, type) => {
    console.log(`Recording view for ${type} ID: ${item.id}`);
    try {
      // Similar pattern as in TripDetails page
      const url = `/api/items/${type}/${item.id}/view`;
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
            <div key={type}>
              <h3>{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
              {items.map(item => (
              <div
                  key={item.id}
                  onClick={() => handleItemClick(item, type)}
                  style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #ddd' }}
                >
                  {renderItem(item, type)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Add to Trip clicked:', item);
                      onAddToTrip({ ...item, type });
                    }}
                    style={{ marginLeft: '10px' }}
                  >
                    Add to Trip
                  </button>
                </div>
              ))}
            </div>
          )
        ))
      ) : (
        <div>No results found. Try a different query or location.</div>
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