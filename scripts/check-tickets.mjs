#!/usr/bin/env node
/**
 * Check every ticket in docs/tickets/ parses into the house format.
 *
 * This repo's PRs are opened by an agent lane, so the thing most worth gating is the shape of what it
 * writes: a ticket the Foundry Studio cannot parse is a ticket that vanishes from the founder's board
 * without anyone being told. Cheap, no dependencies, and it fails loudly.
 *
 * Mirrors the studio's own parser (fountainbridge tools/ticket-parser). Keep them in step: if the
 * studio starts rejecting something, add it here so a PR catches it rather than the board.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/tickets';
const STATUSES = ['todo', 'ready', 'in progress', 'blocked', 'shipped', 'planned'];

const problems = [];
let checked = 0;

for (const name of readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
  const path = join(DIR, name);
  const text = readFileSync(path, 'utf8');
  const fail = (msg) => problems.push(`${path}: ${msg}`);
  checked += 1;

  const title = text.match(/^#\s+(.+)$/m);
  if (!title) fail('no title — the first heading must be `# ID — Title`');
  else if (!/\s[—-]\s/.test(title[1])) fail(`title "${title[1].trim()}" has no id separator (use "ID — Title")`);

  const status = text.match(/\*\*Status:\*\*\s*([A-Za-z ]+?)\s*(?:·|\n|$)/);
  if (!status) fail('no `**Status:**` line — the lane uses it to decide what it may pick up');
  else if (!STATUSES.includes(status[1].trim().toLowerCase()))
    fail(`status "${status[1].trim()}" is not one of: ${STATUSES.join(', ')}`);

  if (!/##\s*Acceptance criteria/i.test(text))
    fail('no `## Acceptance criteria` section — without one, "done" is a matter of opinion');
}

if (problems.length) {
  console.error(`check-tickets: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`check-tickets: ${checked} ticket${checked === 1 ? ' parses' : 's parse'} cleanly.`);
