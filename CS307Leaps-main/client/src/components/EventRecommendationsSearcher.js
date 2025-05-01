import React, { useEffect, useState } from 'react';

const EventRecommendationsSearcher = ({ onResults, location }) => {

  const handleSearch = async () => {
    const url = `https://leaps-ohwd.onrender.com/api/search?q=&location=${location}`;
    console.log(url);
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

  const debugMethod = () => {
        console.log("location: %s", location);
  }

  useEffect(() => {
    handleSearch();
  }, [location]   
  );
};

export default EventRecommendationsSearcher;