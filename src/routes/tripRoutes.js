const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(403).json({ error: 'forbidden' });
};

router.get('/mine', isAuthenticated, tripController.getUserTrips);
router.post('/', tripController.generateTripPlan);
router.post('/save', isAuthenticated, tripController.saveTripPlan);
router.get('/:tripId', isAuthenticated, tripController.getTripDetail);
router.put('/:tripId', isAuthenticated, tripController.updateTripPlan);

module.exports = router;