// config/mailConfig.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter for different email providers
const createTransport = () => {
  // Gmail configuration (most common)
  if (process.env.MAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_APP_PASSWORD // Use App Password, not regular password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  // Outlook/Hotmail configuration
  if (process.env.MAIL_SERVICE === 'outlook') {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });
  }
  
  // Custom SMTP configuration
  if (process.env.MAIL_SERVICE === 'custom') {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT || 587,
      secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  // Default to Gmail if no service specified
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

module.exports = { createTransport };