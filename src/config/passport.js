const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { createUserIfNotExists, getUserById } = require('../models/userModel');

// Setup Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // ตรวจสอบว่าผู้ใช้มีในระบบหรือยัง ไม่มีก็สร้าง
    const user = await createUserIfNotExists(profile);
    return done(null, user); // จะเก็บ user ใน session
  } catch (err) {
    return done(err, null);
  }
}));

// Serialize user_id ลง session
passport.serializeUser((user, done) => {
  done(null, user.user_id); // เก็บ user_id ไว้ใน session
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user id:", id);
    const user = await getUserById(id);
    if (!user) {
      console.log("User not found in DB for id:", id);
      return done(new Error("User not found"), null);
    }
    console.log("User deserialized:", user);
    done(null, user);
  } catch (err) {
    console.error("Error in deserializeUser:", err);
    done(err, null);
  }
});

