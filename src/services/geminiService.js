const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateTripPrompt = (data) => {
  return `
Plan a travel itinerary from ${data.from} to ${data.to}  
Travel dates: from ${data.startDate} to ${data.endDate}  
Total budget: ${data.budget} ${data.currency || 'USD'}  
Preferred mode of travel: ${data.travelType}  
Traveler's interests: ${data.preferences.join(', ') || 'None'}
Trip name: ${data.tripName}

Please follow these guidelines:

1. Provide a travel summary object named "transport_info" that estimates distance and travel time from "${data.from}" to "${data.to}" using each transportation method: "car", "bus", "train", "flight".
   - If a method is unavailable, use null.
   - Format:
     "transport_info": {
       "car": { "distance": "xxx km", "duration": "x hr" } or null,
       "bus": { "distance": "xxx km", "duration": "x hr" } or null,
       "train": { "distance": "xxx km", "duration": "x hr" } or null,
       "flight": { "distance": "xxx km", "duration": "x hr" } or null
     }

2. Divide the trip into daily plans (Day 1, Day 2, etc.)
  ⚠️ Return the daily plan array under the property name **"days"** instead of "trip_plan".
  
3. For each day, include:
   - Date in YYYY-MM-DD format
   - A short title (title) describing the theme of the day
   - A brief narrative description (1-2 sentences) to set the mood of the day

4. For each day, provide the list of locations under the key "locations". DO NOT use any other key name.
   - name: Name of the place
   - time: Estimated time spent (e.g., "09:00-10:30")
   - transport: Use only generic transportation terms such as "walk", "motorcycle taxi", "local taxi", "public van", etc.
    ⚠️ DO NOT mention any brand names, company names, or specific service names like "Grab", "MRT", "BTS", or any similar.
   - estimated_cost: Approximate cost to visit (entrance fee, transportation)
   - currency: Use the specified currency
   - category: Type of place (e.g., temple, cafe, nature, shopping)
   - google_maps_url: Link to Google Maps
   - lat and lng: Coordinates (if available)

5. Include a list of 1-3 useful daily travel tips (e.g., what to bring, when to avoid traffic)
6. Calculate and include:
   - total_day_cost: Daily total cost
   - total_trip_cost: Total for the whole trip

7. Include a trip name under the key "tripName" that briefly summarizes the theme of the trip.

Escape all double quotes in strings correctly.

IMPORTANT:

You MUST return ONLY a valid JSON object or array as the entire response. 
- DO NOT include any explanation, greeting, apology, or additional text outside of the JSON.
- DO NOT include markdown or code blocks.
- The response MUST start with "{" and end with "}" or start with "[" and end with "]".
- If you cannot produce a valid JSON for any reason, reply with an empty JSON object "{}" and nothing else.
`;
};


const callGeminiAPI = async (tripData) => {
  const prompt = generateTripPrompt(tripData);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text); // Debug

  // ✅ ล้าง markdown ถ้ามี
  const cleanText = text
   .replace(/```json|```/g, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/(\w):(\s*")/g, '"$1":$2') // Fix missing quotes around keys
      .trim();

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Invalid JSON from Gemini:", err);
    return null;
  }
}

module.exports = {
  generateTripPrompt,
  callGeminiAPI,
};
