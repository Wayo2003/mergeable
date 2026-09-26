# Step 07 — Human Gate

**Goal:** Present a concise summary of the run to the human and STOP.
Do not commit, push, create a pull request, or take any further action without explicit approval.
Update the todo list: mark step 07 as in-progress.

---

## 7.1 — Compile the summary

Read from the run folder:
- `triage.json` — CVEs closed, exposure verdict, duration
- `checks-before.json` — tests before
- `checks-after.json` — tests after
- `diff.patch` — number of files changed (count unique `diff --git` lines)
- `plan.md` — any reverted file groups (residual risk)

---

## 7.2 — Display the summary

Print the following block exactly (fill in real values — never invent):

```
============================================================
  🩹 Mergeable — Run <RUN_ID> complete
============================================================

  Package:        <package> <currentVersion> → <targetVersion>
  Duration:       <N> min <S> sec

  Security
  --------
  CVEs closed:    <N>  (was exposed: <yes/no>)
  Still present:  <M>  (list IDs if any)

  Tests
  -----
  Before:   <passed> passed / <failed> failed
  After:    <passed> passed / <failed> failed

  Files changed:  <F>
  Residual risk:  <R> file group(s) reverted (list files if any)

  Dossier:  .mergeable/runs/<RUN_ID>/dossier.html
  PR body:  .mergeable/runs/<RUN_ID>/pr-body.md
  Patch:    .mergeable/runs/<RUN_ID>/diff.patch

============================================================
  ⚠️  WAITING FOR HUMAN APPROVAL
  Type "approve" to proceed with git add + commit + push, or
  "reject" to discard all changes (git checkout -- .).
============================================================
```

---

## 7.3 — STOP and wait

Do **not**:
- Run `git add`
- Run `git commit`
- Run `git push`
- Create or update a pull request
- Take any other action on the repository

Wait for the human to respond. The only acceptable next actions are:

| Human says | What to do |
|---|---|
| `"approve"` | Run `git add -A`, then `git commit -m "chore: upgrade <pkg> to <targetVersion> [Mergeable run <RUN_ID>]"`, then `git push`. Report the commit hash. |
| `"reject"` | Run `git checkout -- .` to discard all uncommitted changes. Report that the run folder at `.mergeable/runs/<RUN_ID>/` is preserved for reference. |
| Anything else | Ask for clarification — do not act. |

---

## 7.4 — Completion

After the human approves or rejects:

Update the todo list: mark step 07 as complete.

If approved, report:
```
Committed and pushed. Commit: <hash>
Open the PR and paste pr-body.md as the description.
```

If rejected:
```
All file changes discarded. Run artefacts preserved at .mergeable/runs/<RUN_ID>/
```
