const nodemailer = require('nodemailer');

// Create email transporter with simple password authentication
const createTransporter = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify the transporter configuration
    await transporter.verify();
    return transporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

module.exports = { createTransporter };
