# Mergeable MCP Server

A Node 20 + TypeScript [Model Context Protocol](https://modelcontextprotocol.io/) server that gives
IBM Bob 2.0 four tools for automated dependency-upgrade workflows.

## Tools

| Tool | Input | Output |
|---|---|---|
| `osv_lookup` | `{ ecosystem, package, version }` | `OsvVuln[]` — list of vulnerabilities with id, CVE aliases, severity, fixed versions, summary |
| `find_usages` | `{ package, root }` | `UsageEntry[]` — every import and member access (`file`, `line`, `symbol`, `snippet`) |
| `fetch_changelog` | `{ package, from, to }` | Plain-text release notes between two versions |
| `run_checks` | `{ root }` | `{ passed, failed, failures[], durationMs }` |

### `osv_lookup`
Queries `https://api.osv.dev/v1/query`. Returns an empty array when the version is not affected.

### `find_usages`
Parses every `.js` / `.ts` / `.jsx` / `.tsx` file in the project tree (skips `node_modules`) using
`@babel/parser`. Tracks package bindings including one level of aliasing:
- `var app = express()` → tracks `app.*`
- `var router = express.Router()` → tracks `router.*`

Reports call-site symbols enriched with the route path for HTTP-method calls, e.g.
`router.get('/tasks/:id')`.

### `fetch_changelog`
Resolution order for each version in range:
1. GitHub Releases API (repo URL from npm registry metadata)
2. Raw `CHANGELOG.md` / `HISTORY.md` from the default branch
3. npm registry version description as fallback

Set `GITHUB_TOKEN` environment variable to avoid GitHub API rate-limits (60 req/hr unauthenticated).

### `run_checks`
Runs `jest --json --forceExit` using the local `node_modules/.bin/jest` (falls back to `npx jest`).
Parses Jest JSON output regardless of exit code — returns structured failures even when tests fail.

## Prerequisites

- Node ≥ 20
- npm ≥ 9

## Installation

```bash
cd mcp-server
npm install
```

## Build

```bash
npm run build
# Output: dist/index.js
```

## Test

```bash
npm test
```

## IBM Bob MCP config snippet

Add to `~/.bob/mcp_config.json` (or `.bob/mcp_config.json` in the workspace):

```json
{
  "mcpServers": {
    "mergeable": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "${workspaceFolder}/mcp-server",
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

> **Note:** `${workspaceFolder}` is resolved by Bob to the open workspace root.
> `GITHUB_TOKEN` is optional but recommended to avoid GitHub API rate limits.

## Project structure

```
mcp-server/
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
└── src/
    ├── index.ts                    # MCP server entry point
    └── tools/
        ├── osv_lookup.ts           # OSV vulnerability lookup
        ├── osv_lookup.test.ts
        ├── find_usages.ts          # Babel AST-based usage finder
        ├── find_usages.test.ts
        ├── fetch_changelog.ts      # npm + GitHub changelog fetcher
        ├── fetch_changelog.test.ts
        ├── run_checks.ts           # Jest runner
        └── run_checks.test.ts
```
