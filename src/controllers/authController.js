const userService = require('../services/userService');

exports.getUser = (req, res) => {
  if (req.user) res.json(req.user);
  else res.status(401).json({ message: 'Not Authenticated' });
};

exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out' });
    });
  });
};
exports.googleCallback = async (req, res) => {
  try {
    const userData = req.user;
    console.log('✅ Google User:', userData); // ⬅️ ตรวจค่าที่ได้
    res.redirect(process.env.CLIENT_URL);
  } catch (err) {
    console.error('🔥 Error during user save:', err); // ⬅️ ดู log error
    res.redirect('/auth/failure');
  }
};


