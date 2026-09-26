# Step 06 — Generate Dossier

**Goal:** Record the end time and total duration, then use the upgrade-dossier skill to produce
the HTML Upgrade Dossier and the PR body. Use only real measured data — never invent numbers.
Update the todo list: mark step 06 as in-progress.

---

## 6.1 — Record timing

Record `finishedAt` as an ISO-8601 UTC timestamp (current time).

Calculate `durationMs` as the difference between `finishedAt` and `startedAt` (from triage.json).

---

## 6.2 — Update triage.json with end time

Open `.mergeable/runs/<RUN_ID>/triage.json` and add two fields at the top level:
```json
"finishedAt": "<ISO timestamp>",
"durationMs": <number>
```

---

## 6.3 — Verify all required inputs are present

Before calling the skill, confirm all of the following files exist in the run folder:

| File | Required |
|---|---|
| `triage.json` | yes |
| `breaking-changes.json` | yes |
| `plan.md` | yes |
| `checks-before.json` | yes |
| `checks-after.json` | yes |
| `diff.patch` | optional (note as "not available" if missing) |

If any required file is missing, stop and report — do not proceed with incomplete data.

---

## 6.4 — Activate the upgrade-dossier skill

Load the skill:
```
use_skill("upgrade-dossier")
```

Follow the skill instructions exactly, passing the run folder path:
```
.mergeable/runs/<RUN_ID>/
```

The skill will:
1. Read all input files
2. Compute derived stats from real data only
3. Write `dossier.html` — a self-contained HTML report
4. Write `pr-body.md` — a ready-to-paste GitHub PR description

---

## 6.5 — Validate outputs

After the skill completes:

1. Confirm `dossier.html` exists and is non-empty.
2. Confirm `pr-body.md` exists and is non-empty.
3. Verify that `dossier.html` contains no placeholder tokens (no `{{...}}` patterns remaining).
   Use `grep` to check:
   ```
   grep -n "{{" .mergeable/runs/<RUN_ID>/dossier.html
   ```
   If any are found, identify and fill them from the run folder data.

---

## 6.6 — Completion

Update the todo list: mark step 06 as complete, mark step 07 as in-progress.

Report:
```
Dossier generated.
  dossier.html: .mergeable/runs/<RUN_ID>/dossier.html
  pr-body.md:   .mergeable/runs/<RUN_ID>/pr-body.md
  Duration: <N> minutes
  Verdict: <Ready to merge | Needs attention>
```
