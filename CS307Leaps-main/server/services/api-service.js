const fetch = require('node-fetch');
const axios = require('axios');
const Amadeus = require('amadeus');
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
  const results = [];
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  try {
    // Use Places Text Search API with query 'hotels in {location}'
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: `hotels in ${location}`,
        key: GOOGLE_API_KEY,
      },
    });

    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status, response.data.error_message);
      return results;
    }

    const hotels = response.data.results;

    for (const hotel of hotels) {
      results.push({
        id: hotel.place_id,
        name: hotel.name,
        address: hotel.formatted_address || null,
        rating: hotel.rating || null,
        user_ratings_total: hotel.user_ratings_total || null,
        types: hotel.types[0] || [],
        location: hotel.geometry?.location || null,
        photos: hotel.photos ? hotel.photos.map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
        ) : [],
      });
    }
  } catch (error) {
    console.error('Error fetching hotels from Google Places:', error.message || error);
  }

  return results;
};

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET
});

/*const fetchHotels = async (location) => {
  const results = [];
  console.log('Received hotel search parameters:', { location });

  try {
    // Search location
    const locationResponse = await amadeus.referenceData.locations.get({
      keyword: location,
      subType: 'CITY',
    });

    if (!locationResponse.data?.length) {
      console.error('Location not found');
      return results;
    }

    let cityData = locationResponse.data.find(item => item.iataCode) ||
                   locationResponse.data.find(item => item.geoCode?.latitude && item.geoCode?.longitude);

    if (!cityData) {
      console.error('No valid cityCode or geoCode found');
      return results;
    }

    const cityCode = cityData.iataCode;
    const geoCode = cityData.geoCode;
    console.log(`Location found: cityCode=${cityCode}, geoCode=${JSON.stringify(geoCode)}`);

    let hotelsListResponse;
    if (cityCode) {
      hotelsListResponse = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode });
    } else if (geoCode?.latitude && geoCode?.longitude) {
      hotelsListResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
        latitude: geoCode.latitude,
        longitude: geoCode.longitude,
      });
    } else {
      console.error('No valid location data to search hotels');
      return results;
    }

    const hotels = hotelsListResponse.data?.slice(0, 3) || [];

    for (const hotel of hotels) {
      try {
        const offerRes = await amadeus.shopping.hotelOffersSearch.get({
          hotelIds: hotel.hotelId,
          adults: 2,
        });

        const offerData = offerRes.data?.[0];
        const offer = offerData?.offers?.[0];

        results.push({
          id: hotel.hotelId,
          name: hotel.name,
          location: hotel.address?.lines?.join(', ') || location,
          latitude: hotel.geoCode?.latitude || null,
          longitude: hotel.geoCode?.longitude || null,
          price_per_night: offer?.price?.total ? parseFloat(offer.price.total) : null,
          check_in_date: offer?.checkInDate || null,
          check_out_date: offer?.checkOutDate || null,
          refundable: offer?.policies?.refundable?.cancellationRefund || false,
          description: offer?.room?.description?.text || '',
          rating: hotel.rating || null,
          thumbnail: hotel.media?.[0]?.uri || null,
          link: offer?.self || null,
          type: 'Hotel',
        });
      } catch (err) {
        console.warn(`No offer found for hotel ${hotel.hotelId}:`, err.message || err);
        // Push minimal data if no in depth details found
        results.push({
          id: hotel.hotelId,
          name: hotel.name,
          location: hotel.address?.lines?.join(', ') || location,
          latitude: hotel.geoCode?.latitude || null,
          longitude: hotel.geoCode?.longitude || null,
          price_per_night: null,
          rating: hotel.rating || null,
          thumbnail: hotel.media?.[0]?.uri || null,
          description: '',
          type: 'Hotel',
        });
      }
    }
  } catch (err) {
    console.error('Amadeus hotel fetch failed:', err.message || err);
  }

  return results;
};*/

/*const fetchHotels = async (location) => {
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
    engine: 'google_maps',
    api_key: serpApiKey,
    q: query,
    hl: 'en',
    type: 'search'
  };

  try {
    const response = await axios.get('https://serpapi.com/search.json', { params });
    const hotelsRaw = response.data.local_results || [];
    console.log('Result hotel array length:', hotelsRaw.length);

    for (const hotel of hotelsRaw) {
      const minPrice = hotel.price
        ? parseInt(hotel.price.replace(/[^0-9]/g, '')) || null
        : null;

      results.push({
        type: hotel.type,
        name: hotel.title || 'Unnamed Hotel',
        location: hotel.address || location || 'Unknown',
        price: hotel.price || 'Price unavailable',
        rating: hotel.rating || null,
        min_price: minPrice,
        description: hotel.description || null,
        thumbnail: hotel.thumbnail || null,
        link: hotel.website || null
      });
    }

  } catch (error) {
    console.error('SerpAPI hotel fetch failed:', error.message);
  }

  return results;
};*/

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
      results.events = await Promise.all(
        data._embedded.events.map(async (event) => {
          let priceObj = event.priceRanges?.[0];
          // Fallback: fetch full event details if price is missing
          if (!priceObj) {
            try {
              const detailsUrl = `https://app.ticketmaster.com/discovery/v2/events/${event.id}.json?apikey=${tmApiKey}`;
              const detailsRes = await fetch(detailsUrl);
              if (detailsRes.ok) {
                const fullEvent = await detailsRes.json();
                priceObj = fullEvent.priceRanges?.[0];
              }
            } catch (err) {
              console.warn(`Failed to fetch event details for ${event.id}`, err);
            }
          }

          const priceMin = priceObj?.min ?? null;
          const priceMax = priceObj?.max ?? null;
          let priceLabel = 'Price unavailable';
          if (priceMin !== null && priceMax !== null) {
            priceLabel = `$${priceMin} – $${priceMax}`;
          } else if (priceMin !== null) {
            priceLabel = `Starting at $${priceMin}`;
          } else {
            priceLabel = 'Dynamic pricing — view on Ticketmaster';
          }
      
          const price = priceObj ? priceObj.min : null;
          const venue = event._embedded?.venues?.[0];
          const eventLocation = venue?.location || {};
          const eventLat = eventLocation.latitude || 0;
          const eventLon = eventLocation.longitude || 0;
          const distance = getDistance(latitude, longitude, eventLat, eventLon);
      
          return {
            id: event.id,
            type: 'event',
            name: event.name,
            eventType: event.classifications?.[0]?.segment?.name || 'unknown',
            location: venue?.city?.name || normalizedLocation || 'Unknown',
            start_time: event.dates?.start?.dateTime || null,
            price: priceLabel,
            distance: distance,
            image: event.images?.[0]?.url || null,
            min_price: priceMin,
            max_price: priceMax
          };
        })
      );
      

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