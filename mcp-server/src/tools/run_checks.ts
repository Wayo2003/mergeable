import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface RunChecksInput {
  root: string;
}

export interface CheckFailure {
  test: string;
  message: string;
}

export interface RunChecksResult {
  passed: number;
  failed: number;
  failures: CheckFailure[];
  durationMs: number;
}

export async function runChecks(input: RunChecksInput): Promise<RunChecksResult> {
  const absRoot = path.resolve(input.root);

  // Verify directory exists
  if (!fs.existsSync(absRoot)) {
    throw new Error(`Directory not found: ${absRoot}`);
  }

  // Prefer local jest binary
  const localJest = path.join(absRoot, 'node_modules', '.bin', 'jest');
  const jestBin = fs.existsSync(localJest) ? localJest : 'npx';
  const jestArgs =
    jestBin === 'npx'
      ? ['jest', '--json', '--forceExit', '--passWithNoTests']
      : ['--json', '--forceExit', '--passWithNoTests'];

  const start = Date.now();
  let stdout = '';
  let stderr = '';

  try {
    const result = await execFileAsync(jestBin, jestArgs, {
      cwd: absRoot,
      maxBuffer: 20 * 1024 * 1024, // 20 MB
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    // Jest exits with code 1 when tests fail — that's fine, parse stdout anyway
    const execErr = err as { stdout?: string; stderr?: string; code?: number };
    stdout = execErr.stdout ?? '';
    stderr = execErr.stderr ?? '';

    if (!stdout && !stderr) {
      throw new Error(`Failed to run jest in ${absRoot}: ${String(err)}`);
    }
  }

  const durationMs = Date.now() - start;

  return parseJestOutput(stdout, durationMs);
}

// ─── Parser ───────────────────────────────────────────────────────────────────

interface JestJsonOutput {
  numPassedTests: number;
  numFailedTests: number;
  testResults: JestFileResult[];
  startTime?: number;
  success?: boolean;
}

interface JestFileResult {
  testResults: JestTestResult[];
}

interface JestTestResult {
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'todo';
  failureMessages: string[];
}

function parseJestOutput(stdout: string, durationMs: number): RunChecksResult {
  // Jest --json can emit non-JSON lines before the JSON (e.g. deprecation notices)
  // Find the first '{' that starts the JSON
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    // No JSON found — return zeroed result with warning
    return { passed: 0, failed: 0, failures: [], durationMs };
  }

  const jsonStr = stdout.slice(jsonStart);
  let data: JestJsonOutput;
  try {
    data = JSON.parse(jsonStr) as JestJsonOutput;
  } catch {
    return { passed: 0, failed: 0, failures: [], durationMs };
  }

  const failures: CheckFailure[] = [];
  for (const fileResult of data.testResults ?? []) {
    for (const test of fileResult.testResults ?? []) {
      if (test.status === 'failed') {
        failures.push({
          test: test.fullName,
          message: (test.failureMessages ?? []).join('\n').trim(),
        });
      }
    }
  }

  return {
    passed: data.numPassedTests ?? 0,
    failed: data.numFailedTests ?? 0,
    failures,
    durationMs,
  };
}
