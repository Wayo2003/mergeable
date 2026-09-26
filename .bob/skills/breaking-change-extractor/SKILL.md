---
name: breaking-change-extractor
description: Use when the user wants to extract breaking changes from a migration guide or changelog (PDF, HTML, or Markdown) into a structured breaking-changes.json file. Activated by phrases like "extract breaking changes", "parse migration guide", "read changelog into JSON", or when the Mergeable workflow reaches Step 2 (Read the docs).
---

# Breaking Change Extractor

Ingest a library migration guide or changelog and produce `.mergeable/runs/<run-id>/breaking-changes.json` — a structured array of every breaking change with concrete detection patterns and precise before/after migration recipes.

## Inputs

- `source` — path or URL to the migration guide (PDF, HTML file, or Markdown file)
- `from` — the version being upgraded FROM (e.g. `"4.x"`)
- `to` — the version being upgraded TO (e.g. `"5.x"`)
- `run_id` — the run folder identifier (e.g. a timestamp like `20241026T143000`)
- `package` — the package name (e.g. `"express"`)

Collect these via `ask_followup_question` if not already provided in context.

## Output

`.mergeable/runs/<run-id>/breaking-changes.json` — validated against `schema.json` in this skill directory.

Schema for each entry:
```json
{
  "id": "bc-001",
  "title": "Short human-readable title",
  "description": "What changed and why it breaks",
  "detection": {
    "pattern": "regex or AST pattern to search in source code",
    "selector": "optional: CSS/XPath selector if HTML",
    "note": "human note about what to look for"
  },
  "fix": {
    "before": "code snippet showing old API",
    "after": "code snippet showing new API",
    "notes": "any caveats or edge cases"
  },
  "source": "section heading or URL anchor in the migration guide"
}
```

## Steps

### 1 — Read the source document

Based on the file type:

- **PDF**: Use `execute_command` to run the extraction script:
  ```
  python .bob/skills/breaking-change-extractor/extract-pdf.py <path>
  ```
  This renders each page as an image. Then use `read_file` on each rendered page image to read the content visually.

- **HTML file**: Use `read_file` to read the raw HTML, then parse headings and content sections.

- **Markdown file**: Use `read_file` to read the content directly.

- **URL**: Use `execute_command` with `curl` or `fetch` to download, then parse.

Read ALL pages/sections — do not skip any. Capture every heading that describes a removed method, changed behaviour, or deprecated API.

### 2 — Identify breaking changes

Scan the document for sections describing:
- **Removed** methods, properties, or APIs (hard breaks — app will crash)
- **Changed** signatures or behaviour (soft breaks — may silently misbehave)
- **Deprecated** APIs that are now fully removed

For each breaking change found, extract:
1. A short `id` slug (e.g. `bc-001`, `bc-002`, incrementing)
2. The exact `title` from the section heading
3. A concise `description` of what changed
4. A concrete `detection` object — **must be specific enough to grep/AST-search real code**:
   - `pattern`: a regex that would match the old API in JS/TS source files (e.g. `\\.del\\(`, `req\\.param\\(`)
   - `note`: plain-English description of what to search for
5. A precise `fix` object with `before` and `after` code snippets copied or derived directly from the guide's diff examples, plus any `notes` on edge cases
6. The `source` — the section heading or URL anchor

### 3 — Validate completeness

Cross-check: the guide's table of contents (if present) should match your list. Every heading in "Removed methods", "Changed" sections must map to at least one entry in the output.

### 4 — Write output

1. Create the run directory if it does not exist:
   ```
   .mergeable/runs/<run-id>/
   ```
2. Write `breaking-changes.json` using `write_file`.
3. Validate the JSON is well-formed and matches the schema in `.bob/skills/breaking-change-extractor/schema.json`.

### 5 — Report

After writing the file, output a summary table:
```
| # | ID     | Title                        | Severity  |
|---|--------|------------------------------|-----------|
| 1 | bc-001 | app.del() removed            | critical  |
| …                                                      |
```

State the total count and the path written.

## Quality rules

- `detection.pattern` must be a valid JavaScript regex string (no leading/trailing `/`).
- `fix.before` and `fix.after` must be runnable code snippets, not prose.
- Do not invent breaking changes not present in the source document.
- Do not omit breaking changes that ARE present — completeness is required.
- If the guide marks something as "deprecated" but not yet removed, still include it with a note in `description`.
