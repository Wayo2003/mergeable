import * as childProcess from 'child_process';
import { runChecks } from './run_checks';

const JEST_PASS_JSON = JSON.stringify({
  numPassedTests: 5,
  numFailedTests: 0,
  success: true,
  startTime: Date.now(),
  testResults: [
    {
      testResults: [
        { fullName: 'should do A', status: 'passed', failureMessages: [] },
        { fullName: 'should do B', status: 'passed', failureMessages: [] },
        { fullName: 'should do C', status: 'passed', failureMessages: [] },
        { fullName: 'should do D', status: 'passed', failureMessages: [] },
        { fullName: 'should do E', status: 'passed', failureMessages: [] },
      ],
    },
  ],
});

const JEST_FAIL_JSON = JSON.stringify({
  numPassedTests: 2,
  numFailedTests: 1,
  success: false,
  startTime: Date.now(),
  testResults: [
    {
      testResults: [
        { fullName: 'works fine', status: 'passed', failureMessages: [] },
        { fullName: 'also fine', status: 'passed', failureMessages: [] },
        {
          fullName: 'fails badly',
          status: 'failed',
          failureMessages: ['Expected 1 to equal 2.\n  at Object.<anonymous> (foo.test.js:5:14)'],
        },
      ],
    },
  ],
});

// Mock execFile at the module level
jest.mock('child_process');

describe('runChecks', () => {
  const execFileMock = jest.spyOn(childProcess, 'execFile');

  beforeEach(() => {
    execFileMock.mockReset();
  });

  function mockSuccess(stdout: string) {
    execFileMock.mockImplementationOnce((_bin, _args, _opts, cb: unknown) => {
      (cb as (err: null, res: { stdout: string; stderr: string }) => void)(null, { stdout, stderr: '' });
      return {} as childProcess.ChildProcess;
    });
  }

  function mockFailure(stdout: string) {
    execFileMock.mockImplementationOnce((_bin, _args, _opts, cb: unknown) => {
      const err = Object.assign(new Error('jest exit 1'), { stdout, stderr: '', code: 1 });
      (cb as (err: Error) => void)(err);
      return {} as childProcess.ChildProcess;
    });
  }

  it('spawns jest with appropriate binary and options depending on platform', async () => {
    mockSuccess(JEST_PASS_JSON);
    await runChecks({ root: process.cwd() });
    expect(execFileMock).toHaveBeenCalled();
    const [spawnedBin, args, options] = execFileMock.mock.calls[0];
    if (process.platform === 'win32') {
      expect(spawnedBin).toMatch(/jest(\.cmd)?$/);
      expect((options as childProcess.ExecFileOptions).shell).toBe(true);
    }
    expect(args).toEqual(expect.arrayContaining(['--json', '--forceExit']));
  });

  it('returns passed count with no failures when all tests pass', async () => {
    mockSuccess(JEST_PASS_JSON);
    const result = await runChecks({ root: process.cwd() });

    expect(result.passed).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.failures).toHaveLength(0);
    expect(typeof result.durationMs).toBe('number');
  });

  it('returns structured failures when tests fail', async () => {
    mockFailure(JEST_FAIL_JSON);
    const result = await runChecks({ root: process.cwd() });

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].test).toBe('fails badly');
    expect(result.failures[0].message).toMatch(/Expected 1 to equal 2/);
  });

  it('handles jest output that has preamble noise before JSON', async () => {
    const noisy = `DEPRECATION WARNING: something old\n\n${JEST_PASS_JSON}`;
    mockSuccess(noisy);
    const result = await runChecks({ root: process.cwd() });
    expect(result.passed).toBe(5);
  });

  it('returns zeroed result when no JSON in output', async () => {
    mockSuccess('No tests found');
    const result = await runChecks({ root: process.cwd() });
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('throws when root directory does not exist', async () => {
    await expect(runChecks({ root: '/nonexistent/path/xyz' })).rejects.toThrow(
      'Directory not found'
    );
  });
});
