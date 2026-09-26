# Step 04 — Fix in Parallel

**Goal:** Apply all code fixes by spawning one General subagent per file group in parallel.
Each subagent receives only its own slice of the plan and must not touch any other file.
Update the todo list: mark step 04 as in-progress.

---

## 4.1 — Prepare subagent slices

Read `plan.md` and identify every file group section.
For each group, extract:

- `fileGroup` — the list of files belonging to this group (one file per group as defined in step 03)
- `fixTasks` — the full table of fix tasks for those files (breaking change ID, line, before, after, notes)
- `riskLevel` — the risk level assigned in the plan

---

## 4.2 — Spawn one General subagent per file group (in parallel)

Spawn **all subagents in the same turn** so they execute in parallel.

For each file group, spawn a `"general"` subagent with a self-contained instruction that includes:

1. **Scope declaration** — the exact list of files this subagent may read and edit.
   State explicitly: "You must not read or modify any file outside this list."

2. **Fix tasks** — the full fix table for this group from plan.md, including:
   - The breaking change title and ID
   - The line number(s) to change
   - The exact `before` code snippet
   - The exact `after` code snippet
   - Any `notes` on edge cases

3. **Edit instructions:**
   - Use `read_file` to read the current file content
   - Use `apply_diff` or `search_and_replace` to make each fix with surgical precision
   - Make the minimal change required — do not reformat, refactor, or touch unrelated code
   - After all edits, verify the file is syntactically valid (read it back and check)

4. **Return contract** — the subagent must return a structured summary:
   ```
   {
     "fileGroup": ["src/routes/api.js"],
     "fixesApplied": [
       { "breakingChangeId": "bc-001", "file": "src/routes/api.js", "line": 42, "status": "applied" }
     ],
     "errors": []
   }
   ```

---

## 4.3 — Collect results

Wait for all subagents to complete. Collect each subagent's return summary.

For any subagent that reports errors or did not apply all fixes, note the file group
and the error details — they will be retried or reverted in step 05.

---

## 4.4 — Completion

Update the todo list: mark step 04 as complete, mark step 05 as in-progress.

Report:
```
Fix pass complete.
  Applied: <N> fixes across <F> files
  Errors / skipped: <E> (detail any errors inline)
```
