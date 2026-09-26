# Change Plan — express 4.17.1 -> 5.1.0
Run: 20260926-154709

## Summary
- Relevant breaking changes: 9 (bc-001, bc-004, bc-005, bc-006, bc-007, bc-009, bc-010, bc-011, bc-013)
- Files to modify: 3 (app.js, routes/admin.js, routes/tasks.js)
- Checks before: 0 passed / 0 failed (suite crashed — test runner could not load due to `/:id/:field?` syntax crash)

## File Groups

### [risk: medium] demo-target/app.js

| Breaking Change | Line | Old API | New API |
|---|---|---|---|
| bc-009 · Wildcard paths must be named | 21 | `app.get('/files/*', ...)` | `app.get('/files/*splat', ...)` |
| bc-009 · Wildcard paths must be named | 31 | `app.all('/api/*', ...)` | `app.all('/api/*splat', ...)` |
| bc-010 · req.params wildcard now splat | 22 | `var filePath = req.params[0];` | `var filePath = Array.isArray(req.params.splat) ? req.params.splat.join('/') : req.params.splat;` |
| bc-006 · res.redirect('back') removed | 32 | `res.redirect('back');` | `res.redirect(req.get('Referrer') \|\| '/');` |
| bc-007 · res.send(status) removed | 37 | `res.send(404);` | `res.sendStatus(404);` |
| bc-005 · res.json(status, obj) removed | 43 | `res.json(status, { error: ... });` | `res.status(status).json({ error: ... });` |

**Fix recipe for app.js:**
1. Line 21: rename `/files/*` → `/files/*splat`
2. Line 22: replace `req.params[0]` with `Array.isArray(req.params.splat) ? req.params.splat.join('/') : req.params.splat`
3. Line 31: rename `/api/*` → `/api/*splat`
4. Line 32: replace `res.redirect('back')` with `res.redirect(req.get('Referrer') || '/')`
5. Line 37: replace `res.send(404)` with `res.sendStatus(404)`
6. Line 43: replace `res.json(status, { error: err.message || 'Internal Server Error' })` with `res.status(status).json({ error: err.message || 'Internal Server Error' })`

---

### [risk: medium] demo-target/routes/admin.js

| Breaking Change | Line | Old API | New API |
|---|---|---|---|
| bc-001 · app.del() removed | 57 | `router.del = router.delete;` | *(remove shim line)* |
| bc-001 · app.del() removed | 58 | `router.del('/users/:id', ...)` | `router.delete('/users/:id', ...)` |
| bc-004 · req.param(name) removed | 59 | `req.param('id')` | `req.params.id` |
| bc-013 · Optional ? param syntax removed | 86 | `router.get('/logs/:level?', ...)` | `router.get('/logs{/:level}', ...)` |
| bc-004 · req.param(name) removed | 87 | `req.param('level')` | `req.params.level` |

**Fix recipe for routes/admin.js:**
1. Line 57: delete the line `router.del = router.delete;`
2. Line 58: rename `router.del(` to `router.delete(`
3. Line 59: replace `req.param('id')` with `req.params.id`
4. Line 86: rename route path `'/logs/:level?'` to `'/logs{/:level}'`
5. Line 87: replace `req.param('level')` with `req.params.level`

---

### [risk: medium] demo-target/routes/tasks.js

| Breaking Change | Line | Old API | New API |
|---|---|---|---|
| bc-011 · req.query is read-only | 45 | `req.query.status = req.query.status.toLowerCase();` | `var status = req.query.status.toLowerCase();` (use local var) |
| bc-011 · req.query is read-only | 48 | `req.query.priority = req.query.priority.toLowerCase();` | `var priority = req.query.priority.toLowerCase();` (use local var) |
| bc-011 · downstream usage | 54 | `req.query.status` (filter) | `status` (local var) |
| bc-011 · downstream usage | 57 | `req.query.priority` (filter) | `priority` (local var) |
| bc-013 · Optional ? param syntax removed | 64 | `router.get('/:id/:field?', ...)` | `router.get('/:id{/:field}', ...)` |
| bc-004 · req.param(name) removed | 66 | `req.param('id')` | `req.params.id` |
| bc-004 · req.param(name) removed | 67 | `req.param('field')` | `req.params.field` |
| bc-007 · res.send(status) removed | 111 | `res.send(201);` | `res.sendStatus(201);` |
| bc-004 · req.param(name) removed | 116 | `req.param('id')` | `req.params.id` |
| bc-004 · req.param(name) removed | 146 | `req.param('id')` | `req.params.id` |
| bc-004 · req.param(name) removed | 168 | `req.param('id')` | `req.params.id` |
| bc-007 · res.send(status) removed | 178 | `res.send(204);` | `res.sendStatus(204);` |

**Fix recipe for routes/tasks.js:**
1. Lines 44-58 (GET / handler): replace `req.query.status = ...toLowerCase()` / `req.query.priority = ...toLowerCase()` with local variables `var status` / `var priority`, and update the downstream filter references to use `status` and `priority` instead of `req.query.status` / `req.query.priority`.
2. Line 64: rename route path `'/:id/:field?'` to `'/:id{/:field}'`
3. Line 66: replace `req.param('id')` with `req.params.id`
4. Line 67: replace `req.param('field')` with `req.params.field`
5. Line 111: replace `res.send(201)` with `res.sendStatus(201)`
6. Line 116: replace `req.param('id')` with `req.params.id`
7. Line 146: replace `req.param('id')` with `req.params.id`
8. Line 168: replace `req.param('id')` with `req.params.id`
9. Line 178: replace `res.send(204)` with `res.sendStatus(204)`

---

## Residual Risk
No residual risk. All breaking changes handled and tests passing (33/33).
