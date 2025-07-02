const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: 'Unauthorized' });
};

router.post('/', tripController.generateTripPlan); // ถ้ามี
router.post('/save', isAuthenticated, tripController.saveTripPlan);

module.exports = router;
