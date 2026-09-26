# MCP Server Plan — Mergeable

## Overview

Build a Node 20 + TypeScript MCP server in `mcp-server/` using the official
`@modelcontextprotocol/sdk` (stdio transport). It exposes exactly four tools
to IBM Bob:

| Tool | Purpose |
|---|---|
| `osv_lookup` | Query OSV API for vulnerability data on a package version |
| `find_usages` | Walk a project tree, parse JS/TS with `@babel/parser`, and return every symbol from a given package used in the codebase |
| `fetch_changelog` | Pull release notes between two versions via the npm registry and GitHub |
| `run_checks` | Run Jest (`--json`) in a given folder and return structured test results |

The server is registered with Bob via `mcp_config.json`. Unit tests for all
four tools use Jest + the existing `demo-target/` as a realistic fixture.

---

## Sub-Task 1 — Project scaffold

**Status:** `[ ] pending`

**Intent**
Set up `mcp-server/` as a standalone Node 20 / TypeScript package with all
required dependencies, a working `tsconfig.json`, an npm `build` script, and
a `jest.config.js` wired to `ts-jest`.

**Expected Outcomes**
- `mcp-server/package.json` exists with all production and dev deps.
- `mcp-server/tsconfig.json` compiles `src/` to `dist/` with Node20 targets.
- `npm run build` produces `dist/index.js` (entry point).
- `npm test` can discover and run `*.test.ts` files via `ts-jest`.

**Todo List**
1. Create `mcp-server/package.json`:
   - `"main": "dist/index.js"`
   - `"scripts": { "build": "tsc", "test": "jest" }`
   - Production deps: `@modelcontextprotocol/sdk`, `@babel/parser`,
     `@babel/traverse` (for AST walking), `node-fetch` (or native `fetch`),
     `zod` (for input schema validation if SDK needs it).
   - Dev deps: `typescript`, `@types/node`, `@babel/types`, `ts-jest`, `jest`,
     `@types/jest`.
2. Create `mcp-server/tsconfig.json`: `module: NodeNext`, `moduleResolution:
   NodeNext`, `target: ES2022`, `outDir: dist`, `strict: true`.
3. Create `mcp-server/jest.config.js` pointing `ts-jest` at `src/**/*.test.ts`
   and setting `testEnvironment: node`.

**Relevant Context**
- Node 20 has built-in `fetch`; avoid extra HTTP client unless the SDK requires
  one.
- The SDK is `@modelcontextprotocol/sdk` — use its `Server` + `StdioServerTransport`.

---

## Sub-Task 2 — Server entry point and tool registration

**Status:** `[ ] pending`

**Intent**
Create `src/index.ts`: instantiate the MCP `Server`, register all four tools
with their Zod/JSON-schema input shapes, and connect via `StdioServerTransport`.
Each tool implementation lives in its own file under `src/tools/`.

**Expected Outcomes**
- `src/index.ts` exports and starts the server.
- The four tools are registered with correct names and parameter schemas
  matching the PRD contracts.
- `npm run build && node dist/index.js` starts without error and accepts
  MCP stdio messages.

**Todo List**
1. Create `src/index.ts`:
   - Import `Server` and `StdioServerTransport` from the SDK.
   - Import the four tool handler functions from `./tools/`.
   - Register each tool with `server.tool(name, schema, handler)`.
   - Call `server.connect(new StdioServerTransport())`.
2. Define input schemas for each tool:
   - `osv_lookup`: `{ ecosystem: string, package: string, version: string }`
   - `find_usages`: `{ package: string, root: string }`
   - `fetch_changelog`: `{ package: string, from: string, to: string }`
   - `run_checks`: `{ root: string }`

**Relevant Context**
- Check the SDK's v2 `registerTool` / `server.tool` API and ensure the handler
  return type matches `{ content: [{ type: "text", text: string }] }`.
- `stdio` transport reads/writes on `process.stdin` / `process.stdout`; do NOT
  use `console.log` in tools (it corrupts the protocol stream). Use
  `console.error` for debugging only.

---

## Sub-Task 3 — `osv_lookup` tool

**Status:** `[ ] pending`

**Intent**
Implement `src/tools/osv_lookup.ts`. Given `{ ecosystem, package, version }`,
POST to `https://api.osv.dev/v1/query` and return a list of vulnerability
objects.

