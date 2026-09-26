# Step 05 — Verify

**Goal:** Run checks after all fixes. If any file group fails, give it back to the responsible
subagent for one retry. If it still fails after 2 loops, revert that group and record it as
residual risk. Save final artefacts.
Update the todo list: mark step 05 as in-progress.

---

## 5.1 — Run post-fix checks

Call:
```
run_checks({ root: <root> })
```

---

## 5.2 — Evaluate results

Compare to `checks-before.json` read in step 03.

**If all tests pass:** proceed directly to 5.4.

**If tests fail:**
- Map each failing test to the file(s) most likely responsible by matching test names / error
  messages to the files edited in step 04.
- Identify the subagent (by file group) that owns those files.

---

## 5.3 — Retry loop (max 2 total check runs per file group)

For each failing file group, perform the following up to **2 times total** (the first run in 5.1
counts as loop 1):

**Loop attempt:**

1. Spawn a new `"general"` subagent for the failing file group, passing:
   - The file group's fix tasks from plan.md (same as step 04)
   - The full failure output from `run_checks` (test names, error messages, stack traces)
   - The current content of the affected files
   - Instruction: "Fix only the failing tests in your assigned files. Do not touch other files."

2. Wait for the subagent to complete its edits.

3. Call `run_checks` again and record the result.

4. If the tests for this file group now pass, mark the group as **fixed**.
   If they still fail after the 2nd attempt:
   - **Revert the file group:** for each file in the group, restore it to its pre-fix state
     using `git checkout -- <file>`.
   - Mark the group as **residual risk**.
   - Record the failing test names and error messages for the dossier.

---

## 5.4 — Save final artefacts

### checks-after.json

Save the final (most recent) `run_checks` output to:
```
.mergeable/runs/<RUN_ID>/checks-after.json
```

### diff.patch

Capture the git diff of all changes made during this run:
```
git diff > .mergeable/runs/<RUN_ID>/diff.patch
```

Run this with `execute_command`.

---

## 5.5 — Update plan.md residual risk section

Open `.mergeable/runs/<RUN_ID>/plan.md` and fill in the `## Residual Risk` section:

- If all groups passed: `No residual risk. All breaking changes handled and tests passing.`
- If groups were reverted: list each reverted file group, the breaking changes it was meant to fix,
  and the failing test names/errors that caused the revert.

---

## 5.6 — Completion

Update the todo list: mark step 05 as complete, mark step 06 as in-progress.

Report:
```
Verification complete.
  Checks after: <passed> passed / <failed> failed
  File groups passing: <N>
  File groups reverted (residual risk): <R>
  diff.patch: <size> bytes
```
