const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const fetch = require('node-fetch');
require('dotenv').config();

// Create a new custom event
router.post('/', auth, async (req, res) => {
    try {
        console.log(req.body);
        const { name, description, location, date, start_time, price, type,
            public: isPublic = false } = req.body;
        const creator_id = req.user.id; // From auth middleware
        if (!name || !location || !start_time || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Combine date and time into a full timestamp
        const formattedStartTime = `${date} ${start_time}:00`;
        // Insert event data into the database
        const result = await db.query(
            'INSERT INTO customevents (creator_id, name, description, location, start_time, price, type, public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [creator_id, name, description, location, formattedStartTime, price, type, isPublic]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating custom event:', err);
        res.status(500).json({ message: 'Server error creating custom event!' });
    }
});

router.patch('/:id/public', auth, async (req, res) => {
    const { id } = req.params;
    const { public: isPublic } = req.body;
    const result = await db.query(
        `UPDATE customevents
          SET public = $1
        WHERE id = $2 AND creator_id = $3
        RETURNING *`,
        [isPublic, id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Not found or not yours' });
    res.json(result.rows[0]);
});

// Get all custom events for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const sql =
            `SELECT * FROM customevents
         WHERE public = TRUE
            OR creator_id = $1`;
        const result = await db.query(sql, [req.user.id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ message: 'Server error fetching events' });
    }
});


// Delete a custom event by ID
router.delete('/:id', auth, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id; // From auth middleware

        // Ensure the user is the creator of the event
        const result = await db.query(
            'DELETE FROM customevents WHERE id = $1 AND creator_id = $2 RETURNING *',
            [eventId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Custom event not found or not authorized to delete' });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        console.error('Error deleting custom event:', err);
        res.status(500).json({ message: 'Server error deleting custom event' });
    }
});

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

// Get a single event by ID
router.get('/:id', (req, res, next) => {
    req.allowGuest = true;
    next();
}, auth, async (req, res) => {
    try {
        const eventID = req.params.id;
        console.log(`Fetching event with ID: ${eventID}`);
        console.log(`Fetching event from trip: ${req.query.tripId}\n\n`)

        let itemType = 'external';
        let overridePrice = null;

        try {
            const tripItemResult = await db.query(
                `SELECT item_type, price FROM trip_items WHERE item_id = $1 AND trip_id = $2`,
                [eventID, req.query.tripId]
            );

            if (tripItemResult.rows.length > 0) {
                itemType = tripItemResult.rows[0].item_type;
                overridePrice = tripItemResult.rows[0].price;
                console.log(`Item type: ${itemType}, override price: ${overridePrice}`);
            } else {
                console.log(`[GET /events/:id] No trip_items row — assuming external`);
            }
        } catch (err) {
            console.log("Error fetching item type and price override:", err.message);
            return res.status(500).json({ message: 'Error fetching item info' });
        }


        /*try {
            const result = await db.query(
                'SELECT * FROM events WHERE id = $1',
                [eventID]
            );

            if (result.rows.length > 0) {
                console.log("Found event in database");
                return res.json(result.rows[0]);
            }
        } catch (dbErr) {
            console.log("DB lookup failed, trying Ticketmaster instead:", dbErr.message);
        }*/

        let result;
        if (itemType === 'events') {
            // If item type is 'events', fetch from the 'events' table
            try {
                result = await db.query(
                    'SELECT * FROM events WHERE id = $1',
                    [eventID]
                );

                if (result.rows.length > 0) {
                    console.log("Found regular event in database");
                    return res.json({ ...result.rows[0], type: 'regular-event' });
                }
            } catch (dbErr) {
                console.log("Error fetching event from events table:", dbErr.message);
            }
        } else if (itemType === 'custom-event') {
            // If item type is 'custom-event', fetch from the 'custom-events' table
            try {
                result = await db.query(
                    'SELECT * FROM customevents WHERE id = $1',
                    [eventID]
                );

                if (result.rows.length > 0) {
                    console.log("Found custom event in database");
                    const customEvent = result.rows[0];

                    return res.json({
                        id: customEvent.id,
                        name: customEvent.name,
                        location: customEvent.location,
                        date: customEvent.start_time.toISOString().split('T')[0],
                        time: new Date(customEvent.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        }),
                        description: customEvent.description || 'No description available',
                        price: overridePrice ?? customEvent.price ?? 'Free',
                        image: customEvent.image || null,
                        url: 'N/A',
                        eventType: customEvent.type
                    });
                }
            } catch (dbErr) {
                console.log("Error fetching event from custom-events table:", dbErr.message);
            }
        } else if (itemType === 'external') {
            console.log("Falling back to Ticketmaster fetch");
            // continue to Ticketmaster fetch
        } else {
            return res.status(404).json({ message: 'Invalid item type in trip-items table' });
        }

        const tmApiKey = process.env.TICKETMASTER_API_KEY;
        if (!tmApiKey) {
            return res.status(500).json({ message: 'API configuration error' });
        }

        const tmUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventID}.json?apikey=${tmApiKey}`;
        const response = await fetch(tmUrl);
        //const response = getEventWithPricing(eventID);

        if (!response.ok) {
            console.log(`Ticketmaster API returned error: ${response.status}`);
            return res.status(404).json({ message: 'Event not found' });
        }

        const eventData = await response.json();
        let priceData;
        if (overridePrice != null) {
            priceData = { min: overridePrice, max: overridePrice, currency: 'USD', type: 'override' };
        } else {
            priceData = eventData.priceRanges?.[0] || randomPrice(eventData);
        }


        //console.log("Price data:", priceData);
        // Transform the Ticketmaster data to match your application's format
        const formattedEvent = {
            id: eventData.id,
            name: eventData.name,
            eventType: eventData.classifications?.[0]?.segment?.name || 'Unknown',
            location: eventData._embedded?.venues?.[0]?.city?.name || 'Unknown',
            date: eventData.dates?.start?.localDate || 'TBD',
            time: eventData.dates?.start?.localTime ?
                new Date(`1970-01-01T${eventData.dates?.start?.localTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                : 'TBD',
            description: eventData.info || eventData.pleaseNote || 'No description available',
            min_price: priceData.min,
            max_price: priceData.max,
            price: priceData
                ? `$${priceData.min} - $${priceData.max}`
                : 'Price unavailable',
            url: eventData.url || null,
            image: eventData.images?.[0]?.url || null
        };
        console.log("Formatted event data:", formattedEvent.name);
        res.json(formattedEvent);
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({ message: 'Server error fetching event' });
    }
});

router.put('/:id/price', auth, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const { price } = req.body;
        if (price == null) {
            return res.status(400).json({ message: 'Must supply a price' });
        }

        const result = await db.query(
            `UPDATE trip_items
           SET price = $1
         WHERE item_id = $2
           AND user_id = $3
         RETURNING *`,
            [price, eventId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Trip item not found or not yours' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating trip item price:', err);
        res.status(500).json({ message: 'Server error updating price' });
    }
});




module.exports = router;