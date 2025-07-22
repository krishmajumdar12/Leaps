const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { fetchHotels } = require('../services/api-service');

// Get all lodgings
router.get('/', (req, res, next) => {
    req.allowGuest = true; // Enable guest access for this route
    next();
  }, auth, async (req, res) => {
    const { location } = req.query;
    try {
        const hotels = await fetchHotels(location);
        res.json(hotels);
    } catch (err) {
        console.error('Error fetching lodgings:', err);
        res.status(500).json({ message: 'Server error fetching hotels' });
    }
});

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
// Get lodging info by id
router.get('/:id', auth, async (req, res) => {
    const placeId = req.params.id;
  
    try {
      const fields = [
        'name',
        'formatted_address',
        'website',
        'rating',
        'user_ratings_total',
        'photos',
      ].join(',');
  
      const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
  
      const response = await axios.get(googleUrl);
      const result = response.data.result;
  
      if (!result) {
        return res.status(404).json({ error: 'No hotel details found.' });
      }
  
      const hotelDetails = {
        name: result.name,
        address: result.formatted_address,
        website: result.website,
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        photos: result.photos?.map(photo => ({
          photo_reference: photo.photo_reference,
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        }))
      };
  
      res.json(hotelDetails);
    } catch (err) {
      console.error('Error fetching hotel details:', err.message);
      res.status(500).json({ error: 'Failed to fetch hotel details' });
    }
  });

module.exports = router;
