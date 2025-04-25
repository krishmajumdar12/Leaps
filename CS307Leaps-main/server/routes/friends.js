const express = require('express');
const db = require('../config/db');
const router = express.Router();
const auth = require('../middleware/auth');


router.post('/add', auth, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { friend_id } = req.body;

        const [smaller_id, larger_id] = [user_id, friend_id].sort();

        const result = await db.query(
            `INSERT INTO friendships (user1_id, user2_id) 
             VALUES ($1, $2) RETURNING *`,
            [smaller_id, larger_id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while adding friend' });
    }
});

router.get('/list', auth, async (req, res) => {
    try {
        const user_id = req.user.id;

        const friends = await db.query(
            `SELECT u.id, u.username, u.email, u.profile_pic
             FROM friendships f
             JOIN users u ON (f.user1_id = u.id OR f.user2_id = u.id)
             WHERE (f.user1_id = $1 OR f.user2_id = $1)
             AND u.id != $1`,
            [user_id]
        );

        res.json(friends.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while fetching friends list' });
    }
});

router.delete('/remove', auth, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { friend_id } = req.body;

        const [smaller_id, larger_id] = [user_id, friend_id].sort();

        const result = await db.query(
            `DELETE FROM friendships 
             WHERE user1_id = $1 AND user2_id = $2
             RETURNING *`,
            [smaller_id, larger_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Friendship not found' });
        }

        res.json({ message: 'Friend removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while removing friend' });
    }
});

router.get('/search', auth, async (req, res) => {
    try {
        const { query } = req.query; // e.g., ?query=nath
        if (!query) return res.status(400).json({ message: 'Search query required' });

        const user_id = req.user.id;
        const searchTerm = `%${query.toLowerCase()}%`;

        const results = await db.query(
            `SELECT id, username, email
             FROM users
             WHERE LOWER(username) LIKE $1
             AND id != $2
             AND id NOT IN (
                 SELECT CASE
                     WHEN user1_id = $2 THEN user2_id
                     WHEN user2_id = $2 THEN user1_id
                 END
                 FROM friendships
                 WHERE user1_id = $2 OR user2_id = $2
             )`,
            [searchTerm, user_id]
        );

        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while searching users' });
    }
});

router.post('/request', auth, async (req, res) => {
    const sender_id = req.user.id;
    const { receiver_id } = req.body;
  
    if (sender_id === receiver_id) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }
  
    try {
      await db.query('BEGIN');
      await db.query(
        `INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [sender_id, receiver_id]
      );

      // Send Notification 
      const sender = await db.query(
        'SELECT username FROM users WHERE id = $1',
        [sender_id]
      );

      if (sender.rows.length > 0) {
        const senderUsername = sender.rows[0].username;

        // Create notification for receiver
        await db.query(
          `INSERT INTO notifications (user_id, type, message, is_read)
           VALUES ($1, $2, $3, $4)`,
          [
            receiver_id, 
            'friend_request', 
            `${senderUsername} sent you a friend request!`, 
            false
          ]
        );
      }

      await db.query('COMMIT');
      res.json({ message: 'Friend request sent' });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Error sending friend request' });
    }
  });

  router.get('/requests', auth, async (req, res) => {
    const user_id = req.user.id;
  
    try {
      const result = await db.query(
        `SELECT fr.id, u.id as sender_id, u.username, u.email
         FROM friend_requests fr
         JOIN users u ON fr.sender_id = u.id
         WHERE fr.receiver_id = $1`,
        [user_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching friend requests' });
    }
  });
  
  router.post('/respond', auth, async (req, res) => {
    const user_id = req.user.id;
    const { request_id, action } = req.body; // action = 'accept' or 'reject'
  
    try {
      const requestResult = await db.query(
        `SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2`,
        [request_id, user_id]
      );
  
      if (requestResult.rows.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
  
      const { sender_id } = requestResult.rows[0];

      const user = await db.query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );
  
      if (action === 'accept') {
        const [smaller, larger] = [sender_id, user_id].sort();
        await db.query(
          `INSERT INTO friendships (user1_id, user2_id) VALUES ($1, $2)`,
          [smaller, larger]
        );

        // Send notification
        await db.query(
          `INSERT INTO notifications (user_id, type, message, is_read) 
           VALUES ($1, $2, $3, $4)`,
          [
            sender_id,
            'friend_request',
            `${user.rows[0].username} accepted your friend request.`,
            false,
          ]
        );

      } else if (action === 'reject') {
        // Send Notification
        await db.query(
          `INSERT INTO notifications (user_id, type, message, is_read) 
           VALUES ($1, $2, $3, $4)`,
          [
            sender_id,
            'friend_request',
            `${user.rows[0].username} rejected your friend request.`,
            false,
          ]
        );
      }
  
      await db.query(`DELETE FROM friend_requests WHERE id = $1`, [request_id]);
  
      res.json({ message: `Request ${action}ed` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error responding to friend request' });
    }
  });

  router.get('/outgoing', auth, async (req, res) => {
    const sender_id = req.user.id;
  
    try {
      const result = await db.query(
        `SELECT fr.receiver_id, u.username, u.email
         FROM friend_requests fr
         JOIN users u ON fr.receiver_id = u.id
         WHERE fr.sender_id = $1`,
        [sender_id]
      );
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching outgoing friend requests:', err);
      res.status(500).json({ message: 'Server error fetching outgoing requests' });
    }
  });

  router.delete('/request', auth, async (req, res) => {
    const sender_id = req.user.id;
    const { receiver_id } = req.body;
  
    try {
      const result = await db.query(
        `DELETE FROM friend_requests
         WHERE sender_id = $1 AND receiver_id = $2
         RETURNING *`,
        [sender_id, receiver_id]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No pending request to cancel' });
      }
  
      res.json({ message: 'Friend request canceled' });
    } catch (err) {
      console.error('Error canceling request:', err);
      res.status(500).json({ message: 'Server error while canceling request' });
    }
  });

  router.get('/suggestions', auth, async (req, res) => {
    const user_id = req.user.id;
  
    try {
      const result = await db.query(
        `
        WITH user_friends AS (
          SELECT CASE 
            WHEN user1_id = $1 THEN user2_id
            ELSE user1_id
          END AS friend_id
          FROM friendships
          WHERE user1_id = $1 OR user2_id = $1
        ),
        friends_of_friends_raw AS (
          SELECT
            CASE 
              WHEN f.user1_id = uf.friend_id THEN f.user2_id
              ELSE f.user1_id
            END AS suggested_id
          FROM friendships f
          JOIN user_friends uf ON f.user1_id = uf.friend_id OR f.user2_id = uf.friend_id
          WHERE NOT (f.user1_id = $1 OR f.user2_id = $1)
        ),
        suggestions_with_count AS (
          SELECT suggested_id, COUNT(*) AS mutual_count
          FROM friends_of_friends_raw
          WHERE suggested_id != $1
          AND suggested_id NOT IN (SELECT friend_id FROM user_friends)
          GROUP BY suggested_id
        )
        SELECT u.id, u.username, u.email, s.mutual_count
        FROM suggestions_with_count s
        JOIN users u ON u.id = s.suggested_id
        ORDER BY s.mutual_count DESC
        LIMIT 10;
        `,
        [user_id]
      );
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error generating friend suggestions:', err);
      res.status(500).json({ message: 'Server error generating suggestions' });
    }
  });
  
module.exports = router;