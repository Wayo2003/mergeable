# Mergeable — Product Requirements

> **Dependabot opens the PR. Mergeable makes it mergeable.**

## 1. Problem

Dependency bots (Dependabot, Renovate) are good at *bumping a version number*. They are useless the
moment that bump contains a **breaking change**: CI goes red, the PR sits in the queue, and a developer
has to:

1. Figure out *why* this upgrade matters (is there a CVE? how severe? are we actually exposed?).
2. Read the library's changelog / migration guide (often long, scattered across releases, sometimes a PDF).
3. Find every call site in the codebase affected by each breaking change.
4. Fix them one by one, re-run tests, repeat.
5. Convince a reviewer the change is safe.

This is slow, boring, error-prone work, so it gets postponed — and **known vulnerabilities stay in
production** because "the upgrade is breaking". The result: a growing pile of red bot PRs and security debt.

## 2. Solution

Mergeable is a **Bob-native upgrade workflow** that turns a failing dependency PR (or a CVE alert) into a
**green, reviewed, evidence-backed PR**.

It is built entirely on IBM Bob 2.0 primitives:

| Step | What happens | Bob 2.0 feature |
|---|---|---|
| 1. Triage | Look up the vulnerability (OSV), decide severity & exposure, map every usage of the package in the repo | MCP server + **Explore subagent** |
| 2. Read the docs | Ingest the library's CHANGELOG / migration guide (Markdown, HTML **or PDF**) and extract a structured list of breaking changes | **Document understanding** + Skill |
| 3. Plan | Cross breaking changes × call sites → change plan with a risk level per file | **Plan mode** |
| 4. Fix in parallel | One subagent per module applies the edits for its slice | **Parallel General subagents** |
| 5. Verify | Run tests / lint / typecheck; if a module fails, roll it back and retry (max 2 loops) | Agent mode + **Rollback** |
| 6. Evidence | Generate the **Upgrade Dossier** (HTML): CVE fixed, each breaking change → the exact diff that handled it, tests before/after, residual risk, reviewer checklist, time saved | Skill + HTML output |
| 7. Human gate | Reviewer approves before anything is pushed | Permission model |
| 8. Headless | The same workflow runs in GitHub Actions on every Dependabot PR via `bob run` and posts the dossier as a PR comment | **Bob Shell (`bob run`)** |

## 3. Deliverables in the repo

```
mergeable/
├── .bob/
│   ├── custom_modes.yaml            # "🩹 Mergeable" orchestrator mode
│   ├── rules-mergeable/             # step-by-step instructions for the mode
│   └── skills/
│       ├── breaking-change-extractor/   # changelog/migration guide -> breaking-changes.json
│       └── upgrade-dossier/             # results -> dossier.html (+ template)
├── mcp-server/                      # Node/TypeScript MCP server
│   └── tools: osv_lookup, find_usages, fetch_changelog, run_checks
├── .github/workflows/mergeable.yml  # runs `bob run` on Dependabot PRs
├── demo-target/                     # realistic sample app pinned to vulnerable versions
└── docs/                            # this PRD, architecture diagram, results
```

### 3.1 MCP server tools (contract)

- `osv_lookup({ ecosystem, package, version })` → list of vulns (id, CVE aliases, severity, fixed versions, summary). Uses `https://api.osv.dev/v1/query`.
- `find_usages({ package, root })` → every import/require of the package and every member used (`file`, `line`, `symbol`, `snippet`).
- `fetch_changelog({ package, from, to })` → release notes between two versions (npm registry metadata + GitHub releases / CHANGELOG.md), as text.
- `run_checks({ root })` → runs `npm test` (+ lint/typecheck if present) and returns `{ passed, failed, failures: [{ test, message }], durationMs }`.

### 3.2 Artifacts produced per run (in `.mergeable/runs/<timestamp>/`)

- `triage.json` — vulns, severity, exposure verdict, usage map
- `breaking-changes.json` — `[{ id, title, description, detection, fix, source }]`
- `plan.md` — change plan, risk per file
- `checks-before.json`, `checks-after.json`
- `dossier.html` — the Upgrade Dossier (self-contained, opens in any browser)
- `pr-body.md` — ready-to-paste PR description

## 4. Demo scenario

`demo-target/` is a small but realistic **Express 4 REST API** ("TaskHub": auth + tasks CRUD) with a test
suite, pinned to versions affected by real advisories (verify exact IDs with `osv_lookup`). Upgrading to
**Express 5** requires real migrations (route syntax changes, removed APIs such as `req.param()`,
`res.send(status)`, `app.del()`, `res.redirect('back')`, etc.), so a plain version bump breaks the tests.
Mergeable must bring it back to green.

## 5. Success metrics (measured for real, never invented)

- Time from "red bot PR" to "green PR + dossier": manual (timed) vs Mergeable.
- Call sites fixed automatically / total.
- Tests passing before vs after.
- Vulnerabilities closed.

## 6. Non-goals

- Not a replacement for Dependabot/Renovate — it sits on top of them.
- Node.js/npm only during the hackathon (architecture is ecosystem-pluggable via OSV).
