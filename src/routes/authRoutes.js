const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/authController');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      if (err) {
        console.error("OAuth Error:", err);
        return res.status(500).json({ error: err.message || err });
      }
      if (!user) {
        console.error("OAuth Failure Info:", info);
        return res.status(401).json({ message: 'Authentication failed', info });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ error: err.message || err });
        }
        // Auth success
        return authController.googleCallback(req, res);
      });
    })(req, res, next);
  }
);


router.get('/logout', authController.logout);
router.get('/user', authController.getUser);
router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Authentication failed' });
});
module.exports = router;
