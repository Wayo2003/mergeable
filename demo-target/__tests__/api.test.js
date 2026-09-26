'use strict';

var request = require('supertest');
var app = require('../app');
var tasksRouter = require('../routes/tasks');
var jwt = require('jsonwebtoken');

var JWT_SECRET = 'taskhub-secret-key';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeToken(payload) {
  return jwt.sign(payload || { id: 2, username: 'alice', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
}

function adminToken() {
  return jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(function () {
  tasksRouter._resetStore();
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /auth/login', function () {
  // Test 1
  it('returns 200 and a JWT for valid credentials', function () {
    return request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'alice123' })
      .expect(200)
      .then(function (res) {
        expect(res.body.token).toBeDefined();
        expect(res.body.user.username).toBe('alice');
      });
  });

  // Test 2
  it('returns 401 for wrong password', function () {
    return request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'wrong' })
      .expect(401);
  });

  // Test 3
  it('returns 401 for unknown user', function () {
    return request(app)
      .post('/auth/login')
      .send({ username: 'nobody', password: 'x' })
      .expect(401);
  });

  // Test 4
  it('returns 400 when body is missing', function () {
    return request(app)
      .post('/auth/login')
      .send({})
      .expect(400);
  });
});

describe('GET /auth/me', function () {
  // Test 5
  it('returns current user for valid token', function () {
    return request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.user.username).toBe('alice');
      });
  });

  // Test 6
  it('returns 401 without token', function () {
    return request(app).get('/auth/me').expect(401);
  });

  // Test 7
  it('returns 401 for an invalid token', function () {
    return request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer notavalidtoken')
      .expect(401);
  });
});

describe('POST /auth/logout', function () {
  // Test 8
  it('returns 200 with a confirmation message', function () {
    return request(app)
      .post('/auth/logout')
      .expect(200)
      .then(function (res) {
        expect(res.body.message).toMatch(/logged out/i);
      });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TASK ROUTES
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /tasks', function () {
  // Test 9
  it('returns the full task list for an authenticated user', function () {
    return request(app)
      .get('/tasks')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(200)
      .then(function (res) {
        expect(Array.isArray(res.body.tasks)).toBe(true);
        expect(res.body.total).toBe(3);
      });
  });

  // Test 10
  it('filters tasks by status query param', function () {
    return request(app)
      .get('/tasks?status=done')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.tasks.every(function (t) { return t.status === 'done'; })).toBe(true);
      });
  });

  // Test 11
  it('filters tasks by priority query param (case-insensitive)', function () {
    return request(app)
      .get('/tasks?priority=HIGH')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.tasks.length).toBeGreaterThan(0);
        expect(res.body.tasks.every(function (t) { return t.priority === 'high'; })).toBe(true);
      });
  });

  // Test 12
  it('returns 401 without a token', function () {
    return request(app).get('/tasks').expect(401);
  });
});

describe('GET /tasks/:id', function () {
  // Test 13
  it('returns a single task by id', function () {
    return request(app)
      .get('/tasks/1')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.id).toBe(1);
        expect(res.body.title).toBe('Bootstrap project');
      });
  });

  // Test 14
  it('returns 404 for a non-existent task', function () {
    return request(app)
      .get('/tasks/9999')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(404);
  });

  // Test 15 — optional param route: /tasks/:id/:field?
  it('returns only the requested field when :field is provided', function () {
    return request(app)
      .get('/tasks/1/title')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.title).toBe('Bootstrap project');
        expect(res.body.id).toBeUndefined();
      });
  });

  // Test 16
  it('returns 404 when the requested field does not exist', function () {
    return request(app)
      .get('/tasks/1/nonexistentfield')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(404);
  });
});

describe('POST /tasks', function () {
  // Test 17
  it('creates a new task and responds 201', function () {
    return request(app)
      .post('/tasks')
      .set('Authorization', 'Bearer ' + makeToken())
      .send({ title: 'New Task', priority: 'low' })
      .expect(201);
  });

  // Test 18
  it('returns 400 when title is missing', function () {
    return request(app)
      .post('/tasks')
      .set('Authorization', 'Bearer ' + makeToken())
      .send({ status: 'todo' })
      .expect(400);
  });
});

