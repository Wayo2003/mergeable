# Step 03 — Install and Plan

**Goal:** Install the target version, capture the baseline test failure, then build a
structured change plan mapping every relevant breaking change to the exact file and line
that needs fixing, with a risk level per group.
Update the todo list: mark step 03 as in-progress.

---

## 3.1 — Install the target package version

Run:
```
npm install <package>@<targetVersion>
```

in the project root. Use `execute_command` with `cwd` set to the project root.

If the install fails, stop and report the error — do not proceed to 3.2.

---

## 3.2 — Capture pre-fix test results (checks-before.json)

Call:
```
run_checks({ root: <root> })
```

Save the full result to `.mergeable/runs/<RUN_ID>/checks-before.json`.

The tests are **expected to fail** at this point. If they pass, note it — the upgrade
may not require code changes — but continue the plan step anyway.

---

## 3.3 — Build the change plan

Read:
- `breaking-changes.json` — filter to entries where `"relevant": true`
- `triage.json` → `usageMap`

For each relevant breaking change, join it with every usage-map entry whose file/snippet
matches the detection pattern. Produce a flat list of fix tasks:

```
fix-task: {
  breakingChangeId,  // e.g. "bc-001"
  file,              // e.g. "src/routes/api.js"
  line,              // line number from usageMap
  symbol,            // e.g. "app.del"
  snippet,           // the matching code snippet
  fixBefore,         // from breaking-changes.json fix.before
  fixAfter,          // from breaking-changes.json fix.after
  fixNotes           // from breaking-changes.json fix.notes
}
```

---

## 3.4 — Group by file and assign risk

Group the fix tasks by `file`. For each file group:

- **Risk level:**
  - `critical` — if the file has ≥ 1 fix for a CRITICAL or HIGH severity breaking change
    (cross-reference `triage.json` vulnerabilities to see which breaking change is linked)
  - `medium` — if the file has multiple fixes or touches auth/security-related paths
  - `low` — single isolated fix, non-critical code path

---

## 3.5 — Write plan.md

Write `.mergeable/runs/<RUN_ID>/plan.md` with the following structure:

```markdown
# Change Plan — <package> <currentVersion> -> <targetVersion>
Run: <RUN_ID>

## Summary
- Relevant breaking changes: <N>
- Files to modify: <F>
- Checks before: <passed> passed / <failed> failed

## File Groups

### [risk: critical] src/routes/api.js
| Breaking Change | Line | Old API | New API |
|---|---|---|---|
| bc-001 · app.del() removed | 42 | `app.del('/path', ...)` | `app.delete('/path', ...)` |

**Fix recipe:**
...

### [risk: medium] src/middleware/auth.js
...

## Residual Risk
_To be filled after step 05._
```

---

## 3.6 — Completion

Update the todo list: mark step 03 as complete, mark step 04 as in-progress.

Report:
```
Plan written. <F> file group(s): <C> critical, <M> medium, <L> low.
Checks before: <passed> passed / <failed> failed.
```
