const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Get RSVP statuses for a trip
router.get('/:tripId/rsvp-status', auth, async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.id;

        // Check if user is member of this trip
        const tripCheck = await db.query(
            `SELECT 1 FROM trips 
             WHERE id = $1 
             AND (creator_id = $2 OR id IN (SELECT trip_id FROM trip_members WHERE user_id = $2))`,
            [tripId, userId]
        );

        if (tripCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to view this trip' });
        }

        // Get RSVP statuses for all members
        const result = await db.query(
            `SELECT u.id, u.username, u.profile_pic, r.status, r.response_date
             FROM users u
             LEFT JOIN trip_rsvp_status r ON u.id = r.user_id AND r.trip_id = $1
             WHERE u.id IN (
                 SELECT user_id FROM trip_members WHERE trip_id = $1
                 UNION
                 SELECT creator_id FROM trips WHERE id = $1
             )`,
            [tripId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error getting RSVP statuses:', err);
        res.status(500).json({ message: 'Server error getting RSVP statuses' });
    }
});

// Update RSVP status
router.post('/:tripId/rsvp', auth, async (req, res) => {
    try {
        const { tripId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        // Validate status
        if (!['attending', 'not_attending', 'maybe', 'no_response'].includes(status)) {
            return res.status(400).json({ message: 'Invalid RSVP status' });
        }

        // Check if user is member of this trip
        const tripCheck = await db.query(
            `SELECT 1 FROM trips 
             WHERE id = $1 
             AND (creator_id = $2 OR id IN (SELECT trip_id FROM trip_members WHERE user_id = $2))`,
            [tripId, userId]
        );

        if (tripCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to RSVP to this trip' });
        }

        // Update or insert RSVP status
        const result = await db.query(
            `INSERT INTO trip_rsvp_status (trip_id, user_id, status, response_date) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (trip_id, user_id) 
             DO UPDATE SET status = $3, response_date = CURRENT_TIMESTAMP
             RETURNING *`,
            [tripId, userId, status]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating RSVP status:', err);
        res.status(500).json({ message: 'Server error updating RSVP status' });
    }
});

// Send RSVP reminder notification
router.post('/:tripId/send-reminder/:memberId', auth, async (req, res) => {
    try {
        const { tripId, memberId } = req.params;
        const userId = req.user.id;

        // Check if requester is creator or co-creator
        const tripCheck = await db.query(
            `SELECT name FROM trips WHERE id = $1 AND creator_id = $2
             UNION
             SELECT t.name FROM trips t
             JOIN trip_member_roles r ON t.id = r.trip_id
             WHERE t.id = $1 AND r.user_id = $2 AND r.role = 'co-creator'`,
            [tripId, userId]
        );

        if (tripCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Only trip creators can send reminders' });
        }

        const tripName = tripCheck.rows[0].name;

        // Check if member is part of the trip
        const memberCheck = await db.query(
            `SELECT username FROM users 
             WHERE id = $1 AND id IN (
                 SELECT user_id FROM trip_members WHERE trip_id = $2
             )`,
            [memberId, tripId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Member not found in trip' });
        }

        const memberName = memberCheck.rows[0].username;
        
        // Get requester's name
        const requesterName = await db.query(
            'SELECT username FROM users WHERE id = $1',
            [userId]
        );

        // Create notification
        await db.query(
            `INSERT INTO notifications (user_id, trip_id, type, message, is_read)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                memberId,
                tripId,
                'trip_status',
                `${requesterName.rows[0].username} has requested your RSVP for trip: ${tripName}`,
                false
            ]
        );

        res.json({ message: `RSVP reminder sent to ${memberName}` });
    } catch (err) {
        console.error('Error sending RSVP reminder:', err);
        res.status(500).json({ message: 'Server error sending RSVP reminder' });
    }
});

module.exports = router;