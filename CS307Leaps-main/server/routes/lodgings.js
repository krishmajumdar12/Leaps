const express = require('express');
const router = express.Router();
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

module.exports = router;
