const axios = require("axios");

const cache = new Map();
const TTL = 1000 * 60 * 2; // 2 นาที

exports.getNearbyPlaces = async (req, res) => {
  const { lat, lng, radius = 1000, type = "cafe" } = req.query;
  console.log("Nearby API called with:", { lat, lng, radius, type });

  if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

  const cacheKey = `${lat},${lng},${radius},${type}`;
  if (cache.has(cacheKey) && cache.get(cacheKey).expires > Date.now()) {
    return res.json(cache.get(cacheKey).data);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;
    const response = await axios.get(url);

    const places = response.data.results.map((place) => ({
      name: place.name,
      address: place.vicinity,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      place_id: place.place_id,
    }));

    cache.set(cacheKey, { expires: Date.now() + TTL, data: places });
    console.log("Nearby data returned:", places.length);
    res.json(places);
  } catch (err) {
    console.error("Nearby API error:", err.message);
    res.status(500).json({ error: "Failed to fetch nearby places" });
  }
};
