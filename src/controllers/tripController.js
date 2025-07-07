const tripModel = require('../models/tripModel');
const {callGeminiAPI} = require('../services/geminiService');
// 🔮 Generate Smart Trip Plan (Gemini)
exports.generateTripPlan = async (req, res) => {
  try {
    const tripData = req.body;
    const plan = await callGeminiAPI(tripData);
    res.json(plan);
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'Failed to generate trip plan.' });
  }
};
exports.saveTripPlan = async (req, res) => {
  try {
    const userId = req.user.user_id; // ดึง user id จาก session/passport
    const tripData = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // บันทึก trip plan ลง db
    const result = await tripModel.saveTripPlan(tripData, userId);

    return res.status(201).json({
      message: 'Trip saved successfully',
      tripId: result.tripId,
    });
  } catch (err) {
    console.error('Error saving trip:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.joinTrip = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const tripId = req.params.tripId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const isMember = await tripModel.checkIfMember(tripId, userId);

    if (!isMember) {
      await tripModel.addMember(tripId, userId, 'member');
    }

    res.json({ message: 'Joined the trip successfully' });
  } catch (err) {
    console.error('Join trip error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTripDetail = async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const trip = await tripModel.getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(trip);
  } catch (err) {
    console.error('Get trip detail error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
