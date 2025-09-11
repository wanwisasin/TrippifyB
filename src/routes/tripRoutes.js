const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(403).json({ error: 'forbidden' });
};

router.get('/mine', isAuthenticated, tripController.getUserTrips);
router.post('/', tripController.generateTripPlan);
router.get('/:tripId', tripController.getTripDetail);
router.post("/:tripId/join", tripController.joinTrip);
router.post("/saveOrUpdate", isAuthenticated, tripController.saveOrUpdateTrip);
module.exports = router;