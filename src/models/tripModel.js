const db = require('../utils/db');

// ⚠️ ป้องกันการส่ง function แทนค่า (อันตรายจาก input เช่น console.log)
const safeParam = (value, defaultValue = null) => {
  if (typeof value === 'function') return defaultValue;
  return value !== undefined && value !== null ? value : defaultValue;
};

const parseDistance = (distance) => {
  if (!distance) return 0;
  if (typeof distance === 'number') return distance;
  const num = parseFloat(distance.replace(/[^\d\.]/g, ''));
  return isNaN(num) ? 0 : num;
};

// 💾 Save a full trip plan to DB
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
        safeParam(tripData.trip_type, 'solo'),   // จะเป็น 'solo' หรือ 'group' ตามที่ user เลือก
        safeParam(tripData.group_size, null)     // ถ้า solo = null, ถ้า group = จำนวนคน
      ]
    );

    const tripId = tripResult.insertId;

    // ตรวจสอบว่า user เป็นเจ้าของ trip หรือไม่
    exports.checkTripOwner = async (tripId, userId) => {
      const [rows] = await db.execute(
        `SELECT user_id FROM trips WHERE id = ?`,
        [tripId]
      );
      return rows.length > 0 && rows[0].user_id === userId;
    };

    // อัปเดต trip ที่มีอยู่
    exports.updateTripPlan = async (tripId, tripData, userId) => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // อัปเดตข้อมูลหลักของ trip
        await conn.execute(
          `UPDATE trips 
   SET trip_name = ?, currency = ?, total_trip_cost = ?, trip_type = ?, group_size = ?, updated_at = NOW()
   WHERE id = ?`,
          [
            safeParam(tripData.tripName, 'My Trip'),
            safeParam(tripData.currency, 'THB'),
            safeParam(tripData.total_trip_cost, 0),
            safeParam(tripData.trip_type, 'solo'),
            safeParam(tripData.group_size, null),
            tripId
          ]
        );

        // ลบข้อมูล transport เดิม
        await conn.execute(
          `DELETE FROM transport_info WHERE trip_id = ?`,
          [tripId]
        );

        // บันทึก transport ใหม่
        const transport = tripData.transport_info || {};
        for (const mode of ['car', 'bus', 'train', 'flight']) {
          if (transport[mode]) {
            const dist = parseDistance(transport[mode].distance);
            await conn.execute(
              `INSERT INTO transport_info (trip_id, mode, distance, duration, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
              [
                tripId,
                mode,
                dist,
                safeParam(transport[mode].duration, '')
              ]
            );
          }
        }

        // ลบ days และ locations เดิม
        const [days] = await conn.execute(
          `SELECT id FROM trip_days WHERE trip_id = ?`,
          [tripId]
        );

        for (const day of days) {
          await conn.execute(
            `DELETE FROM trip_locations WHERE day_id = ?`,
            [day.id]
          );
        }

        await conn.execute(
          `DELETE FROM trip_days WHERE trip_id = ?`,
          [tripId]
        );

        // บันทึก days และ locations ใหม่
        for (const [i, day] of (tripData.days || []).entries()) {
          const [dayResult] = await conn.execute(
            `INSERT INTO trip_days (trip_id, day_number, title, date, description, total_day_cost, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              tripId,
              i + 1,
              safeParam(day.title, `Day ${i + 1}`),
              safeParam(day.date),
              safeParam(day.description || day.narrative, ''),
              safeParam(day.total_day_cost, 0)
            ]
          );
          const dayId = dayResult.insertId;

          for (const loc of day.locations || []) {
            await conn.execute(
              `INSERT INTO trip_locations (day_id, name, category, transport, estimated_cost, currency,google_maps_url,lat,lng, distance_to_next, created_at)
 VALUES (?, ?, ?, ?, ?, ?, ? ,?,?, ?, NOW())`,
              [
                dayId,
                safeParam(loc.name),
                safeParam(loc.category),
                safeParam(loc.transport),
                safeParam(loc.estimated_cost, 0),
                safeParam(loc.currency, tripData.currency || 'THB'),
                safeParam(loc.google_maps_url),
                parseFloat(safeParam(loc.lat)),
                parseFloat(safeParam(loc.lng)),
                parseDistance(loc.distance_to_next)
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
    // 🚍 Save transport summary
    const transport = tripData.transport_info || {};
    for (const mode of ['car', 'bus', 'train', 'flight']) {
      if (transport[mode]) {
        const dist = parseDistance(transport[mode].distance);
        await conn.execute(
          `INSERT INTO transport_info (trip_id, mode, distance, duration, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [
            tripId,
            mode,
            dist,
            safeParam(transport[mode].duration, '')
          ]
        );
      }
    }

    // 📅 Save trip days & locations
    for (const [i, day] of (tripData.days || []).entries()) {
      const [dayResult] = await conn.execute(
        `INSERT INTO trip_days (trip_id, day_number, title, date, description, total_day_cost, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          tripId,
          i + 1,
          safeParam(day.title, `Day ${i + 1}`),
          safeParam(day.date),
          safeParam(day.description || day.narrative, ''),
          safeParam(day.total_day_cost, 0)
        ]
      );
      const dayId = dayResult.insertId;

      for (const loc of day.locations || []) {
        await conn.execute(
          `INSERT INTO trip_locations (day_id, name, category, transport, estimated_cost, currency,google_maps_url,lat,lng, distance_to_next, created_at)
 VALUES (?, ?, ?, ?, ?, ?, ?,?, ?, ?, NOW())`,

          [
            dayId,
            safeParam(loc.name),
            safeParam(loc.category),
            safeParam(loc.transport),
            safeParam(loc.estimated_cost, 0),
            safeParam(loc.currency, tripData.currency || 'THB'),
            safeParam(loc.google_maps_url),
            parseFloat(safeParam(loc.lat)),
            parseFloat(safeParam(loc.lng)),

            parseDistance(loc.distance_to_next)
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

// ✅ เช็คว่า user เป็นสมาชิก trip นี้อยู่ไหม
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

// 📦 ดึงข้อมูล trip พร้อมวันและ location
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
    trip.trip_type = tripRows[0].trip_type;

    const [dayRows] = await conn.execute(
      `SELECT id, day_number, title, date, description, total_day_cost
       FROM trip_days WHERE trip_id = ? ORDER BY day_number`,
      [tripId]
    );

    for (const day of dayRows) {
      const [locRows] = await conn.execute(
        `SELECT id, name, category, transport, estimated_cost, currency, distance_to_next
         FROM trip_locations WHERE day_id = ?`,
        [day.id]
      );
      day.locations = locRows;
    }

    trip.days = dayRows;

    // รวม transport info ด้วย
    const [transportRows] = await conn.execute(
      `SELECT mode, distance, duration FROM transport_info WHERE trip_id = ?`,
      [tripId]
    );
    const transport_info = {};
    for (const t of transportRows) {
      transport_info[t.mode] = {
        distance: t.distance,
        duration: t.duration
      };
    }
    trip.transport_info = transport_info;

    return trip;
  } finally {
    conn.release();
  }
};

exports.getTripsByUser = async (userId) => {
  const [rows] = await db.execute(
    `SELECT id, trip_name, currency, total_trip_cost, created_at, trip_type
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

