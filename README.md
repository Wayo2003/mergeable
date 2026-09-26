# Mergeable

> **Dependabot opens the PR. Mergeable makes it mergeable.**

Mergeable is an IBM Bob 2.0 workflow that turns a failing dependency upgrade (or a CVE alert)
into a **green, evidence-backed PR** — automatically finding every affected call site, applying
the fixes in parallel, running the tests, and handing off a reviewed dossier to a human before
anything is pushed.

---

## How to run

### Prerequisites

- IBM Bob 2.0 installed and authenticated
- Node.js ≥ 18 (for the MCP server)
- The MCP server built:
  ```bash
  cd mcp-server && npm install && npm run build
  ```

### 1 — Switch to the Mergeable mode

Open the Bob mode picker and select **🩹 Mergeable**, or type `/mode mergeable` in the chat.

### 2 — Start the workflow

Provide Bob with three pieces of information:

```
Upgrade <package> from <currentVersion> to <targetVersion>
```

Example:
```
Upgrade express from 4.18.2 to 5.1.0
```

Bob will ask for the project root if it cannot infer it from context.

### 3 — Watch the 7-step progress

A live todo list tracks progress through the seven steps:

| Step | What happens |
|---|---|
| **01 Triage** | Creates the run folder, queries OSV for CVEs, maps every usage site |
| **02 Breaking changes** | Ingests the migration guide / changelog and extracts relevant breaking changes |
| **03 Plan** | Installs the target version, captures failing tests, writes a change plan with risk levels |
| **04 Fix** | Spawns one subagent per file group in parallel; each applies only its own fixes |
| **05 Verify** | Runs tests; retries failing groups once; reverts and marks residual risk if still failing |
| **06 Dossier** | Generates `dossier.html` and `pr-body.md` from real measured data |
| **07 Human gate** | Prints a summary and waits — nothing is committed until you say "approve" |

### 4 — Review and approve

When step 07 displays the summary, review:

- CVEs closed
- Test results before and after
- Files changed and residual risk
- The dossier: `.mergeable/runs/<RUN_ID>/dossier.html`

Type `approve` to commit and push, or `reject` to discard all code changes
(run artefacts are always preserved in `.mergeable/runs/<RUN_ID>/`).

---

## Run artefacts

Every run stores its evidence in `.mergeable/runs/<YYYYMMDD-HHmmss>/`:

| File | Contents |
|---|---|
| `triage.json` | CVEs, severity, exposure verdict, usage map |
| `breaking-changes.json` | Structured breaking changes with detection patterns and fix recipes |
| `plan.md` | Change plan: breaking change → file:line → fix, grouped by file with risk level |
| `checks-before.json` | Test results before any fixes |
| `checks-after.json` | Test results after all fixes |
| `diff.patch` | Git diff of every change made during the run |
| `dossier.html` | Self-contained HTML Upgrade Dossier (opens offline in any browser) |
| `pr-body.md` | Ready-to-paste GitHub PR description |

---

## Demo

`demo-target/` contains a small Express 4 REST API ("TaskHub") pinned to versions with real
advisories. Run Mergeable against it to upgrade to Express 5:

```
Upgrade express from 4.18.2 to 5.1.0
```

The upgrade requires real migrations (`app.del()` → `app.delete()`, `req.param()` removed,
`res.send(status)` changed, etc.) so a plain version bump breaks the tests — making it a
realistic end-to-end demonstration.

---

## CI / GitHub Actions

The workflow in `.github/workflows/mergeable.yml` runs automatically on every pull request
opened or updated by `dependabot[bot]`, and can also be triggered manually via the
**Actions → Mergeable → Run workflow** button.

### What the workflow does

| Step | Description |
|---|---|
| Checkout | Checks out the repository |
| Node 20 | Sets up Node.js 20 with npm cache |
| `npm ci` | Installs dependencies in both `demo-target/` and `mcp-server/` |
| Build MCP server | Compiles TypeScript (`npm run build` in `mcp-server/`) |
| Install Bob Shell | `curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash` |
| Run Mergeable | `bob run --mode mergeable --format json --max-turns 80 "Make this dependency PR mergeable"` |
| Upload artefacts | Uploads the entire `.mergeable/runs/` folder as a workflow artefact |
| PR comment | Posts the contents of `pr-body.md` as a comment on the pull request |

### Required secrets

Add the following secret in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `BOB_API_KEY` | IBM Bob 2.0 API key. Obtain from your Bob account settings. |

### Running locally (without CI)

```bash
# 1. Build the MCP server
cd mcp-server && npm install && npm run build && cd ..

# 2. Install demo-target dependencies
cd demo-target && npm install && cd ..

# 3. Switch to the Mergeable mode in Bob and run the workflow
bob run --mode mergeable --max-turns 80 "Upgrade express from 4.17.1 to 5.1.0"
```

Bob will write all artefacts to `.mergeable/runs/<YYYYMMDD-HHmmss>/`.

---

## Project structure

```
.
├── .bob/
│   ├── custom_modes.yaml          # "🩹 Mergeable" mode definition
│   ├── mcp.json                   # MCP server registration (relative path, portable)
│   ├── rules-mergeable/           # Step-by-step operating procedures (01–07)
│   └── skills/
│       ├── breaking-change-extractor/   # changelog -> breaking-changes.json
│       └── upgrade-dossier/             # run folder -> dossier.html + pr-body.md
├── mcp-server/                    # TypeScript MCP server
│   └── tools: osv_lookup, find_usages, fetch_changelog, run_checks
├── .github/
│   └── workflows/
│       └── mergeable.yml          # CI workflow (Dependabot PRs + manual trigger)
├── demo-target/                   # Sample Express 4 app for demo runs
└── docs/
    ├── index.html                 # Landing page
    ├── example-run/               # Real run artefacts (express 4.17.1 → 5.1.0)
    └── PRD.md
```
