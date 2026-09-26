import semver from 'semver';

export interface FetchChangelogInput {
  package: string;
  from: string;
  to: string;
}

export async function fetchChangelog(input: FetchChangelogInput): Promise<string> {
  const { package: pkg, from, to } = input;

  // 1. Fetch npm registry metadata
  const regUrl = `https://registry.npmjs.org/${encodeURIComponent(pkg)}`;
  const regRes = await fetch(regUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!regRes.ok) throw new Error(`npm registry error: ${regRes.status} for ${pkg}`);
  const regData = (await regRes.json()) as NpmRegistryData;

  // 2. Find versions in range: > from and <= to
  const allVersions = Object.keys(regData.versions ?? {});
  const inRange = allVersions
    .filter((v) => semver.valid(v) && semver.gt(v, from) && semver.lte(v, to))
    .sort((a, b) => semver.compare(a, b));

  if (inRange.length === 0) {
    return `No versions found between ${from} and ${to} for ${pkg}.`;
  }

  // 3. Resolve GitHub repo
  const repoUrl = resolveGithubRepo(regData);

  const sections: string[] = [];

  for (const version of inRange) {
    let notes: string | null = null;

    if (repoUrl) {
      notes = await tryGithubRelease(repoUrl, version);
    }

    if (!notes && repoUrl) {
      // Try changelog file from repo default branch
      notes = await tryGithubChangelog(repoUrl, version);
    }

    if (!notes) {
      // Fallback: npm description for this version
      const versionMeta = regData.versions?.[version];
      notes = versionMeta?.description ?? `No release notes available for ${version}.`;
    }

    sections.push(`## ${pkg}@${version}\n\n${notes}`);
  }

  return sections.join('\n\n---\n\n');
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface NpmRegistryData {
  name: string;
  repository?: { type: string; url: string };
  versions?: Record<string, { description?: string; repository?: { url: string } }>;
}

interface GithubRelease {
  tag_name: string;
  body?: string;
  name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveGithubRepo(data: NpmRegistryData): string | null {
  const url = data.repository?.url ?? '';
  // git+https://github.com/owner/repo.git  or  https://github.com/owner/repo
  const match = url.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  return match ? match[1] : null; // "owner/repo"
}

async function tryGithubRelease(repo: string, version: string): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mergeable-mcp/1.0',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Try both "v1.2.3" and "1.2.3" tag formats
  for (const tag of [`v${version}`, version]) {
    const url = `https://api.github.com/repos/${repo}/releases/tags/${tag}`;
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const release = (await res.json()) as GithubRelease;
        return release.body ?? release.name ?? null;
      }
    } catch {
      // network error — skip
    }
  }
  return null;
}

async function tryGithubChangelog(repo: string, version: string): Promise<string | null> {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mergeable-mcp/1.0',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };

  // Try common changelog filenames
  const filenames = ['CHANGELOG.md', 'HISTORY.md', 'CHANGELOG', 'CHANGES.md'];
  for (const filename of filenames) {
    const url = `https://api.github.com/repos/${repo}/contents/${filename}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const meta = (await res.json()) as { download_url?: string };
      if (!meta.download_url) continue;

      const raw = await fetch(meta.download_url);
      if (!raw.ok) continue;
      const text = await raw.text();

      // Find section for this version
      const section = extractChangelogSection(text, version);
      if (section) return section;
    } catch {
      // skip
    }
  }
  return null;
}

function extractChangelogSection(text: string, version: string): string | null {
  // Match headings like ## [1.2.3] or ## 1.2.3 or ## v1.2.3
  const escapedVersion = version.replace(/\./g, '\\.');
  const headerPattern = new RegExp(
    `^#{1,3}\\s+(?:v?${escapedVersion}|\\[v?${escapedVersion}\\])`,
    'mi'
  );

  const start = text.search(headerPattern);
  if (start === -1) return null;

  // Find next version heading
  const nextPattern = /^#{1,3}\s+(?:v?\d+\.\d+|\[\d+\.\d+)/m;
  const remainder = text.slice(start + 1);
  const nextMatch = remainder.search(nextPattern);

  const section = nextMatch === -1 ? text.slice(start) : text.slice(start, start + 1 + nextMatch);
  return section.trim();
}
