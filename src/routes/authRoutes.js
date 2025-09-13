const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// Login start
router.get('/google', (req, res, next) => {
  const redirectUrl = req.query.redirect || process.env.CLIENT_URL;
  req.session.redirectTo = redirectUrl; // เก็บ redirect ที่มาจาก frontend
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ message: 'Authentication failed', info });

    // 👉 เก็บค่า redirectTo ไว้ก่อน เพราะเดี๋ยว logIn จะเขียน session ใหม่
    const redirectTo = req.session.redirectTo || process.env.CLIENT_URL;

    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      console.log("📌 Session after login:", req.session);

      // 👉 ใส่กลับเข้าไปใน session ใหม่
      req.session.redirectTo = redirectTo;

      const finalRedirect = req.session.redirectTo || process.env.CLIENT_URL;
      delete req.session.redirectTo;
      return res.redirect(finalRedirect);
    });
  })(req, res, next);
});



router.get('/logout', authController.logout);
router.get('/user', authController.getUser);
router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Authentication failed' });
});
module.exports = router;
