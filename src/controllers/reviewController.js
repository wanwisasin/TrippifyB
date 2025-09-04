const Review = require('../models/reviewModel')

exports.addReview = async (req, res) => {
  try {
    const { tripId } = req.params
    const {user_name, rating, comment } = req.body

    if (!rating) {
      return res.status(400).json({ error: "Rating is required" })
    }

    const reviewId = await Review.createReview(
      tripId,
      user_name || "Anonymous User",
      rating,
      comment
    )

    res.json({ success: true, reviewId })
  } catch (err) {
    console.error("addReview error:", err)
    res.status(500).json({ error: "Failed to add review" })
  }
}

exports.getReviews = async (req, res) => {
  try {
    const { tripId } = req.params
    const reviews = await Review.getReviewsByTripId(tripId)
    res.json(reviews)
  } catch (err) {
    console.error("getReviews error:", err)
    res.status(500).json({ error: "Failed to fetch reviews" })
  }
}
