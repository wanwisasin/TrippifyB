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
const saveTransport = async (conn, tripId, transportInfo = {}, currency = 'THB', howToGetThere = null) => {
  const realTripId = safeParam(tripId);
  for (const mode of ['car', 'bus', 'train', 'flight']) {
    if (transportInfo[mode]) {
      const dist = parseDistance(transportInfo[mode].distance);
      await conn.execute(
        `INSERT INTO transport_info (trip_id, mode, distance, duration , how_to_get_there, created_at)
         VALUES (?, ?, ?,?, ?, NOW())`,
        [
          realTripId,
          mode,
          dist,
          safeParam(transportInfo[mode].duration, ''),
          safeParam(howToGetThere, '')
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

exports.saveTripPlan = async (tripData, userId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO trips (user_id, trip_name, currency, total_trip_cost, trip_type,from_location,to_location, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?,?,?, NOW(), NOW())`,
      [
        safeParam(userId),
        safeParam(tripData.tripName, 'My Trip'),
        safeParam(tripData.currency, 'THB'),
        safeParam(tripData.total_trip_cost, 0),
        safeParam(tripData.trip_type),
        safeParam(tripData.from_location),
        safeParam(tripData.to_location)
      ]
    );

    const tripId = result.insertId;

    // ✅ ใช้ conn.execute ไม่ใช่ db.query
    await conn.execute(
      `INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)`,
      [tripId, userId, "leader"]
    );

    await saveTransport(conn, tripId, tripData.transport_info, tripData.currency, tripData.how_to_get_there);
    await saveDaysAndLocations(conn, tripId, tripData);

    await conn.commit();

    // ดึง trip ใหม่แล้ว map field ให้ตรง frontend
    const fullTrip = await exports.getTripById(tripId);
    return { ...fullTrip, tripId };  // ✅ เผื่อ frontend ต้องใช้ tripId
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
         from_location = COALESCE(?, from_location),
         to_location = COALESCE(?, to_location),
         updated_at = NOW()
       WHERE id=? AND user_id=?`,
      [
        tripData.tripName ?? null,
        tripData.currency ?? null,
        tripData.total_trip_cost ?? null,
        tripData.trip_type ?? null,
        tripData.from_location ?? null,
        tripData.to_location ?? null,
        realTripId,
        userId
      ]
    );

    await conn.execute(`DELETE FROM transport_info WHERE trip_id = ?`, [realTripId]);
    await saveTransport(conn, realTripId, tripData.transport_info, tripData.currency, tripData.how_to_get_there);

    await saveDaysAndLocations(conn, realTripId, tripData);

    await conn.commit();

    const fullTrip = await exports.getTripById(realTripId);
    return fullTrip;

  } catch (err) {
    await conn.rollback();
    console.error("❌ updateTripPlan error:", err);
    throw err;
  } finally {
    conn.release();
  }
};

exports.getTripById = async (tripId, userId) => {
  const conn = await db.getConnection();
  try {
    const [tripRows] = await conn.execute(
      `SELECT 
          t.id AS tripId, 
          t.trip_name, 
          t.currency, 
          t.total_trip_cost, 
          t.trip_type, 
          t.from_location,
          t.to_location,
          t.created_at, 
          t.updated_at, 
          tm.role
       FROM trips t
       LEFT JOIN trip_members tm 
         ON t.id = tm.trip_id 
        AND tm.user_id = ? 
       WHERE t.id = ?`,
      [userId ?? null, tripId ?? null]
    );

    if (tripRows.length === 0) return null;
    const trip = tripRows[0];

    // 📅 ดึง days
    const [dayRows] = await conn.execute(
      `SELECT id, day_number, title, date, description, total_day_cost, daily_tips
       FROM trip_days WHERE trip_id = ? ORDER BY day_number`,
      [tripId]
    );

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
    const [transportRows] = await conn.execute(
      `SELECT mode, distance, duration, how_to_get_there 
   FROM transport_info WHERE trip_id = ?`,
      [tripId]
    );

    const transport_info = {};
    let howToGetThere = null;

    for (const t of transportRows) {
      transport_info[t.mode] = {
        distance: t.distance,
        duration: t.duration,
      };
      if (t.how_to_get_there && !howToGetThere) {
        howToGetThere = t.how_to_get_there;
      }
    }

    trip.transport_info = transport_info;
    trip.how_to_get_there = howToGetThere; // ✅ assign ให้ frontend ใช้



    // 👥 ดึงสมาชิกทั้งหมด
    const [memberRows] = await conn.execute(
      `SELECT u.user_id, u.username,u.gmail, u.photo, tm.role 
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.trip_id = ?`,
      [tripId]
    );

    // ✅ ประกอบข้อมูลทั้งหมด
    trip.days = dayRows;
    trip.transport_info = transport_info;
    trip.how_to_get_there = howToGetThere;
    trip.members = memberRows;  // [{user_id, username, role}, ...]

    return trip;
  } finally {
    conn.release();
  }
};

exports.getTripsByUser = async (userId) => {
  const [rows] = await db.execute(
    `SELECT 
        t.id AS tripId,
        t.trip_name,
        t.currency,
        t.total_trip_cost,
        t.trip_type,
        t.from_location,
        t.to_location,
        t.created_at,
        (SELECT tm.role 
           FROM trip_members tm 
          WHERE tm.trip_id = t.id AND tm.user_id = ?) AS role,
        GROUP_CONCAT(u.username) AS members
     FROM trips t
     JOIN trip_members tm2 ON t.id = tm2.trip_id
     JOIN users u ON tm2.user_id = u.user_id
     WHERE t.id IN (
         SELECT trip_id FROM trip_members WHERE user_id = ?
     )
     GROUP BY t.id
     ORDER BY t.created_at DESC;`,
    [userId, userId]
  );

  return rows.map((row) => ({
    tripId: row.tripId,
    tripName: row.trip_name,
    currency: row.currency,
    total_trip_cost: row.total_trip_cost,
    trip_type: row.trip_type,
    from_location: row.from_location,
    to_location: row.to_location,
    createdAt: row.created_at,
    role: row.role,
    members: row.members ? row.members.split(",") : []
  }));
};

exports.checkTripOwner = async (tripId, userId) => {
  const [rows] = await db.query(
    `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ? AND role = 'leader'`,
    [tripId, userId]
  );
  return rows.length > 0;
};

exports.checkIfMember = async (tripId, userId) => {
  const [rows] = await db.query(
    `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?`,
    [tripId, userId]
  );
  return rows.length > 0;
};


exports.addMember = async (tripId, userId, role = 'member') => {
  const [rows] = await db.query(
    `SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?`,
    [tripId, userId]
  );
  if (rows.length === 0) {
    await db.execute(
      `INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)`,
      [tripId, userId, role]
    );
  }
};
exports.checkUserRole = async (tripId, userId) => {
  const isOwner = await this.checkTripOwner(tripId, userId);
  if (isOwner) return 'leader';

  const isMember = await this.checkIfMember(tripId, userId);
  if (isMember) return 'member';

  return null; // ยังไม่เข้าร่วม
};
