export interface OsvVuln {
  id: string;
  aliases: string[];
  severity: string | null;
  fixed_versions: string[];
  summary: string;
}

export interface OsvLookupInput {
  ecosystem: string;
  package: string;
  version: string;
}

export async function osvLookup(input: OsvLookupInput): Promise<OsvVuln[]> {
  const { ecosystem, package: pkg, version } = input;

  const response = await fetch('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      package: { name: pkg, ecosystem },
      version,
    }),
  });

  if (!response.ok) {
    throw new Error(`OSV API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { vulns?: OsvRawVuln[] };
  const vulns = data.vulns ?? [];

  return vulns.map(mapVuln);
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface OsvRawVuln {
  id: string;
  aliases?: string[];
  summary?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    ranges?: Array<{
      type: string;
      events?: Array<{ introduced?: string; fixed?: string }>;
    }>;
  }>;
}

function mapVuln(v: OsvRawVuln): OsvVuln {
  // Collect fixed versions from affected[].ranges[].events[].fixed
  const fixedVersions: string[] = [];
  for (const affected of v.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) fixedVersions.push(event.fixed);
      }
    }
  }

  // Pick highest CVSS score among severity entries
  let severity: string | null = null;
  for (const s of v.severity ?? []) {
    if (severity === null || s.score > severity) {
      severity = s.score;
    }
  }

  return {
    id: v.id,
    aliases: v.aliases ?? [],
    severity,
    fixed_versions: [...new Set(fixedVersions)],
    summary: v.summary ?? '',
  };
}
