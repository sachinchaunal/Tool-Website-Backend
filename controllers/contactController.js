const { createTransporter } = require('../config/emailConfig');

// Controller for handling contact form submissions
exports.sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide name, email, subject and message.' 
      });
    }
    
    // Create email transporter
    const transporter = await createTransporter();
    
    // Compose email
    const mailOptions = {
      from: `"Tool Website" <${process.env.EMAIL}>`,
      to: process.env.EMAIL, // Send to your own email
      replyTo: email,
      subject: `Tool Website Contact: ${subject}`,
      html: `
        <h2>New message from Tool Website</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully!'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message', 
      error: error.message 
    });
  }
};
