const express = require('express');
const router = express.Router();
const converterController = require('../controllers/converterController');

// HTML to React conversion route
router.post('/html-to-react', converterController.htmlToReact);

module.exports = router;
