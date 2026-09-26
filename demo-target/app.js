'use strict';

var express = require('express');
var bodyParser = require('body-parser');

var authRoutes = require('./routes/auth');
var tasksRoutes = require('./routes/tasks');
var adminRoutes = require('./routes/admin');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Health check
app.get('/health', function (req, res) {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Static file passthrough (wildcard route)
app.get('/files/*', function (req, res) {
  var filePath = req.params[0];
  res.json({ file: filePath, served: true });
});

app.use('/auth', authRoutes);
app.use('/tasks', tasksRoutes);
app.use('/admin', adminRoutes);

// Catch-all redirect for unknown API paths
app.all('/api/*', function (req, res) {
  res.redirect('back');
});

// 404 handler
app.use(function (req, res) {
  res.send(404);
});

// Error middleware
app.use(function (err, req, res, next) {
  var status = err.status || err.statusCode || 500;
  res.json(status, { error: err.message || 'Internal Server Error' });
});

module.exports = app;
