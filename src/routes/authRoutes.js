const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/authController');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  authController.googleCallback
);

router.get('/logout', authController.logout);
router.get('/user', authController.getUser);
router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Authentication failed' });
});
module.exports = router;
