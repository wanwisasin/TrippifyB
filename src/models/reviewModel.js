const db = require('../utils/db');

exports.createReview = async (tripId,user_name, rating, comment) => {
  const [result] = await db.query(
    "INSERT INTO trip_reviews (trip_id, user_name, rating, comment) VALUES (?, ?, ?, ?)",
    [tripId, user_name, rating, comment]
  )
  return result.insertId
}

exports.getReviewsByTripId = async (tripId) => {
  const [rows] = await db.query(
    "SELECT * FROM trip_reviews WHERE trip_id = ? ORDER BY created_at DESC",
    [tripId]
  )
  return rows
}
