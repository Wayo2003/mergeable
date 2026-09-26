import { fetchChangelog } from './fetch_changelog';

const NPM_REGISTRY_RESPONSE = {
  name: 'express',
  repository: { type: 'git', url: 'git+https://github.com/expressjs/express.git' },
  versions: {
    '4.18.0': { description: 'Fast, unopinionated, minimalist web framework' },
    '4.19.0': { description: 'Fast, unopinionated, minimalist web framework' },
    '5.0.0':  { description: 'Express 5' },
  },
};

const GITHUB_RELEASE_4_18: { tag_name: string; body: string } = {
  tag_name: 'v4.18.0',
  body: '### 4.18.0\n- Added trust proxy improvements\n- Fixed res.redirect',
};

const GITHUB_RELEASE_4_19: { tag_name: string; body: string } = {
  tag_name: 'v4.19.0',
  body: '### 4.19.0\n- Security fix for open redirect',
};

function makeFetchMock(responses: Record<string, unknown>) {
  return jest.fn(async (url: string | URL | Request) => {
    const urlStr = url.toString();
    for (const [key, val] of Object.entries(responses)) {
      if (urlStr.includes(key)) {
        return { ok: true, status: 200, json: async () => val, text: async () => JSON.stringify(val) } as Response;
      }
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as Response;
  });
}

describe('fetchChangelog', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns concatenated release notes for versions in range', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      makeFetchMock({
        'registry.npmjs.org': NPM_REGISTRY_RESPONSE,
        'releases/tags/v4.18.0': GITHUB_RELEASE_4_18,
        'releases/tags/v4.19.0': GITHUB_RELEASE_4_19,
      })
    );

    const result = await fetchChangelog({ package: 'express', from: '4.17.3', to: '4.19.0' });

    expect(result).toContain('4.18.0');
    expect(result).toContain('4.19.0');
    expect(result).toContain('trust proxy');
  });

  it('returns "no versions found" message when range is empty', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      makeFetchMock({ 'registry.npmjs.org': NPM_REGISTRY_RESPONSE })
    );

    const result = await fetchChangelog({ package: 'express', from: '5.0.0', to: '5.0.0' });
    expect(result).toMatch(/no versions found/i);
  });

  it('falls back to npm description when GitHub returns 404', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      makeFetchMock({ 'registry.npmjs.org': NPM_REGISTRY_RESPONSE })
    );

    const result = await fetchChangelog({ package: 'express', from: '4.17.3', to: '4.18.0' });
    expect(result).toContain('4.18.0');
    expect(result).toContain('Fast, unopinionated');
  });

  it('throws when npm registry returns error', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: false, status: 404, statusText: 'Not Found',
      json: async () => ({}),
    } as Response));

    await expect(fetchChangelog({ package: 'nonexistent-pkg-xyz', from: '1.0.0', to: '2.0.0' }))
      .rejects.toThrow('npm registry error');
  });
});
