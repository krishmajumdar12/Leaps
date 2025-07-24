const express = require('express');
const router = express.Router();
const apiService = require('../services/api-service');
const auth = require('../middleware/auth'); 

router.get('/', (req, res, next) => {
  req.allowGuest = true;
  next();
}, auth, async (req, res) => {
  const { q, location, eventType, startDateTime, endDateTime, priceSort, locationSort, latitude, longitude} = req.query; // Use startDateTime and endDateTime
  console.log('Query parameters:', { q, location, eventType, startDateTime, endDateTime, priceSort, locationSort, latitude, longitude }); // Debugging log

  console.log("q = %s", q);
  console.log("location: %s", location);
  console.log("event type %s", eventType);
  try {
    const results = [];
    if (q || location || eventType || startDateTime || endDateTime || priceSort || locationSort || latitude || longitude) {
      results = await apiService.fetchEvents(q, location, eventType, startDateTime, endDateTime, priceSort, locationSort, latitude, longitude); // Pass startDateTime and endDateTime
    }
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;