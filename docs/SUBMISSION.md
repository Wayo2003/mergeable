# Submission texts (copy/paste into lablab.ai)

## Project Title
Mergeable

## Short Description
Dependabot opens the PR. Mergeable makes it mergeable. An IBM Bob 2.0 workflow that turns breaking dependency upgrades and CVE fixes into green, evidence-backed pull requests — in minutes, with a human always in control.

## Long Description — Problem & Solution Statement

**The problem.** Every engineering team has the same graveyard: a queue of red Dependabot pull requests. Bots are great at bumping a version number, but the moment an upgrade contains a breaking change, CI fails and the PR stalls. Someone now has to work out whether the upgrade even matters (is there a CVE? are we exposed?), read a long migration guide, hunt down every affected call site, fix them one by one, re-run the tests and then convince a reviewer it is safe. It is slow, boring and error-prone, so it gets postponed — and known vulnerabilities stay in production because "the upgrade is breaking". Security debt compounds quietly.

**The solution.** Mergeable is a Bob-native upgrade workflow that owns the hard part the bots skip: the migration. Point it at a failing dependency upgrade and it runs a seven-step pipeline:

1. **Triage** — queries the OSV vulnerability database for the current and target versions and maps every real usage of the package with an AST-based scanner.
2. **Read the docs** — ingests the official migration guide (even as a PDF) and extracts a structured list of breaking changes, each with a detection rule and a before/after fix recipe. It keeps only the changes that match real call sites.
3. **Plan** — installs the target version, captures the failing baseline, and writes a change plan: breaking change → file:line → fix, grouped by file with a risk level.
4. **Fix in parallel** — spawns one subagent per file group; each only sees and edits its own slice.
5. **Verify** — runs the test suite; failures go back to the owning subagent (max two retries), and any group that still fails is reverted and reported as residual risk.
6. **Evidence** — generates the Upgrade Dossier: a self-contained HTML report with CVEs closed, tests before/after, every breaking change linked to the exact diff, residual risk and a reviewer checklist.
7. **Human gate** — stops. Nothing is committed or pushed without explicit approval.

**Real result.** On our demo service (an Express 4 REST API with 33 tests), bumping Express 4.17.1 → 5.1.0 crashes the app before a single test can run. Mergeable read the 26-page official migration guide, identified 9 relevant breaking changes out of 33 in the guide, fixed 20 call sites across 3 files, closed 2 CVEs (CVE-2024-43796, CVE-2024-29041) and brought the suite from 0 to 33 passing in 9 minutes 37 seconds — without touching a single test. Every number in the dossier comes from real tool output; the workflow is instructed never to invent data.

**Why it matters.** Mergeable doesn't replace Dependabot or Renovate; it finishes their job. Teams patch vulnerabilities faster, reviewers get an auditable report instead of a mystery diff, and the same mode runs headlessly in GitHub Actions on every Dependabot PR via Bob Shell. The architecture is ecosystem-agnostic (OSV covers npm, PyPI, Maven, Go and more); the hackathon build targets Node.js.

## IBM Bob Usage Statement

IBM Bob 2.0 is both how we built Mergeable and what Mergeable runs on.

**Mergeable is made of Bob primitives.**
- **Custom mode** (`.bob/custom_modes.yaml`): "🩹 Mergeable" is a dedicated mode with its own role, tool groups and seven numbered rule files (`.bob/rules-mergeable/`) that define the pipeline step by step, keeping a visible todo list during every run.
- **MCP server** (`mcp-server/`): four tools Bob calls during a run — `osv_lookup` (OSV vulnerability API), `find_usages` (Babel AST scanner), `fetch_changelog` (npm/GitHub release notes) and `run_checks` (Jest with structured JSON results).
- **Skills** (`.bob/skills/`): `breaking-change-extractor` turns a migration guide into validated JSON; `upgrade-dossier` renders the HTML report and PR body from the run artifacts.
- **Document understanding**: Bob reads the official Express 5 migration guide as a PDF and extracted all 33 documented breaking changes, each with a detection rule and fix recipe.
- **Subagents**: an Explore subagent builds the usage map with its own clean context; General subagents fix each file group in parallel, each restricted to its own files.
- **Permissions as a human gate**: the mode stops before any commit or push and asks for approval.
- **Bob Shell**: a GitHub Actions workflow runs the same mode headlessly with `bob run --mode mergeable` on Dependabot PRs and posts the dossier summary as a PR comment.

**Bob built Mergeable.** Every component was generated with Bob in the IDE, in a sequence of focused tasks (session screenshots in `docs/bob-sessions/`):
1. Agent mode built the demo service (Express 4 API + 33 Jest/Supertest tests).
2. Plan mode designed the MCP server; Agent mode implemented it with 26 unit tests.
3. An end-to-end test on Windows exposed a real bug (`run_checks` couldn't spawn `jest.cmd`); Bob fixed it cross-platform, normalised paths, added tests (28 total) and registered the server in the workspace MCP config.
4. Bob wrote both skills, reading the PDF to produce the Express 4→5 example.
5. Bob authored the custom mode and its seven rule files.
6. Running the mode end to end produced the real result: 0 → 33 tests, 20 call sites fixed, 2 CVEs closed in 9m37s.
7. Bob redesigned the dossier template and built the landing page and CI workflow.

What surprised us most was how well Bob's features compose: the mode orchestrates, the MCP server provides ground truth, skills encode repeatable expertise, and subagents keep context small and work parallel. Mergeable is less "a prompt" and more a reusable piece of engineering infrastructure that lives in the repository, versioned alongside the code it maintains.

## Technology & Category Tags
IBM Bob, MCP, Agents, Security, DevOps, Node.js, GitHub Actions

## Links
- Repository: https://github.com/Wayo2003/mergeable
- Application URL: https://wayo2003.github.io/mergeable/
- Real Upgrade Dossier: https://wayo2003.github.io/mergeable/example-run/dossier.html
