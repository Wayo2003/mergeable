# Upgrade Plan: express 4.21.2 → 5.1.0

**Run ID:** 20241026T143000  
**Risk level:** MEDIUM  
**Files to touch:** 4 source files

---

## Changes required

### src/routes/tasks.js — MEDIUM risk
- **bc-001** Replace `app.del()` with `app.delete()` (line 22)
- **bc-005** Replace `req.param('id')` with `req.params.id` (line 45)
- **bc-010** Replace `res.send({ data: tasks }, 200)` with `res.status(200).send({ data: tasks })` (line 88)

### src/routes/users.js — LOW risk
- **bc-006** Replace `res.json({ user }, 201)` with `res.status(201).json({ user })` (line 31)
- **bc-003** Replace `req.acceptsCharset('utf-8')` with `req.acceptsCharsets('utf-8')` (line 55)

### src/routes/auth.js — LOW risk
- **bc-009** Replace `res.redirect('back')` with `res.redirect(req.get('Referrer') || '/')` (line 67)

### src/middleware/static.js — LOW risk
- **bc-014** Replace `{ hidden: true }` with `{ dotfiles: 'allow' }` (line 8)

### src/app.js — LOW risk
- **bc-025** Add error handling to `app.listen()` callback (line 18)

---

## Residual risk

The upgrade from Express 4.21.2 to 5.1.0 introduces a change in the default query parser (from `extended` to `simple`). The TaskHub API does not currently use nested query objects, so this change is safe. However, if future routes add query parameters with nested structures (e.g. `?filter[status]=active`), the query parser must be set explicitly: `app.set('query parser', 'extended')`.

Additionally, `express.static` dotfiles now default to `"ignore"`. The `/public` directory does not contain dot-directories, so no immediate impact is expected. If ACME/Let's Encrypt challenges or Apple Universal Links are added in future, a dedicated static route with `dotfiles: 'allow'` will be required.

The `body-parser` dependency is resolved transitively via Express 5 which bundles an updated version, closing CVE-2024-45590. No direct changes to body-parser configuration are needed.

---

## Files NOT touched (safe)

- `src/models/` — no Express API usage
- `tests/` — test framework is Jest, unaffected by Express version
