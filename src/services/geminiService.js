const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateTripPrompt = (data) => {
  return `
Plan a travel itinerary from ${data.from} to ${data.to}  
Travel dates: from ${data.startDate} to ${data.endDate}  
Total budget: ${data.budget} ${data.currency || 'USD'}  
Preferred mode of travel: ${data.travelType}  
Traveler's interests: ${data.preferences.join(', ') || 'general'}
Trip name: ${data.tripName}

⚠️ Include the type of trip in the returned JSON:
"trip_type": "${data.trip_type}",


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
   ⚠️ Return the daily plan array under the property name "days".

3. For each day, include:
   - date in YYYY-MM-DD format
   - title describing the theme of the day
   - description (1-2 sentences) 
   and Explain why it is appropriate for the type of trip or number of travelers. Include it in the description. (short sentences)
   - locations (name, time, transport, estimated_cost, currency, category, google_maps_url, lat, lng)
   - daily_tips (1-3 items)
   - total_day_cost

4. Include total_trip_cost for the entire trip
5. Include tripName

Escape all double quotes correctly.
Return ONLY a valid JSON object starting with "{" and ending with "}", nothing else.
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
