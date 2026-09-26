# Step 02 — Extract Breaking Changes

**Goal:** Ingest the library migration guide and produce a filtered list of breaking changes
that actually affect real call sites in the usage map.
Update the todo list: mark step 02 as in-progress.

---

## 2.1 — Locate the migration guide source

Check for a migration guide in this order:

1. **Local file:** look for any PDF or Markdown file in `docs/sources/` that mentions the package
   name and the target version (e.g. `docs/sources/express-5-migration.md`).
2. **fetch_changelog:** if no local file is found, call:
   ```
   fetch_changelog({ package: <package>, from: <currentVersion>, to: <targetVersion> })
   ```
   and use the returned text as the source document.

Record the `source` path or identifier used.

---

## 2.2 — Activate the breaking-change-extractor skill

Load the skill:
```
use_skill("breaking-change-extractor")
```

Follow the skill instructions exactly, passing:
- `source` — the path or text from step 2.1
- `from` — `currentVersion`
- `to` — `targetVersion`
- `run_id` — `RUN_ID`
- `package` — the package name

The skill will write `.mergeable/runs/<RUN_ID>/breaking-changes.json`.

---

## 2.3 — Filter to call-site-relevant breaking changes

Read the `breaking-changes.json` just written and the `usageMap` from `triage.json`.

For each breaking change entry:
1. Apply its `detection.pattern` (as a regex) against every `snippet` in the usage map.
2. Also apply it against the file contents of every file in the usage map using `grep`.
3. If at least one match is found, the breaking change is **relevant** — keep it.
4. If no matches are found in any usage site, mark the entry with `"relevant": false`
   and add a `"note": "No matching call sites found in usage map"`.

Update the `breaking-changes.json` file in-place: add a `"relevant"` boolean field to every entry.

---

## 2.4 — Summarise

Count:
- `totalExtracted` — total entries in breaking-changes.json
- `relevantCount` — entries where `"relevant": true`
- `irrelevantCount` — entries where `"relevant": false`

---

## 2.5 — Completion

Update the todo list: mark step 02 as complete, mark step 03 as in-progress.

Report a summary table of relevant breaking changes only:

```
| ID     | Title                          | Matched call sites |
|--------|--------------------------------|--------------------|
| bc-001 | app.del() removed              | src/routes/api.js  |
| ...                                                         |
```

State: `<relevantCount> of <totalExtracted> breaking changes affect real call sites.`
