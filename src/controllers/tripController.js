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
    res.status(500).json({ code: 'GEMINI_ERROR', message: 'Failed to generate trip plan.' });
  }
};
exports.saveTripPlan = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const tripData = req.body;

    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Please login first.' });
    }

    if (!tripData) {
      return res.status(400).json({ code: 'NO_DATA', message: 'Missing trip data.' });
    }

    const result = await tripModel.saveTripPlan({
  ...tripData,
  trip_type: tripData.trip_type || 'solo',        
  group_size: tripData.trip_type === 'group' ? tripData.group_size : null
}, userId);


    return res.status(201).json({
      message: 'Trip saved successfully',
      tripId: result.tripId,
    });
  } catch (err) {
    console.error('Error saving trip:', err);
    return res.status(500).json({ code: 'SAVE_ERROR', message: 'Internal server error' });
  }
};
exports.updateTripPlan = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const tripId = req.params.tripId;
    const tripData = req.body;

    // ตรวจสอบว่า trip นี้เป็นของ user นี้หรือไม่
    const isOwner = await tripModel.checkTripOwner(tripId, userId);
    if (!isOwner) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'You are not the owner of this trip' });
    }

const result = await tripModel.updateTripPlan(tripId, {
  ...tripData,
  trip_type: tripData.trip_type || 'solo',
  group_size: tripData.trip_type === 'group' ? tripData.group_size : null
}, userId);

    return res.status(200).json({
      message: 'Trip updated successfully',
      tripId: result.tripId,
    });
  } catch (err) {
    console.error('Error updating trip:', err);
    return res.status(500).json({ code: 'UPDATE_ERROR', message: 'Internal server error' });
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

    if (!tripId) {
      return res.status(400).json({ code: 'NO_TRIP_ID', message: 'Trip ID is required.' });
    }

    const trip = await tripModel.getTripById(tripId);

    if (!trip) {
      return res.status(404).json({ code: 'TRIP_NOT_FOUND', message: 'Trip not found.' });
    }

    res.status(200).json(trip);
  } catch (err) {
    console.error('Get trip detail error:', err);
    res.status(500).json({ code: 'DETAIL_ERROR', message: 'Internal server error' });
  }
};

exports.getUserTrips = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not logged in' });
    }

    const trips = await tripModel.getTripsByUser(userId); // 👈 ฟังก์ชันนี้ต้องเขียนใน model

    return res.status(200).json(trips);
  } catch (err) {
    console.error('Get user trips error:', err);
    return res.status(500).json({ message: 'Failed to fetch user trips' });
  }
};
