const tripModel = require('../models/tripModel');
const { callGeminiAPI } = require('../services/geminiService');
// 🔮 Generate Smart Trip Plan (Gemini)
exports.generateTripPlan = async (req, res) => {
  try {
    const tripData = req.body;

    const plan = await callGeminiAPI(tripData);
    // 2️⃣ สำหรับแต่ละ location เรียก Gemini Nearby API
    for (const day of plan.days) {
      for (const loc of day.locations) {
        try {
          const nearbyRes = await axios.get(`${import.meta.env.VITE_URL}/api/places/nearby`, {
            params: { lat: loc.lat, lng: loc.lng, type: 'cafe', radius: 1000 }
          });
          loc.nearbyPlaces = nearbyRes.data; // เพิ่ม field nearbyPlaces
        } catch (err) {
          console.error('Failed to fetch nearby for', loc.name, err);
          loc.nearbyPlaces = [];
        }
      }
    }
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

    const result = await tripModel.saveTripPlan(tripData, userId);


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


    const isOwner = await tripModel.checkTripOwner(tripId, userId);
    if (!isOwner) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'You are not the owner of this trip' });
    }

    const result = await tripModel.updateTripPlan(tripId, {
      ...tripData,
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
exports.saveOrUpdateTrip = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const tripData = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let result;
    if (!tripData.tripId) {
      // INSERT: ใช้ model saveTripPlan
      result = await tripModel.saveTripPlan(tripData, userId);
    } else {
      // UPDATE: ใช้ model updateTripPlan
      result = await tripModel.updateTripPlan(tripData.tripId, tripData, userId);
    }

    // 👉 ดึงข้อมูล trip กลับมาพร้อม role
    const tripWithRole = await tripModel.getTripById(result.tripId, userId);

    return res.json(tripWithRole);
  } catch (error) {
    console.error("SaveOrUpdateTrip error:", error);
    return res.status(500).json({ message: "Error saving trip" });
  }
};


exports.joinTrip = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user?.user_id; // ต้อง login ก่อน
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // ตรวจสอบว่ามี trip นี้ไหม
    const trip = await tripModel.getTripById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // เพิ่มเป็น member ถ้ายังไม่ใช่
    const alreadyMember = await tripModel.checkIfMember(tripId, userId);
    if (!alreadyMember) {
      await tripModel.addMember(tripId, userId);
    }

    res.json({ message: "Joined trip successfully", tripId });
  } catch (err) {
    console.error("Join trip failed:", err);
    res.status(500).json({ error: "Failed to join trip" });
  }
};
exports.getTripDetail = async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const userId = req.user?.user_id;
    console.log("📌 tripId from request:", tripId);

    const trip = await tripModel.getTripById(tripId, userId);

    if (!trip) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Trip not found' });

    }
    console.log("📌 trip detail fetched:", JSON.stringify(trip, null, 2));
    return res.status(200).json(trip);
  } catch (err) {
    console.error('Error fetching trip detail:', err);

    return res.status(500).json({ code: 'FETCH_ERROR', message: 'Internal server error' });
  }
};
exports.getUserTrips = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not logged in' });
    }

    // ดึง tripId ของ user
    const userTrips = await tripModel.getTripsByUser(userId); // สมมติว่า function นี้ return array ของ tripId หรือ basic info

    // map แต่ละ tripId ไปเรียก getTripById เหมือน tripDetail
    const tripDetails = await Promise.all(
      userTrips.map(async (trip) => {
        const tripDetail = await tripModel.getTripById(trip.tripId, userId);
        return tripDetail;
      })
    );

    return res.status(200).json(tripDetails);
  } catch (err) {
    console.error('Get user trips error:', err);
    return res.status(500).json({ code: 'FETCH_ERROR', message: 'Failed to fetch user trips' });
  }
};
