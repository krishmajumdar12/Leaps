import React, { useState, useEffect } from 'react';
import '../styles/SearchFilter.css';

const SearchBar = ({ onResults }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ type: 'events', eventType: '', location: '', startDateTime: '', endDateTime: '', priceSort: '', locationSort: '' });
  const [isFilterPopupOpen, setFilterPopupOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isFiltersRemoved, setIsFiltersRemoved] = useState(false);

  useEffect(() => {
    if (isFiltersRemoved) {
      handleSearch();
      setIsFiltersRemoved(false);
    }
  }, [isFiltersRemoved]);


  // Get user's location using geolocation API
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            resolve({ latitude, longitude });
          },
          error => {
            reject(error);
          }
        );
      } else {
        reject(new Error("Geolocation is not supported by this browser"));
      }
    });
  };

  const handleSearch = async () => {
    console.log('Filters before formatting:', filters); // Debugging log to verify filters

    // Format startDateTime and endDateTime to include full ISO 8601 timestamps
    const formattedStartDateTime = filters.startDateTime
      ? `${filters.startDateTime}:00Z` // Add seconds and Z timezone
      : '';
    const formattedEndDateTime = filters.endDateTime
      ? `${filters.endDateTime}:59Z` // Add seconds and Z timezone
      : '';

      let latitude = '';
      let longitude = '';
      if (userLocation) {
        ({ latitude, longitude } = userLocation);
      } else {
        try {
          const loc = await getUserLocation();  // might throw
          setUserLocation(loc);
          ({ latitude, longitude } = loc);
        } catch (geoError) {
          console.warn('Could not get geolocation:', geoError);
          // fallback: leave latitude/longitude blank,
          // or set to a default city center if you prefer.
        }
      }
    
      // 3) Build your URL including coords only if you have them
      let url = `https://leaps-ohwd.onrender.com/api/search?q=${encodeURIComponent(query)}` +
                `&location=${encodeURIComponent(filters.location)}` +
                (filters.eventType ? `&eventType=${encodeURIComponent(filters.eventType)}` : '') +
                (formattedStartDateTime ? `&startDateTime=${encodeURIComponent(formattedStartDateTime)}` : '') +
                (formattedEndDateTime   ? `&endDateTime=${encodeURIComponent(formattedEndDateTime)}` : '') +
                (filters.priceSort      ? `&priceSort=${filters.priceSort}` : '') +
                (filters.locationSort   ? `&locationSort=${filters.locationSort}` : '');
      if (latitude && longitude) {
        url += `&latitude=${latitude}&longitude=${longitude}`;
      }
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed with status: ${res.status}`);
      const data = await res.json();
      console.log('Search results:', data);
      onResults(data);
    } catch (error) {
      console.error('Search fetch error:', error);
      onResults({ events: [], travel: [], lodging: [] });
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const toggleFilterPopup = () => {
    setFilterPopupOpen(!isFilterPopupOpen);
  };

  const applyFilters = () => {
    setFilterPopupOpen(false);
    handleSearch();
  };

  const removeFilters = () => {
    setFilters(prevFilters => ({
      ...prevFilters,
      priceSort: '',
      locationSort: ''
    }));
    setIsFiltersRemoved(true);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search events (e.g., concert)"
      />
      <input
        placeholder="Location (e.g., New York)"
        onChange={(e) => setFilters({ ...filters, location: e.target.value })}
      />
      <input
        placeholder="Event Type (optional, e.g., music)"
        onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
      />
      <input
        type="datetime-local"
        placeholder="Start Date"
        onChange={(e) => setFilters({ ...filters, startDateTime: e.target.value })}
      />
      <input
        type="datetime-local"
        placeholder="End Date"
        onChange={(e) => setFilters({ ...filters, endDateTime: e.target.value })}
      />
      <div className='search-container'>
        <button onClick={handleSearch}>Search</button>
        <button onClick={toggleFilterPopup}>Filter</button>
      </div>

      {/* Filter Popup */}
      {isFilterPopupOpen && (
        <div className="filter-popup">
          <h3>Filters</h3>
          <div>
            <label>
              Price:
              <select name="priceSort" value={filters.priceSort} onChange={handleFilterChange}>
                <option value="">Sort Price</option>
                <option value="ascending">Low to High</option>
                <option value="descending">High to Low</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              Location:
              <select name="locationSort" value={filters.locationSort} onChange={handleFilterChange}>
                <option value="">Sort Location</option>
                <option value="ascending">Close to Distant</option>
                <option value="descending">Distant to Close</option>
              </select>
            </label>
          </div>
          <div className="filter-buttons">
            <button className="apply" onClick={applyFilters}>Apply Filters</button>
            <button className="remove-filters" onClick={removeFilters}>Remove Filters</button>
            <button className="close" onClick={toggleFilterPopup}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchBar;