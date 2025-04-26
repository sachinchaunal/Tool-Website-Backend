const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Route for sending contact messages
router.post('/send-message', contactController.sendMessage);

module.exports = router;
