'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');

var router = express.Router();

var JWT_SECRET = process.env.JWT_SECRET || 'taskhub-secret-key';

// In-memory users store
var users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'alice', password: 'alice123', role: 'user' },
  { id: 3, username: 'bob',   password: 'bob123',   role: 'user' }
];

// POST /auth/login
router.post('/login', function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  if (!username || !password) {
    var err = new Error('username and password are required');
    err.status = 400;
    return next(err);
  }

  var user = users.filter(function (u) {
    return u.username === username && u.password === password;
  })[0];

  if (!user) {
    var authErr = new Error('Invalid credentials');
    authErr.status = 401;
    return next(authErr);
  }

  var token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token: token, user: { id: user.id, username: user.username, role: user.role } });
});

// GET /auth/me — return current user from token
router.get('/me', function (req, res, next) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.replace('Bearer ', '');

  if (!token) {
    var err = new Error('No token provided');
    err.status = 401;
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, function (err, decoded) {
    if (err) {
      var verifyErr = new Error('Invalid token');
      verifyErr.status = 401;
      return next(verifyErr);
    }
    res.json({ user: decoded });
  });
});

// POST /auth/logout — just a confirmation; client discards token
router.post('/logout', function (req, res) {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
