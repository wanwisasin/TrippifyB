const express = require("express");
const router = express.Router();
const nearbyController = require("../controllers/nearbyController");

router.get("/nearby", nearbyController.getNearbyPlaces);
router.get("/search", nearbyController.searchPlaces);
module.exports = router;
