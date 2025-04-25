const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/trip/:tripId', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const memberCheck = await db.query(
      'SELECT * FROM trip_members WHERE trip_id = $1 AND user_id = $2',
      [tripId, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ msg: 'Not authorized to view these messages' });
    }
    
    const messagesResult = await db.query(
      `SELECT m.*, u.username as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.trip_id = $1
       ORDER BY m.created_at ASC`,
      [tripId]
    );
    
    res.json(messagesResult.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // e.g. "http://localhost:3000/uploads/filename.png"
    const fileUrl = `${process.env.SERVER_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;

    return res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return res.status(500).json({ message: 'Server error uploading file' });
  }
});
module.exports = router;