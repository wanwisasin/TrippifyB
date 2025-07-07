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

exports.joinTrip = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const tripId = req.params.tripId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const conn = await db.getConnection();

    // เช็คว่าผู้ใช้เป็นสมาชิกทริปนี้หรือยัง
    const [rows] = await conn.execute(
      `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?`,
      [tripId, userId]
    );

    if (rows.length === 0) {
      // ยังไม่เป็นสมาชิก ให้เพิ่ม role = 'member'
      await conn.execute(
        `INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'member')`,
        [tripId, userId]
      );
    }

    conn.release();

    res.json({ message: 'Joined the trip successfully' });
  } catch (err) {
    console.error('Join trip error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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
exports.checkIfMember = async (tripId, userId) => {
  const [rows] = await db.execute(
    'SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?',
    [tripId, userId]
  )
  return rows.length > 0
}

exports.addMember = async (tripId, userId, role) => {
  await db.execute(
    'INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)',
    [tripId, userId, role]
  )
}

exports.getTripById = async (tripId) => {
  const conn = await db.getConnection();
  try {
    const [tripRows] = await conn.execute(
      `SELECT id, trip_name, currency, total_trip_cost
       FROM trips WHERE id = ?`,
      [tripId]
    );
    if (tripRows.length === 0) return null;

    const trip = tripRows[0];

    // ดึงข้อมูลวันของทริป
    const [dayRows] = await conn.execute(
      `SELECT id, day_number, title, date, description, total_day_cost
       FROM trip_days WHERE trip_id = ? ORDER BY day_number`,
      [tripId]
    );

    // สำหรับแต่ละวัน ดึงสถานที่
    for (const day of dayRows) {
      const [locRows] = await conn.execute(
        `SELECT id, name, category, transport, estimated_cost, currency, distance_to_next
         FROM trip_locations WHERE day_id = ?`,
        [day.id]
      );
      day.locations = locRows;
    }

    trip.days = dayRows;
    return trip;
  } finally {
    conn.release();
  }
};
