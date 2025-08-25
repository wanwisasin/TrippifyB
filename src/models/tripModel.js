const db = require('../utils/db');

// ⚠️ ป้องกันการส่ง function แทนค่า (อันตรายจาก input เช่น console.log)
const safeParam = (value, defaultValue = null) => {
  if (typeof value === 'function') return defaultValue;
  return value !== undefined && value !== null ? value : defaultValue;
};
const safeFloat = (value, defaultValue = null) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const parseDistance = (distance) => {
  if (!distance) return 0;
  if (typeof distance === 'number') return distance;
  const num = parseFloat(distance.replace(/[^\d\.]/g, ''));
  return isNaN(num) ? 0 : num;
};
const formatDate = (isoString) => {
  if (!isoString) return null;
  return isoString.split("T")[0];
};
// helper: save transport
const saveTransport = async (conn, tripId, transportInfo = {}, currency = 'THB') => {
  const realTripId = safeParam(tripId);
  for (const mode of ['car', 'bus', 'train', 'flight']) {
    if (transportInfo[mode]) {
      const dist = parseDistance(transportInfo[mode].distance);
      await conn.execute(
        `INSERT INTO transport_info (trip_id, mode, distance, duration, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          realTripId,
          mode,
          dist,
          safeParam(transportInfo[mode].duration, '')
        ]
      );
    }
  }
};

// helper: save days & locations
const saveDaysAndLocations = async (conn, tripId, tripData) => {
  const realTripId = safeParam(tripId || tripData?.id);
  const days = tripData.days || [];

  // ดึง days เดิม
  const [existingDays] = await conn.execute(
    `SELECT id FROM trip_days WHERE trip_id = ?`,
    [realTripId]
  );
  const existingDayIds = existingDays.map(d => d.id);
  const newDayIds = days.map(d => d.id).filter(Boolean);

  // loop days ใหม่
  for (const [index, day] of days.entries()) {
    let dayId = day.id;

    if (dayId) {
      // UPDATE day
      await conn.execute(
        `UPDATE trip_days 
         SET day_number=?, title=?, date=?, description=?, total_day_cost=?, daily_tips=?
         WHERE id=? AND trip_id=?`,
        [
          index + 1,
          safeParam(day.title, ''),
          formatDate(day.date),
          safeParam(day.description, ''),
          safeParam(day.total_day_cost, 0),
          JSON.stringify(Array.isArray(day.daily_tips) ? day.daily_tips : []),
          dayId,
          realTripId
        ]
      );
    } else {
      // INSERT day
      const [res] = await conn.execute(
        `INSERT INTO trip_days 
         (trip_id, day_number, title, date, description, total_day_cost, daily_tips, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          realTripId,
          index + 1,
          safeParam(day.title, ''),
          formatDate(day.date),
          safeParam(day.description, ''),
          safeParam(day.total_day_cost, 0),
          JSON.stringify(Array.isArray(day.daily_tips) ? day.daily_tips : [])
        ]
      );
      dayId = res.insertId;
    }

    // locations
    const [existingLocs] = await conn.execute(
      `SELECT id FROM trip_locations WHERE day_id = ?`,
      [dayId]
    );
    const existingLocIds = existingLocs.map(l => l.id);
    const newLocIds = (day.locations || []).map(l => l.id).filter(Boolean);

    for (const loc of (day.locations || [])) {
      if (loc.id) {
        // UPDATE location
        await conn.execute(
          `UPDATE trip_locations
           SET name=?, category=?, transport=?, estimated_cost=?, currency=?, google_maps_url=?, lat=?, lng=?, distance_to_next=?
           WHERE id=? AND day_id=?`,
          [
            safeParam(loc.name, null),
            safeParam(loc.category, null),
            safeParam(loc.transport, null),
            safeParam(loc.estimated_cost, 0),
            safeParam(loc.currency, tripData.currency || 'THB'),
            safeParam(loc.google_maps_url, null),
            safeFloat(loc.lat, null),
            safeFloat(loc.lng, null),
            safeFloat(loc.distance_to_next, null),
            loc.id,
            dayId
          ]
        );
      } else {
        // INSERT location
        await conn.execute(
          `INSERT INTO trip_locations
           (day_id, name, category, transport, estimated_cost, currency, google_maps_url, lat, lng, distance_to_next, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            dayId,
            safeParam(loc.name, null),
            safeParam(loc.category, null),
            safeParam(loc.transport, null),
            safeParam(loc.estimated_cost, 0),
            safeParam(loc.currency, tripData.currency || 'THB'),
            safeParam(loc.google_maps_url, null),
            safeFloat(loc.lat, null),
            safeFloat(loc.lng, null),
            safeFloat(loc.distance_to_next, null)
          ]
        );
      }
    }

    // DELETE locations ที่ไม่มี
    const locsToDelete = existingLocIds.filter(id => !newLocIds.includes(id));
    if (locsToDelete.length > 0) {
      await conn.execute(
        `DELETE FROM trip_locations WHERE id IN (${locsToDelete.map(() => '?').join(',')})`,
        locsToDelete
      );
    }
  }

  // DELETE days ที่ไม่มี
  const daysToDelete = existingDayIds.filter(id => !newDayIds.includes(id));
  if (daysToDelete.length > 0) {
    await conn.execute(
      `DELETE FROM trip_days WHERE id IN (${daysToDelete.map(() => '?').join(',')})`,
      daysToDelete
    );
  }
};

// 💾 Save a full trip plan
exports.saveTripPlan = async (tripData, userId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [tripResult] = await conn.execute(
      `INSERT INTO trips (user_id, trip_name, currency, total_trip_cost, trip_type, group_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        safeParam(userId),
        safeParam(tripData.tripName, 'My Trip'),
        safeParam(tripData.currency, 'THB'),
        safeParam(tripData.total_trip_cost, 0),
        safeParam(tripData.trip_type, 'solo'),
        safeParam(tripData.group_size, null)
      ]
    );

    const tripId = tripResult.insertId;

    await saveTransport(conn, tripId, tripData.transport_info, tripData.currency);
    await saveDaysAndLocations(conn, tripId, tripData);

    await conn.commit();
    return { tripId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.updateTripPlan = async (tripId, tripData, userId) => {
  const conn = await db.getConnection();
  const realTripId = safeParam(tripId || tripData?.id);
  try {
    await conn.beginTransaction();

await conn.execute(
  `UPDATE trips 
   SET 
     trip_name = COALESCE(?, trip_name),
     currency = COALESCE(?, currency),
     total_trip_cost = COALESCE(?, total_trip_cost),
     trip_type = COALESCE(?, trip_type),
     group_size = COALESCE(?, group_size),
     updated_at = NOW()
   WHERE id=? AND user_id=?`,
  [
    tripData.tripName ?? null,
    tripData.currency ?? null,
    tripData.total_trip_cost ?? null,
    tripData.trip_type ?? null,
    tripData.group_size ?? null,
    realTripId,
    userId
  ]
);


    // delete old transport & save new
    await conn.execute(`DELETE FROM transport_info WHERE trip_id = ?`, [realTripId]);
    await saveTransport(conn, realTripId, tripData.transport_info, tripData.currency);

    // save days & locations
    await saveDaysAndLocations(conn, realTripId, tripData);

    await conn.commit();
    return { tripId: realTripId };
  } catch (err) {
    await conn.rollback();
    console.error("❌ updateTripPlan error:", err);
    throw err;
  } finally {
    conn.release();
  }
};


exports.getTripById = async (tripId) => {
  const conn = await db.getConnection();
  try {
    const [tripRows] = await conn.execute(
      `SELECT id, trip_name, currency, total_trip_cost, trip_type, group_size, created_at, updated_at
       FROM trips WHERE id = ?`,
      [tripId]
    );

    if (tripRows.length === 0) return null;
    const trip = tripRows[0];

    // 📅 ดึง days
    const [dayRows] = await conn.execute(
      `SELECT id, day_number, title, date, description, total_day_cost, daily_tips
       FROM trip_days WHERE trip_id = ? ORDER BY day_number`,
      [tripId]
    );

    // 🏞️ ดึง locations ของแต่ละ day
    for (const day of dayRows) {
      const [locRows] = await conn.execute(
        `SELECT id, name, category, transport, estimated_cost, currency, google_maps_url, lat, lng, distance_to_next
         FROM trip_locations WHERE day_id = ?`,
        [day.id]
      );
      day.locations = locRows;

      // parse daily_tips
      if (day.daily_tips) {
        try {
          day.daily_tips = JSON.parse(day.daily_tips);
        } catch {
          day.daily_tips = [];
        }
      } else {
        day.daily_tips = [];
      }
    }

    // 🚍 ดึง transport
    const [transportRows] = await conn.execute(
      `SELECT mode, distance, duration FROM transport_info WHERE trip_id = ?`,
      [tripId]
    );
    const transport_info = {};
    for (const t of transportRows) {
      transport_info[t.mode] = {
        distance: t.distance,
        duration: t.duration,
      };
    }

    // ✅ ประกอบทั้งหมดเข้าด้วยกัน
    trip.days = dayRows;
    trip.transport_info = transport_info;

    return trip;
  } finally {
    conn.release();
  }
};

exports.getTripsByUser = async (userId) => {
  const [rows] = await db.execute(
    `SELECT id, trip_name, currency, total_trip_cost, created_at, trip_type, group_size
     FROM trips WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    _id: row.id,
    tripName: row.trip_name,
    currency: row.currency,
    total_trip_cost: row.total_trip_cost,
    createdAt: row.created_at,
    trip_type: row.trip_type,
    group_size: row.group_size
  }));
};
exports.checkTripOwner = async (tripId, userId) => {
  const [rows] = await db.execute(
    `SELECT user_id FROM trips WHERE id = ?`,
    [tripId]
  );
  return rows.length > 0 && rows[0].user_id === userId;
};
exports.checkIfMember = async (tripId, userId) => {
  const [rows] = await db.execute(
    `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?`,
    [tripId, userId]
  );
  return rows.length > 0;
};

// 👥 เพิ่มสมาชิกเข้า trip
exports.addMember = async (tripId, userId, role = 'member') => {
  await db.execute(
    `INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)`,
    [tripId, userId, role]
  );
};

