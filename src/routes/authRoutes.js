const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// Login start
router.get('/google', (req, res, next) => {
  const redirectUrl = req.query.redirect || process.env.CLIENT_URL;
  req.session.redirectTo = redirectUrl; // เก็บ redirect ที่มาจาก frontend
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/auth/failure', // ถ้าล็อกอินไม่สำเร็จ ให้ redirect ไปที่ failure route
  }),
  (req, res) => {
    // โค้ดส่วนนี้จะทำงาน **เฉพาะเมื่อล็อกอินสำเร็จเท่านั้น**
    // ในจุดนี้ req.user จะมีข้อมูลผู้ใช้และ Session ก็พร้อมใช้งานแล้ว
    const finalRedirect = req.session.redirectTo || process.env.CLIENT_URL;
    delete req.session.redirectTo; // ลบค่า redirect ออกจาก session
    res.redirect(finalRedirect);
  }
);



router.get('/logout', authController.logout);
router.get('/user', authController.getUser);
router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Authentication failed' });
});
module.exports = router;
