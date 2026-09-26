import { osvLookup } from './osv_lookup';

const MOCK_OSV_RESPONSE = {
  vulns: [
    {
      id: 'GHSA-rv95-896h-c2vc',
      aliases: ['CVE-2022-24999'],
      summary: 'qs before 6.10.3 allows prototype poisoning',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' }],
      affected: [
        {
          ranges: [
            {
              type: 'SEMVER',
              events: [{ introduced: '0' }, { fixed: '6.10.3' }],
            },
          ],
        },
      ],
    },
  ],
};

describe('osv_lookup', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, _opts) => {
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_OSV_RESPONSE,
      } as Response;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns mapped vulns for a vulnerable version', async () => {
    const result = await osvLookup({ ecosystem: 'npm', package: 'qs', version: '6.5.2' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('GHSA-rv95-896h-c2vc');
    expect(result[0].aliases).toContain('CVE-2022-24999');
    expect(result[0].fixed_versions).toContain('6.10.3');
    expect(result[0].severity).not.toBeNull();
    expect(result[0].summary).toMatch(/qs/i);
  });

  it('returns empty array when no vulns found', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ vulns: [] }),
    } as Response));

    const result = await osvLookup({ ecosystem: 'npm', package: 'qs', version: '6.11.0' });
    expect(result).toEqual([]);
  });

  it('returns empty array when vulns field is absent', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response));

    const result = await osvLookup({ ecosystem: 'npm', package: 'safe-pkg', version: '1.0.0' });
    expect(result).toEqual([]);
  });

  it('throws on HTTP error', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    } as Response));

    await expect(osvLookup({ ecosystem: 'npm', package: 'x', version: '1.0.0' })).rejects.toThrow(
      'OSV API error: 500'
    );
  });

  it('POSTs the correct request body', async () => {
    let capturedBody: unknown;
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(async (_url, opts) => {
      capturedBody = JSON.parse((opts as RequestInit).body as string);
      return { ok: true, status: 200, json: async () => ({ vulns: [] }) } as Response;
    });

    await osvLookup({ ecosystem: 'npm', package: 'express', version: '4.17.1' });

    expect(capturedBody).toEqual({
      package: { name: 'express', ecosystem: 'npm' },
      version: '4.17.1',
    });
  });
});
