#!/usr/bin/env node
const path = require('node:path');
try {
  require.resolve('better-sqlite3');
} catch {
  console.log('[migrate-if-present] better-sqlite3 not installed; skipping migrations (in-memory persistence only).');
  process.exit(0);
}
require('./migrate.cjs');
