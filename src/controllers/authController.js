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


