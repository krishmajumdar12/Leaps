require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
});



// Function to send a password reset email
async function sendPasswordResetEmail(email, resetToken) {
    try {
        const resetUrl = `http://localhost:3001/reset-password?token=${resetToken}`;
        const info = await transporter.sendMail({
            from: '"Leaps App" <${process.env.EMAIL_USER}>',
            to: email,
            subject: 'Password Reset Request',
            html: `
              <h1>Password Reset</h1>
              <p>You requested a password reset. Click the link below to reset your password:</p>
              <a href="${resetUrl}">Reset Password</a>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
            `
        });  
        
        console.log('Email sent: %s', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendPasswordResetEmail };