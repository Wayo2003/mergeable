# Step 01 — Triage

**Goal:** Create the run folder, assess vulnerability exposure, and build a usage map.
Update the todo list: mark step 01 as in-progress.

---

## 1.1 — Collect inputs

If any of the following are not already in context, ask for them before proceeding:

- `package` — the npm package name (e.g. `express`)
- `currentVersion` — the version currently in package.json (e.g. `4.18.2`)
- `targetVersion` — the version to upgrade to (e.g. `5.1.0`)
- `root` — the project root to scan (default: `.`)

---

## 1.2 — Create the run folder

Generate a timestamp in the format `YYYYMMDD-HHmmss` using the current UTC time.
Store it as `RUN_ID`.

Create the directory:
```
.mergeable/runs/<RUN_ID>/
```

Record `startedAt` as an ISO-8601 UTC timestamp string (e.g. `2025-01-15T14:30:00Z`).

---

## 1.3 — OSV vulnerability lookup

Call `osv_lookup` **twice** — once for the current version and once for the target version.

```
osv_lookup({ ecosystem: "npm", package: <package>, version: <currentVersion> })
osv_lookup({ ecosystem: "npm", package: <package>, version: <targetVersion> })
```

Both calls are independent — run them in parallel.

From the results, extract for each vulnerability:
- `id` — the OSV ID (e.g. `GHSA-xxxx-xxxx-xxxx`)
- `cveAliases` — any CVE- aliases listed
- `severity` — CRITICAL / HIGH / MEDIUM / LOW (map from CVSS score if needed)
- `fixedIn` — the first version that fixes it
- `summary` — one-line description

Determine `exposure`:
- `verdict`: `"exposed"` if any vuln in `currentVersion` is fixed by a version <= `targetVersion`; `"not-exposed"` otherwise
- Note any vulns that are present in `targetVersion` too (not fully fixed)

---

## 1.4 — Build the usage map

Spawn a single **Explore subagent** to run `find_usages` against the project root.

Pass to the subagent:
- The package name
- The project root path

The subagent must call:
```
find_usages({ package: <package>, root: <root> })
```

Collect the result: an array of `{ file, line, symbol, snippet }` entries.
Group the entries by `file` to form the usage map.

---

## 1.5 — Write triage.json

Write `.mergeable/runs/<RUN_ID>/triage.json` with the following structure:

```json
{
  "runId": "<RUN_ID>",
  "startedAt": "<ISO timestamp>",
  "package": "<package>",
  "currentVersion": "<currentVersion>",
  "targetVersion": "<targetVersion>",
  "vulnerabilities": {
    "current": [ /* osv_lookup results for currentVersion */ ],
    "target":  [ /* osv_lookup results for targetVersion */ ]
  },
  "exposure": {
    "verdict": "exposed | not-exposed",
    "closedBy": [ /* vuln IDs fixed by upgrading to targetVersion */ ],
    "stillPresent": [ /* vuln IDs still present in targetVersion */ ]
  },
  "usageMap": [
    { "file": "src/app.js", "line": 12, "symbol": "express", "snippet": "const express = require('express')" }
  ]
}
```

Use only real data from tool output — never fabricate IDs or severity levels.

---

## 1.6 — Completion

Update the todo list: mark step 01 as complete, mark step 02 as in-progress.

Report a one-line summary:
```
Triage complete. <N> vuln(s) in current, <M> in target. <K> usage site(s) across <F> file(s). Run ID: <RUN_ID>
```
