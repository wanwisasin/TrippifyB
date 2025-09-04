const express = require("express");
const router = express.Router();
const { getNearbyPlaces } = require("../controllers/nearbyController");

router.get("/nearby", getNearbyPlaces);

module.exports = router;
