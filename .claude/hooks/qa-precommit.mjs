#!/usr/bin/env node
// QA gate: runs automatically before any `git commit` issued through Claude Code.
// Runs the project's mechanical checks (lint + tests). If any fail, the commit
// is blocked (exit code 2) and the failure is shown so it can be fixed.
//
// Wired in .claude/settings.json as a PreToolUse hook on the Bash tool.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let data = {};
try {
  data = JSON.parse(readStdin() || '{}');
} catch {
  data = {};
}

const command = data?.tool_input?.command || '';

// Only gate real commits — let every other Bash command through untouched.
if (!/\bgit\s+commit\b/.test(command)) {
  process.exit(0);
}

// Can't run checks without dependencies installed — don't falsely block.
if (!existsSync('node_modules')) {
  console.error(
    'QA gate skipped: node_modules not found. Run `npm install` to enable the lint/test gate.'
  );
  process.exit(0);
}

function run(label, cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.error(`QA ✓ ${label} passed`);
    return true;
  } catch (err) {
    const out = `${err.stdout?.toString() || ''}${err.stderr?.toString() || ''}`.trim();
    console.error(`QA ✗ ${label} FAILED\n${out}\n`);
    return false;
  }
}

console.error('Running QA gate before commit (lint + tests)…');

let ok = true;
ok = run('lint', 'npm run lint') && ok;
ok = run('tests', 'npm test') && ok;

if (!ok) {
  console.error(
    '\n⛔ QA gate blocked this commit. Fix the issues above, then commit again.'
  );
  process.exit(2); // exit 2 = block the tool call and show this to Claude
}

console.error('✅ QA gate passed — proceeding with commit.');
process.exit(0);
