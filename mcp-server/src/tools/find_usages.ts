import * as fs from 'fs';
import * as path from 'path';
import { parse, ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type {
  ImportDeclaration,
  VariableDeclarator,
  MemberExpression,
  CallExpression,
  StringLiteral,
  Function as BabelFunction,
} from '@babel/types';

export interface UsageEntry {
  file: string;
  line: number;
  symbol: string;
  snippet: string;
}

export interface FindUsagesInput {
  package: string;
  root: string;
}

const SUPPORTED_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);
const PARSER_PLUGINS: ParserOptions['plugins'] = ['typescript', 'jsx', 'decorators-legacy'];

// Express HTTP method names
const ROUTE_METHODS = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'del', 'all', 'use',
  'head', 'options', 'connect', 'trace',
]);

export async function findUsages(input: FindUsagesInput): Promise<UsageEntry[]> {
  const { package: pkg, root } = input;
  const absRoot = path.resolve(root);
  const files = collectFiles(absRoot);
  const results: UsageEntry[] = [];

  for (const file of files) {
    try {
      const entries = analyzeFile(file, pkg, absRoot);
      results.push(...entries);
    } catch {
      // Skip files that fail to parse (binary, malformed, etc.)
    }
  }

  return results;
}

// ─── File collection ──────────────────────────────────────────────────────────

function collectFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(full));
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
      result.push(full);
    }
  }

  return result;
}

// ─── Per-file analysis ────────────────────────────────────────────────────────

function analyzeFile(file: string, pkg: string, root: string): UsageEntry[] {
  const src = fs.readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  const relFile = path.relative(root, file);

  let ast;
  try {
    ast = parse(src, {
      sourceType: 'unambiguous',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: PARSER_PLUGINS,
    });
  } catch {
    // Try again as script if module parse fails
    ast = parse(src, {
      sourceType: 'script',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: PARSER_PLUGINS,
    });
  }

  // Track binding names that reference the package or objects derived from it
  // e.g. import express from 'express'  → 'express'
  //      const app = express()           → 'app'
  //      const router = express.Router() → 'router'
  const packageBindings = new Set<string>();

  // Track bindings for request handler parameters (req, res, next)
  // These are the parameters of callbacks passed to route methods
  // e.g. router.get('/path', function(req, res) { ... })
  //       ↑ req and res are Express objects
  const reqBindings = new Set<string>();   // req-like (1st param)
  const resBindings = new Set<string>();   // res-like (2nd param)

  const results: UsageEntry[] = [];

  // First pass: collect direct package import/require bindings
  traverse(ast, {
    // ESM: import express from 'express'
    //      import * as express from 'express'
    //      import { Router } from 'express'
    ImportDeclaration(nodePath: NodePath<ImportDeclaration>) {
      if (nodePath.node.source.value !== pkg) return;
      for (const specifier of nodePath.node.specifiers) {
        packageBindings.add(specifier.local.name);
      }
    },

    // CJS: const express = require('express')
    //      const { Router } = require('express')
    VariableDeclarator(nodePath: NodePath<VariableDeclarator>) {
      const init = nodePath.node.init;
      if (!init) return;
      if (!isRequireCall(init, pkg)) return;

      const id = nodePath.node.id;
      if (id.type === 'Identifier') {
        packageBindings.add(id.name);
      } else if (id.type === 'ObjectPattern') {
        for (const prop of id.properties) {
          if (prop.type === 'ObjectProperty' && prop.value.type === 'Identifier') {
            packageBindings.add(prop.value.name);
          }
        }
      }
    },
  });

  if (packageBindings.size === 0) return [];

  // Second pass: find aliased bindings + route handler params
  traverse(ast, {
    VariableDeclarator(nodePath: NodePath<VariableDeclarator>) {
      const init = nodePath.node.init;
      if (!init) return;
      const id = nodePath.node.id;
      if (id.type !== 'Identifier') return;

      // var app = express()  →  init is CallExpression callee=Identifier(express)
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'Identifier' &&
        packageBindings.has(init.callee.name)
      ) {
        packageBindings.add(id.name);
        return;
      }

      // var router = express.Router()  →  init is CallExpression callee=MemberExpression
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'MemberExpression' &&
        init.callee.object.type === 'Identifier' &&
        packageBindings.has(init.callee.object.name)
      ) {
        packageBindings.add(id.name);
      }
    },

    // Detect route handler callbacks and track their req/res parameters
    // Pattern: <packageBinding>.<routeMethod>(path?, handler)
    // where handler = function(req, res, next?) or arrow (req, res) =>
    CallExpression(nodePath: NodePath<CallExpression>) {
      const callee = nodePath.node.callee;
      if (callee.type !== 'MemberExpression') return;
      if (callee.object.type !== 'Identifier') return;
      if (!packageBindings.has(callee.object.name)) return;

      const methodName =
        callee.property.type === 'Identifier' ? callee.property.name : null;
      if (!methodName || !ROUTE_METHODS.has(methodName)) return;

      // Find function arguments (skip string/non-function args)
      for (const arg of nodePath.node.arguments) {
        if (
          arg.type === 'FunctionExpression' ||
          arg.type === 'ArrowFunctionExpression'
        ) {
          const fn = arg as BabelFunction;
          const params = fn.params;
          // req is first param, res is second
          if (params[0]?.type === 'Identifier') reqBindings.add(params[0].name);
          if (params[1]?.type === 'Identifier') resBindings.add(params[1].name);
        }
      }
    },
  });

  // Third pass: collect MemberExpression usages
  traverse(ast, {
    MemberExpression(nodePath: NodePath<MemberExpression>) {
      const obj = nodePath.node.object;
      const prop = nodePath.node.property;
      if (obj.type !== 'Identifier') return;

      const isPackageBinding = packageBindings.has(obj.name);
      const isReqBinding = reqBindings.has(obj.name);
      const isResBinding = resBindings.has(obj.name);

      if (!isPackageBinding && !isReqBinding && !isResBinding) return;

      const propName =
        prop.type === 'Identifier'
          ? prop.name
          : prop.type === 'StringLiteral'
          ? prop.value
          : null;
      if (!propName) return;

      const lineNum = nodePath.node.loc?.start.line ?? 0;
      const rawLine = lines[lineNum - 1] ?? '';
      const snippet = rawLine.trim().slice(0, 120);

      // Enrich symbol for router.get/post/etc with the path argument
      let symbol = `${obj.name}.${propName}`;
      const parent = nodePath.parent;
      if (
        parent.type === 'CallExpression' &&
        parent.callee === nodePath.node &&
        parent.arguments.length > 0
      ) {
        const firstArg = parent.arguments[0];
        if (firstArg.type === 'StringLiteral') {
          symbol = `${symbol}('${(firstArg as StringLiteral).value}')`;
        }
      }

      results.push({ file: relFile, line: lineNum, symbol, snippet });
    },
  });

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRequireCall(node: unknown, pkg: string): node is CallExpression {
  if (!node || (node as { type?: string }).type !== 'CallExpression') return false;
  const call = node as CallExpression;
  if (call.callee.type !== 'Identifier' || call.callee.name !== 'require') return false;
  if (call.arguments.length === 0) return false;
  const arg = call.arguments[0];
  return arg.type === 'StringLiteral' && arg.value === pkg;
}
