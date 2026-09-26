'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');

var router = express.Router();

var JWT_SECRET = process.env.JWT_SECRET || 'taskhub-secret-key';

function requireAdmin(req, res, next) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.replace('Bearer ', '');

  if (!token) {
    var err = new Error('Authentication required');
    err.status = 401;
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, function (err, decoded) {
    if (err) {
      var verifyErr = new Error('Invalid token');
      verifyErr.status = 401;
      return next(verifyErr);
    }
    if (decoded.role !== 'admin') {
      var forbiddenErr = new Error('Admin access required');
      forbiddenErr.status = 403;
      return next(forbiddenErr);
    }
    req.user = decoded;
    next();
  });
}

// GET /admin/stats
router.get('/stats', requireAdmin, function (req, res) {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version
  });
});

// GET /admin/users — list all users
router.get('/users', requireAdmin, function (req, res) {
  res.json({
    users: [
      { id: 1, username: 'admin', role: 'admin' },
      { id: 2, username: 'alice', role: 'user' },
      { id: 3, username: 'bob',   role: 'user' }
    ]
  });
});

// DELETE /admin/users/:id — remove a user (admin only), uses app.del() style
router.del = router.delete;
router.del('/users/:id', requireAdmin, function (req, res, next) {
  var id = parseInt(req.param('id'), 10);
  if (isNaN(id) || id < 1) {
    var err = new Error('Invalid user id');
    err.status = 400;
    return next(err);
  }
  // 1 = root admin, cannot be deleted
  if (id === 1) {
    var protectedErr = new Error('Cannot delete root admin');
    protectedErr.status = 403;
    return next(protectedErr);
  }
  res.json({ deleted: id, message: 'User removed' });
});

// POST /admin/broadcast — send a message to all users
router.post('/broadcast', requireAdmin, function (req, res, next) {
  var message = req.body.message;
  if (!message) {
    var err = new Error('message is required');
    err.status = 400;
    return next(err);
  }
  res.json({ sent: true, message: message, recipients: 3 });
});

// GET /admin/logs/:level? — fetch logs, optional severity level
router.get('/logs/:level?', requireAdmin, function (req, res) {
  var level = req.param('level') || 'info';
  var sampleLogs = [
    { ts: '2023-06-01T00:00:01Z', level: 'info',  msg: 'Server started' },
    { ts: '2023-06-01T00:01:00Z', level: 'info',  msg: 'GET /health 200' },
    { ts: '2023-06-01T00:02:10Z', level: 'warn',  msg: 'Slow query detected' },
    { ts: '2023-06-01T00:03:05Z', level: 'error', msg: 'DB connection timeout' }
  ];
  var filtered = level === 'all'
    ? sampleLogs
    : sampleLogs.filter(function (l) { return l.level === level; });
  res.json({ level: level, logs: filtered });
});

module.exports = router;
