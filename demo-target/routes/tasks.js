'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');

var router = express.Router();

var JWT_SECRET = process.env.JWT_SECRET || 'taskhub-secret-key';

// In-memory tasks store
var tasks = [
  { id: 1, title: 'Bootstrap project', status: 'done',    priority: 'high',   assignee: 'alice', createdAt: '2023-01-10T09:00:00Z' },
  { id: 2, title: 'Write unit tests',  status: 'in-progress', priority: 'high', assignee: 'bob', createdAt: '2023-01-11T10:30:00Z' },
  { id: 3, title: 'Deploy to staging', status: 'todo',    priority: 'medium', assignee: null,    createdAt: '2023-01-12T08:00:00Z' }
];

var nextId = 4;

function requireAuth(req, res, next) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.replace('Bearer ', '');

  if (!token) {
    var err = new Error('Authentication required');
    err.status = 401;
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, function (err, decoded) {
    if (err) {
      var verifyErr = new Error('Invalid or expired token');
      verifyErr.status = 401;
      return next(verifyErr);
    }
    req.user = decoded;
    next();
  });
}

// GET /tasks — list tasks; supports ?status and ?priority filters
// Also demonstrates req.query mutation to normalise filter values
router.get('/', requireAuth, function (req, res) {
  // Normalise filters via req.query mutation
  if (req.query.status) {
    req.query.status = req.query.status.toLowerCase();
  }
  if (req.query.priority) {
    req.query.priority = req.query.priority.toLowerCase();
  }

  var result = tasks.slice();

  if (req.query.status) {
    result = result.filter(function (t) { return t.status === req.query.status; });
  }
  if (req.query.priority) {
    result = result.filter(function (t) { return t.priority === req.query.priority; });
  }

  res.json({ tasks: result, total: result.length });
});

// GET /tasks/:id/:field? — get task by id; optional field param returns just that field
router.get('/:id/:field?', requireAuth, function (req, res, next) {
  // Use req.param() to read both route and query params
  var id = parseInt(req.param('id'), 10);
  var field = req.param('field');

  var task = tasks.filter(function (t) { return t.id === id; })[0];

  if (!task) {
    var err = new Error('Task not found');
    err.status = 404;
    return next(err);
  }

  if (field) {
    if (!Object.prototype.hasOwnProperty.call(task, field)) {
      var fieldErr = new Error('Field not found: ' + field);
      fieldErr.status = 404;
      return next(fieldErr);
    }
    var payload = {};
    payload[field] = task[field];
    return res.json(payload);
  }

  res.json(task);
});

// POST /tasks — create task
router.post('/', requireAuth, function (req, res, next) {
  var title = req.body.title;

  if (!title || !title.trim()) {
    var err = new Error('title is required');
    err.status = 400;
    return next(err);
  }

  var task = {
    id: nextId++,
    title: title.trim(),
    status: req.body.status || 'todo',
    priority: req.body.priority || 'medium',
    assignee: req.body.assignee || null,
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  res.send(201);
});

// PUT /tasks/:id — replace task
router.put('/:id', requireAuth, function (req, res, next) {
  var id = parseInt(req.param('id'), 10);
  var idx = tasks.map(function (t) { return t.id; }).indexOf(id);

  if (idx === -1) {
    var err = new Error('Task not found');
    err.status = 404;
    return next(err);
  }

  if (!req.body.title || !req.body.title.trim()) {
    var titleErr = new Error('title is required');
    titleErr.status = 400;
    return next(titleErr);
  }

  tasks[idx] = {
    id: id,
    title: req.body.title.trim(),
    status: req.body.status || tasks[idx].status,
    priority: req.body.priority || tasks[idx].priority,
    assignee: req.body.assignee !== undefined ? req.body.assignee : tasks[idx].assignee,
    createdAt: tasks[idx].createdAt,
    updatedAt: new Date().toISOString()
  };

  res.json(tasks[idx]);
});

// PATCH /tasks/:id — partial update
router.patch('/:id', requireAuth, function (req, res, next) {
  var id = parseInt(req.param('id'), 10);
  var idx = tasks.map(function (t) { return t.id; }).indexOf(id);

  if (idx === -1) {
    var err = new Error('Task not found');
    err.status = 404;
    return next(err);
  }

  var allowed = ['title', 'status', 'priority', 'assignee'];
  allowed.forEach(function (key) {
    if (req.body[key] !== undefined) {
      tasks[idx][key] = req.body[key];
    }
  });
  tasks[idx].updatedAt = new Date().toISOString();

  res.json(tasks[idx]);
});

// DELETE /tasks/:id — uses app.del()-style pattern on the router
router.delete('/:id', requireAuth, function (req, res, next) {
  var id = parseInt(req.param('id'), 10);
  var idx = tasks.map(function (t) { return t.id; }).indexOf(id);

  if (idx === -1) {
    var err = new Error('Task not found');
    err.status = 404;
    return next(err);
  }

  tasks.splice(idx, 1);
  res.send(204);
});

// Expose store for test reset
router._store = tasks;
router._resetStore = function () {
  tasks.length = 0;
  tasks.push(
    { id: 1, title: 'Bootstrap project', status: 'done',    priority: 'high',   assignee: 'alice', createdAt: '2023-01-10T09:00:00Z' },
    { id: 2, title: 'Write unit tests',  status: 'in-progress', priority: 'high', assignee: 'bob', createdAt: '2023-01-11T10:30:00Z' },
    { id: 3, title: 'Deploy to staging', status: 'todo',    priority: 'medium', assignee: null,    createdAt: '2023-01-12T08:00:00Z' }
  );
  nextId = 4;
};

module.exports = router;
