const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const tripRoutes = require('./routes/tripRoutes')
const placesRoutes = require('./routes/places');

require('dotenv').config();
require('./config/passport');

const app = express();

app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // แก้ไขให้ใช้ default fallback
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', require('./routes/authRoutes'));
app.use('/api/trip', require('./routes/tripRoutes'));
app.use('/api/places', require('./routes/places'));
app.use('/api/expense',require('./routes/expenseRoutes'));
app.use('/api/reviews',require('./routes/reviewRoutes'))
module.exports = app;
