const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { fetchFlights, fetchFlightByID } = require('../services/api-service');


router.get('/', (req, res, next) => {
    req.allowGuest = true;
    next();
  }, auth, async (req, res) => {
    const { origin, destination, departureDate } = req.query;
    try {
      const flights = await fetchFlights(origin, destination, departureDate);
      res.json(flights);
    } catch (err) {
      console.error('Error fetching travel items:', err);
      res.status(500).json({ message: 'Server error fetching travel items' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
      const {
        type,
        departure_location,
        arrival_location,
        departure,
        arrival,
        price,
        notes
      } = req.body;

      const insertQuery = `
        INSERT INTO travel (
          type,
          departure_location,
          arrival_location,
          departure,
          arrival,
          price,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
  
      const insertValues = [
        type,
        departure_location,
        arrival_location,
        departure,
        arrival,
        price || 0,
        notes || ''
      ];
  
      const result = await db.query(insertQuery, insertValues);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error creating travel item:', err);
      res
        .status(500)
        .json({ message: 'Server error creating travel item' });
    }
  });
  
  /* Use Amadeus API from api-service to get flight details by id */
  router.get(
    '/:id',
    (req, res, next) => {
      req.allowGuest = true;
      next();
    },
    auth,
    async (req, res) => {
      try {
        const { id } = req.params;
    
        // Query DB for stored flight_offer_json by item_id = id and item_type = 'travel'
        const result = await db.query(
          `SELECT flight_offer_json FROM trip_items WHERE item_id = $1 AND item_type = 'travel'`,
          [id]
        );
    
        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Flight not found' });
        }
    
        const flightOfferJson = result.rows[0].flight_offer_json;
    
        // Call fetchFlightByID with the full JSON
        const flightDetails = await fetchFlightByID(flightOfferJson);

        if (!flightDetails) {
          return res.status(500).json({ message: 'Error fetching flight details' });
        }

        res.json(flightDetails);
      } catch (err) {
        console.error('Error fetching flight pricing by stored offer JSON:', err);
        res.status(500).json({ message: 'Server error fetching flight data' });
      }
    }
  );


module.exports = router;
