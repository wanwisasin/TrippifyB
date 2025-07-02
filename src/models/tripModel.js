const db = require('../utils/db');

const safeParam = (value, defaultValue = null) => {
  if (typeof value === 'function') {
    return defaultValue;
  }
  return value !== undefined ? value : defaultValue;
};

const parseDistance = (distance) => {
  if (!distance) return 0;
  if (typeof distance === 'number') return distance;

  // เอาเฉพาะตัวเลขกับจุดทศนิยมออกมา เช่น '700 km' → 700
  const num = parseFloat(distance.replace(/[^\d\.]/g, ''));
  return isNaN(num) ? 0 : num;
};

exports.saveTripPlan = async (tripData, userId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [tripResult] = await conn.execute(
      `INSERT INTO trips (user_id, trip_name, currency, total_trip_cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        safeParam(userId),
        safeParam(tripData.tripName),
        safeParam(tripData.currency, 'THB'),
        safeParam(tripData.total_trip_cost, 0)
      ]
    );
    const tripId = tripResult.insertId;

    const transport = tripData.transport_info || {};
    for (const mode of ['car', 'bus', 'train', 'flight']) {
      if (transport[mode]) {
            const dist = parseDistance(transport[mode].distance);

        await conn.execute(
          `INSERT INTO transport_info (trip_id, mode, distance, duration, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [
            safeParam(tripId),
            safeParam(mode),
            safeParam(dist),
            safeParam(transport[mode].duration)
          ]
        );
      }
    }

    for (const [i, day] of (tripData.days || []).entries()) {
      const [dayResult] = await conn.execute(
        `INSERT INTO trip_days (trip_id, day_number, title, date, description, total_day_cost, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          safeParam(tripId),
          safeParam(i + 1),
          safeParam(day.title, `Day ${i + 1}`),
          safeParam(day.date),
          safeParam(day.description || day.narrative, ''),
          safeParam(day.total_day_cost, 0)
        ]
      );
      const dayId = dayResult.insertId;

      for (const loc of day.locations || []) {
          const distanceToNext = parseDistance(loc.distance_to_next); // ✅ assign ค่า

        await conn.execute(
          `INSERT INTO trip_locations (day_id, name, category, transport, estimated_cost, currency, distance_to_next, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            safeParam(dayId),
            safeParam(loc.name),
            safeParam(loc.category),
            safeParam(loc.transport),
            safeParam(loc.estimated_cost, 0),
            safeParam(loc.currency, tripData.currency || 'THB'),
            safeParam(distanceToNext)
          ]
        );
      }
    }

    await conn.commit();
    return { tripId };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
