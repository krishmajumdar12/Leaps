const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendPasswordResetEmail } = require('../services/email-service'); // Import email service
const router = express.Router();


router.post('/request-reset', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            // Don't reveal if email exists or not for security reasons
            return res.status(200).json({ message: 'If your email exists in our system, you will receive a password reset link' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now

        await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
            [resetToken, resetTokenExpiry, email]
        );

        const emailResult = await sendPasswordResetEmail(email, resetToken);

        const response = { 
            message: 'If your email exists in our system, you will receive a password reset link'
        };
        if (emailResult.success && emailResult.previewUrl) {
            response.previewUrl = emailResult.previewUrl;
        }

        res.status(200).json(response);
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Server error during password reset request' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const userResult = await db.query(
            'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > $2',
            [token, new Date()]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired password reset token' });
        }

        const userId = userResult.rows[0].id;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password and clear the reset token
        await db.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
            [hashedPassword, userId]
        );

        res.status(200).json({ message: 'Password has been successfully reset' });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

module.exports = router;

