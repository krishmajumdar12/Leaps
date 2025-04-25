const express = require('express');
const db = require('../config/db');
const router = express.Router();
const auth = require('../middleware/auth');

// Get all notifications for the current user
router.get('/list', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    console.log('Fetching notifications for user:', userId);

    // Fetch user preferences
    const preferencesResult = await db.query(
      `SELECT friend_request, trip_update, trip_status, ratio_changed
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (preferencesResult.rows.length === 0) {
      return res.status(404).json({ message: 'Notification preferences not found' });
    }
    console.log('Notification preferences found');
    const { friend_request, trip_update, trip_status, ratio_changed } = preferencesResult.rows[0];

    // Fetch notifications based on preferences
    const result = await db.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
         AND (
           (type = 'friend_request' AND $2 = true) OR
           (type = 'trip_update' AND $3 = true) OR
           (type = 'trip_status' AND $4 = true) OR
           (type = 'ratio_changed' AND $5 = true)
         )
       ORDER BY created_at DESC`,
      [userId, friend_request, trip_update, trip_status, ratio_changed]
    );

    console.log('Notifications retrieved:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.log('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a specific notification as read
router.put('/:id/read', auth, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;
  
  try {
    const result = await db.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1`,
      [userId]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notification count
router.get('/count', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch user preferences
    const preferencesResult = await db.query(
      `SELECT friend_request, trip_update, trip_status, ratio_changed
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (preferencesResult.rows.length === 0) {
      return res.status(404).json({ message: 'Notification preferences not found' });
    }

    const { friend_request, trip_update, trip_status, ratio_changed } = preferencesResult.rows[0];

    // Count unread notifications based on preferences
    const result = await db.query(
      `SELECT COUNT(*) 
       FROM notifications 
       WHERE user_id = $1 
         AND is_read = false
         AND (
           (type = 'friend_request' AND $2 = true) OR
           (type = 'trip_update' AND $3 = true) OR
           (type = 'trip_status' AND $4 = true) OR
           (type = 'ratio_changed' AND $5 = true)
         )`,
      [userId, friend_request, trip_update, trip_status, ratio_changed]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error getting notification count:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;
  
  try {
    const result = await db.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification preferences for the current user
router.get('/preferences', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    let result = await db.query(
      `SELECT *
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    // If no preferences exist, create default preferences
    if (result.rows.length === 0) {
      result = await db.query(
        `INSERT INTO notification_preferences (user_id, friend_request, trip_update, trip_status, ratio_changed)
         VALUES ($1, true, true, true, true)
         RETURNING *`,
        [userId]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching preferences:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update notification preferences for the current user
router.put('/preferences', auth, async (req, res) => {
  const userId = req.user.id;
  const { friend_request, trip_update, trip_status, ratio_changed } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO notification_preferences (user_id, friend_request, trip_update, trip_status, ratio_changed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET friend_request = $2, trip_update = $3, trip_status = $4, ratio_changed = $5
       RETURNING *`,
      [userId, friend_request, trip_update, trip_status, ratio_changed]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;