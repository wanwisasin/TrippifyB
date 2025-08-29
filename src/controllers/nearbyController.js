const axios = require("axios");

exports.getNearbySuggestions = async (req, res) => {
    try {
        const { lat, lng, keyword = "cafe" } = req.query;

        if (!lat || !lng) {
            return res
                .status(400)
                .json({ message: "Latitude and Longitude are required" });
        }

        // URL สำหรับ Places API (New) - searchNearby
        const newApiEndpoint = "https://places.googleapis.com/v1/places:searchNearby";

        const radius = 2000; // 2km

        const requestBody = {
            includedTypes: [keyword], // ใช้ includedTypes แทน keyword
            maxResultCount: 20, // จำนวนผลลัพธ์สูงสุด (ไม่บังคับ)
            locationRestriction: {
                circle: {
                    center: {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng),
                    },
                    radius: radius,
                },
            },
        };

        const response = await axios.post(newApiEndpoint, requestBody, {
            headers: {
                "Content-Type": "application/json",
                // API Key ถูกส่งเป็น Header
                "X-Goog-Api-Key": process.env.Maps_API_KEY,
                // กำหนด Field ที่ต้องการใน response เพื่อลดขนาดข้อมูล
                "X-Goog-FieldMask": "places.displayName,places.id,places.location,places.rating,places.photos,places.formattedAddress",
            },
        });

        const nearbyPlaces = response.data.places.map((place) => ({
            name: place.displayName?.text,
            vicinity: place.formattedAddress,
            place_id: place.id,
            lat: place.location?.latitude,
            lng: place.location?.longitude,
            rating: place.rating,
            photos: place.photos ? place.photos.map((p) => p.name) : [],
        }));

        res.json(nearbyPlaces);
    } catch (error) {
        console.error(
            "Error fetching nearby places with new API:",
            error.response?.data || error.message
        );
        res.status(500).json({ message: "Failed to fetch nearby places" });
    }
};