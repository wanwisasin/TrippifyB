const axios = require('axios');

// service
exports.getNearbyPlaces = async (lat, lng, keyword = 'cafe') => {
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
    params: {
      location: `${lat},${lng}`,
      radius: 5000,
      keyword,
      key: process.env.GOOGLE_PLACES_API_KEY,
    },
  });

  return response.data.results.map((p) => ({
    name: p.name,
    address: p.vicinity,
    rating: p.rating,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
  }));
};