describe('PUT /tasks/:id', function () {
  // Test 19
  it('replaces a task and returns the updated document', function () {
    return request(app)
      .put('/tasks/1')
      .set('Authorization', 'Bearer ' + makeToken())
      .send({ title: 'Updated title', status: 'in-progress', priority: 'low' })
      .expect(200)
      .then(function (res) {
        expect(res.body.title).toBe('Updated title');
        expect(res.body.status).toBe('in-progress');
      });
  });

  // Test 20
  it('returns 404 for a missing task', function () {
    return request(app)
      .put('/tasks/9999')
      .set('Authorization', 'Bearer ' + makeToken())
      .send({ title: 'x' })
      .expect(404);
  });
});

describe('PATCH /tasks/:id', function () {
  // Test 21
  it('partially updates a task', function () {
    return request(app)
      .patch('/tasks/2')
      .set('Authorization', 'Bearer ' + makeToken())
      .send({ status: 'done' })
      .expect(200)
      .then(function (res) {
        expect(res.body.status).toBe('done');
        expect(res.body.title).toBe('Write unit tests');
      });
  });
});

describe('DELETE /tasks/:id', function () {
  // Test 22
  it('deletes an existing task and responds 204', function () {
    return request(app)
      .delete('/tasks/3')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(204);
  });

  // Test 23
  it('returns 404 when trying to delete a non-existent task', function () {
    return request(app)
      .delete('/tasks/9999')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /admin/stats', function () {
  // Test 24
  it('returns server stats for admin', function () {
    return request(app)
      .get('/admin/stats')
      .set('Authorization', 'Bearer ' + adminToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.uptime).toBeDefined();
      });
  });

  // Test 25
  it('returns 403 for non-admin users', function () {
    return request(app)
      .get('/admin/stats')
      .set('Authorization', 'Bearer ' + makeToken())
      .expect(403);
  });
});

describe('GET /admin/users', function () {
  // Test 26
  it('lists users for admin', function () {
    return request(app)
      .get('/admin/users')
      .set('Authorization', 'Bearer ' + adminToken())
      .expect(200)
      .then(function (res) {
        expect(Array.isArray(res.body.users)).toBe(true);
        expect(res.body.users.length).toBeGreaterThan(0);
      });
  });
});

describe('POST /admin/broadcast', function () {
  // Test 27
  it('broadcasts a message and returns confirmation', function () {
    return request(app)
      .post('/admin/broadcast')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ message: 'Maintenance at midnight' })
      .expect(200)
      .then(function (res) {
        expect(res.body.sent).toBe(true);
        expect(res.body.message).toBe('Maintenance at midnight');
      });
  });

  // Test 28
  it('returns 400 when message is missing', function () {
    return request(app)
      .post('/admin/broadcast')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({})
      .expect(400);
  });
});

describe('GET /admin/logs/:level?', function () {
  // Test 29
  it('returns all logs when level=all', function () {
    return request(app)
      .get('/admin/logs/all')
      .set('Authorization', 'Bearer ' + adminToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.logs.length).toBeGreaterThan(1);
      });
  });

  // Test 30
  it('defaults to info level when no level param is given', function () {
    return request(app)
      .get('/admin/logs')
      .set('Authorization', 'Bearer ' + adminToken())
      .expect(200)
      .then(function (res) {
        expect(res.body.level).toBe('info');
      });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WILDCARD / SPECIAL ROUTES
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /files/*', function () {
  // Test 31
  it('echoes the wildcard path segment', function () {
    return request(app)
      .get('/files/reports/q1.pdf')
      .expect(200)
      .then(function (res) {
        expect(res.body.file).toBe('reports/q1.pdf');
      });
  });
});

describe('GET /health', function () {
  // Test 32
  it('returns status ok', function () {
    return request(app)
      .get('/health')
      .expect(200)
      .then(function (res) {
        expect(res.body.status).toBe('ok');
      });
  });
});

describe('404 handler', function () {
  // Test 33
  it('returns 404 for unknown routes', function () {
    return request(app).get('/this/does/not/exist').expect(404);
  });
});
