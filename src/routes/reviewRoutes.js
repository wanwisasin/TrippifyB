const express = require('express')
const router = express.Router()
const reviewController = require('../controllers/reviewController')

router.post('/:tripId', reviewController.addReview)
router.get('/:tripId', reviewController.getReviews)

module.exports = router
