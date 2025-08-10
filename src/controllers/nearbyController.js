// controller
const { getNearbyPlaces } = require('../services/mapsService');

exports.getNearbySuggestions = async (req, res) => {
  try {
    const { lat, lng, keyword = 'cafe' } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and Longitude are required' });
    }

    const places = await getNearbyPlaces(lat, lng, keyword);
    console.log('📍 Nearby places:', places);
    res.json({ places });
  } catch (err) {
    console.error('Nearby places error:', err);
    res.status(500).json({ message: 'Failed to fetch nearby places' });
  }
};
