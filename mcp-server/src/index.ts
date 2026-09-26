import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { osvLookup } from './tools/osv_lookup.js';
import { findUsages } from './tools/find_usages.js';
import { fetchChangelog } from './tools/fetch_changelog.js';
import { runChecks } from './tools/run_checks.js';

const server = new Server(
  { name: 'mergeable', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ─── Input schemas ────────────────────────────────────────────────────────────

const OsvLookupInput = z.object({
  ecosystem: z.string(),
  package: z.string(),
  version: z.string(),
});

const FindUsagesInput = z.object({
  package: z.string(),
  root: z.string(),
});

const FetchChangelogInput = z.object({
  package: z.string(),
  from: z.string(),
  to: z.string(),
});

const RunChecksInput = z.object({
  root: z.string(),
});

// ─── Tool list ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'osv_lookup',
      description: 'Query the OSV database for vulnerabilities affecting a package version.',
      inputSchema: {
        type: 'object',
        properties: {
          ecosystem: { type: 'string', description: 'e.g. npm' },
          package:   { type: 'string', description: 'Package name' },
          version:   { type: 'string', description: 'Exact version to query' },
        },
        required: ['ecosystem', 'package', 'version'],
      },
    },
    {
      name: 'find_usages',
      description: 'Find every import and member usage of a package in a JS/TS project.',
      inputSchema: {
        type: 'object',
        properties: {
          package: { type: 'string', description: 'Package name to search for' },
          root:    { type: 'string', description: 'Absolute or relative path to the project root' },
        },
        required: ['package', 'root'],
      },
    },
    {
      name: 'fetch_changelog',
      description: 'Fetch release notes for a package between two versions.',
      inputSchema: {
        type: 'object',
        properties: {
          package: { type: 'string' },
          from:    { type: 'string', description: 'Exclusive lower bound version' },
          to:      { type: 'string', description: 'Inclusive upper bound version' },
        },
        required: ['package', 'from', 'to'],
      },
    },
    {
      name: 'run_checks',
      description: 'Run Jest tests in a folder and return structured results.',
      inputSchema: {
        type: 'object',
        properties: {
          root: { type: 'string', description: 'Path to the project root to test' },
        },
        required: ['root'],
      },
    },
  ],
}));

// ─── Tool dispatch ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  switch (name) {
    case 'osv_lookup': {
      const input = OsvLookupInput.parse(args);
      const result = await osvLookup(input);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'find_usages': {
      const input = FindUsagesInput.parse(args);
      const result = await findUsages(input);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'fetch_changelog': {
      const input = FetchChangelogInput.parse(args);
      const result = await fetchChangelog(input);
      return { content: [{ type: 'text', text: result }] };
    }
    case 'run_checks': {
      const input = RunChecksInput.parse(args);
      const result = await runChecks(input);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Mergeable MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
