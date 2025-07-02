const db = require('../utils/db');
exports.getUserById = async (userId) => {
  const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
  return rows[0];
};

exports.getUserByGoogleId = async (googleId) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id_google = ?', [googleId]);
  return rows[0];
};

exports.createUserIfNotExists = async (profile) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id_google = ?', [profile.id]);
  if (rows.length === 0) {
    await db.query(
      'INSERT INTO users (id_google, username, gmail, photo, created_at) VALUES (?, ?, ?, ?, NOW())',
      [
        profile.id,
        profile.displayName,
        profile.emails[0].value,
        profile.photos[0].value
      ]
    );
  }

  // คืนค่า user ที่เพิ่งสร้างหรือมีอยู่แล้ว
  const [userRows] = await db.query('SELECT * FROM users WHERE id_google = ?', [profile.id]);
return { user_id: userRows[0].user_id, ...userRows[0] };
};
