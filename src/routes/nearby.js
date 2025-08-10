const express = require('express');
const router = express.Router();
const nearbyController = require('../controllers/nearbyController');

router.get('/nearby', nearbyController.getNearbySuggestions);

module.exports = router;