**Expected Outcomes**
- Returns `{ id, aliases, severity, fixed_versions, summary }[]`.
- Returns an empty array if the version is not affected.
- Unit test verifies the HTTP request shape and parses a mocked response.

**Todo List**
1. POST `{ package: { name, ecosystem }, version }` to the OSV endpoint.
2. Map the `vulns[]` array in the response to the simplified shape.
3. Return the result serialised as a JSON string in the MCP text content.
4. Write `src/tools/osv_lookup.test.ts`:
   - Mock `fetch` with `jest.spyOn` or a manual mock.
   - Test with a known package/version that has a CVE (e.g., express 4.17.1).
   - Test with a clean version → empty array.

**Relevant Context**
- OSV API reference: `https://osv.dev/docs/`
- `severity` lives in `vulns[].severity[]` as `{ type, score }` — surface the
  highest CVSS score found.
- `fixed_versions` comes from `vulns[].affected[].ranges[].events` filtering
  for `fixed`.

---

## Sub-Task 4 — `find_usages` tool

**Status:** `[ ] pending`

**Intent**
Implement `src/tools/find_usages.ts`. Recursively walk the `root` directory,
parse every `.js` / `.ts` / `.jsx` / `.tsx` file with `@babel/parser`, and
collect every place the named `package` is imported and every member accessed
on the bound identifier(s).

**Expected Outcomes**
- Returns `{ file, line, symbol, snippet }[]`.
- For `demo-target/` + package `express`, detects:
  - `app.del` (admin.js:57–58 `router.del = router.delete; router.del(...)`)
  - `req.param` (tasks.js:66, 116, 147, 167; admin.js:59, 87)
  - `res.send` (tasks.js:111, 178; app.js:38)
  - `res.json` (app.js:17, 23, 44; routes throughout)
  - `res.redirect` (app.js:33)
  - `router.get` / `router.post` / etc. path strings
- Skips `node_modules/`.
- Unit test runs `find_usages({ package: 'express', root: '../demo-target' })`
  and asserts the known symbols appear in results.

**Todo List**
1. Collect all JS/TS files under `root` (recursive glob, excluding
   `node_modules`).
2. Parse each file with `@babel/parser` in `sourceType: 'module'` with
   `allowRequire: true` and plugins `['typescript', 'jsx']`.
3. Walk the AST with `@babel/traverse`:
   a. In `ImportDeclaration` nodes: if `source.value === package`, record each
      `specifier` binding name.
   b. In `VariableDeclarator` nodes: if the init is a `CallExpression` to
      `require(package)`, record the binding name from the `id`.
   c. In `MemberExpression` nodes: if the `object` is one of the recorded
      bindings (or any alias of them), record `{ file, line, symbol:
      object.name + '.' + property.name, snippet }`.
4. Include the source line (trim to ≤120 chars) as `snippet`.
5. Write `src/tools/find_usages.test.ts` using `demo-target/` as the fixture
   directory.

**Relevant Context**
- `demo-target/` uses CommonJS `require()` — the parser must handle both
  ESM `import` and CJS `require`.
- `@babel/traverse` default export may require `.default` in CJS interop.
- Binding aliases matter: `var router = express.Router()` — `router` is not the
  top-level import, but calls like `router.get(...)` are still Express API surface.
  Track **all** variables whose initialiser is a member of a package binding
  (e.g., `express.Router()` → track `router`). Similarly `var app = express()`
  tracks `app`.
- Paths in paths: `router.get('/tasks/:id/:field?', ...)` — the path string
  itself is a useful symbol hint; include it as part of `symbol`.
- Skip binary / minified files gracefully (catch parse errors, continue).

---

## Sub-Task 5 — `fetch_changelog` tool

**Status:** `[ ] pending`

**Intent**
Implement `src/tools/fetch_changelog.ts`. Given `{ package, from, to }`,
retrieve human-readable release notes covering all versions in that range.

**Expected Outcomes**
- Returns a single string of concatenated release notes for each version
  between `from` and `to` (inclusive of `to`, exclusive of `from`).
- Sources, in priority order:
  1. GitHub Releases API (link found from npm registry `repository` field).
  2. Raw `CHANGELOG.md` / `HISTORY.md` from the GitHub default branch.
  3. npm registry `versions[v].description` as fallback.
