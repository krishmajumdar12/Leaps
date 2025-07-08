const fetch = require('node-fetch');
const axios = require('axios');
require('dotenv').config();

// Haversine formula to calculate distance between two points in kilometers
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

const randomPrice = (event) => {
  // Default price ranges if event type is unknown
  let minRange = 35;
  let maxRange = 85;
  let variance = 15;
  
  // Get the event type (lowercase for consistent comparison)
  const eventType = (event.eventType || event.classifications?.[0]?.segment?.name || '').toLowerCase();
  
  // Adjust price ranges based on event type
  if (eventType.includes('sport')) {
    minRange = 45;
    maxRange = 250;
    variance = 50;
  } else if (eventType.includes('music') || eventType.includes('concert')) {
    minRange = 40;
    maxRange = 180;
    variance = 40;
  } else if (eventType.includes('theater') || eventType.includes('broadway')) {
    minRange = 60;
    maxRange = 200;
    variance = 30;
  } else if (eventType.includes('family') || eventType.includes('children')) {
    minRange = 25;
    maxRange = 65;
    variance = 10;
  } else if (eventType.includes('comedy')) {
    minRange = 35;
    maxRange = 95;
    variance = 15;
  } else if (eventType.includes('festival')) {
    minRange = 75;
    maxRange = 350;
    variance = 75;
  }
  
  const min = Math.max(Math.round(minRange + (Math.random() * variance * 2 - variance)), 5);
  const priceSpread = Math.round((maxRange - minRange) * (0.5 + Math.random() * 0.5));
  const max = min + priceSpread;
  
  return {
    min: min,
    max: max,
    currency: "USD",
    type: "standard"
  };
};

const fetchHotels = async (location) => {
  console.log('Received hotel search parameters:', { location });

  const results = [];
  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey) {
    console.error('SerpAPI key not set in .env');
    return results;
  }

  // Construct search query for Google Hotels
  const query = `hotels in ${location || 'New York'}`;
  const params = {
    engine: 'google_hotels',
    api_key: serpApiKey,
    q: query,
    hl: 'en',
    check_in_date: '2025-07-09',
    check_out_date: '2025-07-10'
  };

  try {
    const response = await axios.get('https://serpapi.com/search.json', { params });
    const hotelsRaw = response.data.hotels_results || [];
    console.log('Result hotel array length:', hotelsRaw.length);

    for (const hotel of hotelsRaw) {
      const minPrice = hotel.price
        ? parseInt(hotel.price.replace(/[^0-9]/g, '')) || null
        : null;

      results.push({
        type: 'hotel',
        name: hotel.name || 'Unnamed Hotel',
        location: hotel.address || location || 'Unknown',
        price: hotel.price || 'Price unavailable',
        rating: hotel.rating || null,
        min_price: minPrice,
        thumbnail: hotel.thumbnail || null,
        link: hotel.link || null
      });
    }

  } catch (error) {
    console.error('SerpAPI hotel fetch failed:', error.message);
  }

  return results;
};

const fetchExternalData = async (query, location, eventType, startDateTime, endDateTime, priceSort, locationSort, latitude, longitude) => {
  console.log('Received parameters:', { query, location, eventType, startDateTime, endDateTime, priceSort, locationSort, latitude, longitude }); // Debugging log
  const results = { events: [], travel: [], lodging: [] };
  const tmApiKey = process.env.TICKETMASTER_API_KEY;
  if (!tmApiKey) {
    console.error('Ticketmaster API key not set in .env');
    return results;
  }

  // Normalize location (e.g., 'NY' to 'New York')
  const normalizedLocation = location === 'NY' ? 'New York' : location || '';

  // Ensure startDateTime and endDateTime are in full ISO 8601 format
  const formattedStartDateTime = startDateTime || null;
  const formattedEndDateTime = endDateTime || null;

  // Build URL with optional eventType, startDateTime, and endDateTime
  let tmUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmApiKey}&keyword=${encodeURIComponent(query || '')}`;
  if (normalizedLocation) {
    tmUrl += `&city=${encodeURIComponent(normalizedLocation)}`;
  }
  if (eventType) {
    tmUrl += `&classificationName=${encodeURIComponent(eventType)}`;
  }
  if (formattedStartDateTime) {
    tmUrl += `&startDateTime=${formattedStartDateTime}`;
  }
  if (formattedEndDateTime) {
    tmUrl += `&endDateTime=${formattedEndDateTime}`;
  }

  console.log('Constructed Ticketmaster URL:', tmUrl); // Debugging log

  try {
    const response = await fetch(tmUrl);
    if (!response.ok) throw new Error(`Ticketmaster API error: ${response.status}`);
    const data = await response.json();
    if (data._embedded?.events) {
      results.events = data._embedded.events.map(event => {
        const priceObj = event.priceRanges?.[0] || randomPrice(event);
        const price = priceObj ? priceObj.min : null;
        const venue = event._embedded?.venues?.[0];
        const eventLocation = venue ? venue.location : {};
        const eventLat = eventLocation.latitude || 0;
        const eventLon = eventLocation.longitude || 0;

        // Calculate the distance from the user's location
        const distance = getDistance(latitude, longitude, eventLat, eventLon);

        return {
          id: event.id,
          type: 'event',
          name: event.name,
          eventType: event.classifications?.[0]?.segment?.name || 'unknown',
          location: venue?.city?.name || normalizedLocation || 'Unknown',
          start_time: event.dates?.start?.dateTime || null,
          price: price ? `Starting at: $${price}` : 'Price unavailable',
          distance: distance,
          min_price: priceObj ? priceObj.min : null
        };
      });

      if (priceSort) {
        results.events = results.events.sort((a, b) => {
          if (priceSort === 'ascending') {
            return (a.min_price || 0) - (b.min_price || 0);
          } else if (priceSort === 'descending') {
            return (b.min_price || 0) - (a.min_price || 0);
          }
          return 0;
        });
      }

      if (locationSort) {
        results.events = results.events.sort((a, b) => {
          if (locationSort === 'ascending') {
            return (a.distance || 0) - (b.distance || 0);
          } else if (locationSort === 'descending') {
            return (b.distance || 0) - (a.distance || 0);
          }
          return 0;
        });
      }

    }
  } catch (error) {
    console.error('Ticketmaster API fetch failed:', error.message);
  }
  return results;
};

module.exports = { fetchExternalData, fetchHotels };