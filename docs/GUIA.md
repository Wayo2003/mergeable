# Guía paso a paso — Mergeable (IBM Bob 2.0 Hackathon)

**Fecha límite: domingo 27 sept, 17:00 (hora de España). Objetivo: enviarlo antes de las 14:00.**

Reglas:
- El código lo escribe **Bob** (lo exigen las bases).
- Al terminar cada tarea de Bob → 📸 captura del resumen → guardarla en `docs/bob-sessions/` con el nombre indicado.
- Después de cada tarea, avisa a Claude con "hecho": revisa, prueba y sube a GitHub.

---

## TAREA 0 — Abrir el proyecto en Bob (una sola vez)
1. Abre IBM Bob.
2. File → Open Folder → `C:\Users\AlvaroCunadoMoya\Documents\Hackaton\mergeable` → Seleccionar carpeta.
3. Si pregunta "Do you trust...?" → Yes, I trust.
4. Comprueba que a la izquierda ves la carpeta `docs` con `PRD.md` y `GUIA.md` dentro.

## TAREA 1 — App de demo · modo Agent · 📸 `01-demo-app.png`
```
Read docs/PRD.md (section 4). Create demo-target/: a realistic Express 4 REST API called "TaskHub"
(Node 20, CommonJS). Features: POST /auth/login (jsonwebtoken), CRUD /tasks with an in-memory store,
optional-param routes, error middleware, and routes split into routes/auth.js, routes/tasks.js,
routes/admin.js.
The code must naturally use Express-4-era APIs, as a real codebase written years ago would:
req.param(), res.send(statusCode), res.json(status, body), app.del(), wildcard routes like '/files/*',
optional params with '?', req.query mutation, res.redirect('back').
IMPORTANT: do NOT add any comment mentioning Express 5, "legacy", "deprecated", "removed" or
eslint-disable. It must look like a normal production codebase with no hints about what will break.
Pin express to exactly 4.17.1 and body-parser to 1.18.3. Write a Jest + supertest suite with at least
25 tests covering every endpoint, and an npm "test" script. Run npm install and npm test inside
demo-target and fix anything until all tests pass.
```

## TAREA 2 — Servidor MCP · modo Plan → Agent · 📸 `02-mcp-server.png`
(Claude te lo dará cuando termine la Tarea 1)

## TAREA 3 — Skills · 📸 `03-skills.png`
## TAREA 4 — Modo 🩹 Mergeable · 📸 `04-mode.png`
## TAREA 5 — Ensayo general y grabación · 📸 `05-run.png`
## TAREA 6 — GitHub Actions (headless) · 📸 `06-ci.png`
## TAREA 7 — Medir tiempos reales
## TAREA 8 — Vídeo, diapositivas y textos (domingo por la mañana)
