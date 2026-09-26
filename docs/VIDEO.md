# Guion del vídeo (máx. 3:00, voz en inglés)

Material que ya tienes: la grabación de la primera ejecución en `Videos\Captures`.
Clips que faltan (Win + Alt + R para grabar cada uno, entre 10 y 30 s):
- **A.** GitHub: la lista de Dependabot o una PR en rojo (sirve cualquier repositorio público con PRs de Dependabot fallidas), o el terminal con los tests en rojo.
- **B.** La web https://wayo2003.github.io/mergeable/ bajando despacio.
- **C.** El informe `example-run/dossier.html` a pantalla completa, bajando despacio y abriendo un diff.
- **D.** GitHub → el archivo `.github/workflows/mergeable.yml`.

Edición: **Clipchamp** (viene con Windows). Arrastra los clips, recórtalos, graba la voz con el micrófono (Grabar → Audio) y acelera ×4 o ×8 las partes lentas de la ejecución de Bob.

| Tiempo | Imagen | Voz (léela tal cual) |
|---|---|---|
| 0:00–0:15 | Clip A: PR o tests en rojo | "Every team has this: a queue of red Dependabot PRs. The bot bumped the version, the upgrade has breaking changes, CI is red — so the security fix just sits there." |
| 0:15–0:30 | La terminal: `Test Suites: 1 failed`, `Unexpected ?` | "Here, Express 4 to 5. The app doesn't even boot. Zero of thirty-three tests run. Fixing it by hand means reading a 26-page migration guide and hunting every call site." |
| 0:30–0:40 | Bob: seleccionar el modo 🩹 Mergeable y pegar el prompt | "This is Mergeable — a custom IBM Bob 2.0 mode. One prompt." |
| 0:40–1:05 | Ejecución (×4): lista de tareas, llamadas MCP osv_lookup / find_usages | "It queries the OSV database through our MCP server and finds two CVEs. An Explore subagent maps every real usage with an AST scanner." |
| 1:05–1:25 | Ejecución: Bob leyendo el PDF y escribiendo breaking-changes.json | "Bob reads the official migration guide — as a PDF — and keeps only the breaking changes that actually hit our code: nine of thirty-three." |
| 1:25–1:50 | Ejecución: subagentes en paralelo (el panel con varios a la vez) | "Then it spawns one subagent per file, in parallel. Each one only touches its own slice. Failures go back to the owner; anything that can't be fixed is rolled back." |
| 1:50–2:05 | run_checks → 33 passed; resumen final pidiendo aprobación | "Thirty-three of thirty-three green. Nine minutes thirty-seven. No test was touched — and Bob stops and waits for a human before any commit." |
| 2:05–2:35 | Clip C: el informe (0 → 33, CVEs, diffs, checklist) | "The reviewer gets the Upgrade Dossier: CVEs closed, every breaking change linked to the exact diff, residual risk and a checklist. Every number comes from real tool output." |
| 2:35–2:48 | Clip D: el workflow + Clip B: la web | "And the same mode runs headlessly in GitHub Actions with Bob Shell, on every Dependabot PR." |
| 2:48–3:00 | La web: el tagline grande | "Dependabot opens the PR. Mergeable makes it mergeable. Built with IBM Bob 2.0." |

Exportar: 1080p, MP4. Comprobar que dura **menos de 3:00**.