- Unit test mocks `fetch` and verifies the concatenated output.

**Todo List**
1. Fetch `https://registry.npmjs.org/{package}` to get:
   - All version numbers.
   - The `repository.url` pointing to GitHub.
2. Filter versions to those `> from` and `<= to` (semver sort).
3. For each in-range version, attempt:
   a. `GET https://api.github.com/repos/{owner}/{repo}/releases/tags/v{version}`
      (or without `v` prefix as fallback).
   b. If no release, try `GET` raw CHANGELOG and slice the relevant section.
4. Concatenate into a single text block, prefixed with `## v{version}` headers.
5. Gracefully handle 404 / rate-limit (return what was found plus a note).
6. Write `src/tools/fetch_changelog.test.ts` with mocked `fetch`.

**Relevant Context**
- GitHub's REST API requires a `User-Agent` header and optionally a PAT token
  (`GITHUB_TOKEN` env var) to avoid rate-limits.
- Semver comparison: use `semver` npm package or a simple sort using
  `Intl.Collator` numeric mode — prefer the `semver` package for correctness.

---

## Sub-Task 6 — `run_checks` tool

**Status:** `[ ] pending`

**Intent**
Implement `src/tools/run_checks.ts`. Given `{ root }`, run Jest with `--json`
inside that directory and return a structured summary.

**Expected Outcomes**
- Returns `{ passed: number, failed: number, failures: { test: string,
  message: string }[], durationMs: number }`.
- Works even when Jest exits with code 1 (tests failing) — parse stdout JSON
  regardless.
- Unit test stubs `child_process.execFile` and verifies the struct.

**Todo List**
1. Spawn `npx jest --json --forceExit` inside `root` using `child_process.execFile`
   (capture stdout/stderr).
2. Parse the Jest JSON output (`stdout`).
3. Map `testResults[].testResults[].failureMessages` → `failures[]`.
4. Return the summary struct serialised as JSON in the MCP text content.
5. If Jest is not installed in `root`, return a clear error message rather than
   throwing.
6. Write `src/tools/run_checks.test.ts`:
   - Stub `child_process.execFile` to return a canned Jest JSON payload.
   - Test the "all pass" path and the "some fail" path.
   - Optionally add an integration test that runs Jest against `demo-target/`
     (mark with `@slow` or a separate jest config so it doesn't slow CI).

**Relevant Context**
- Jest's `--json` flag writes to stdout; stderr is informational only.
- `forceExit` is needed to avoid hanging on open handles.
- `execFile` vs `spawn`: `execFile` is simpler for capturing full stdout.
- Path to jest binary: prefer `npx jest` or resolving `./node_modules/.bin/jest`
  inside `root` to avoid requiring Jest globally.

---

## Sub-Task 7 — README and Bob MCP config snippet

**Status:** `[ ] pending`

**Intent**
Write `mcp-server/README.md` documenting the server, how to build it, and
the IBM Bob `mcp_config.json` snippet to register it.

**Expected Outcomes**
- README includes: purpose, prerequisites (Node 20), install, build, test
  instructions, and the Bob config snippet.
- The config snippet is a ready-to-paste JSON block for Bob's MCP settings.

**Todo List**
1. Document the four tools and their input/output contracts.
2. Provide the Bob MCP config snippet:
   ```json
   {
     "mcpServers": {
       "mergeable": {
         "command": "node",
         "args": ["dist/index.js"],
         "cwd": "${workspaceFolder}/mcp-server"
       }
     }
   }
   ```
3. Note the `GITHUB_TOKEN` env var for `fetch_changelog` rate-limit avoidance.

**Relevant Context**
- Bob MCP config lives in `~/.bob/mcp_config.json` (or workspace
  `.bob/mcp_config.json`).

---

## File Tree After Implementation

```
mcp-server/
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
└── src/
    ├── index.ts
    └── tools/
        ├── osv_lookup.ts
        ├── osv_lookup.test.ts
        ├── find_usages.ts
        ├── find_usages.test.ts
        ├── fetch_changelog.ts
        ├── fetch_changelog.test.ts
        ├── run_checks.ts
        └── run_checks.test.ts
```
