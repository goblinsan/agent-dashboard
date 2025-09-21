#!/usr/bin/env node
/* Script: publish-openapi.cjs
 * Copies openapi.yaml into dist/ and also writes a versioned filename (openapi-v{version}.yaml)
 * Assumes backend/package.json version reflects API version (patch increments allowed without breaking changes).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const specSrc = path.join(root, 'openapi.yaml');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(specSrc)) {
  console.error('openapi.yaml not found at', specSrc);
  process.exit(1);
}
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const version = pkg.version.replace(/[^0-9.]/g, '');
const destStandard = path.join(distDir, 'openapi.yaml');
const destVersioned = path.join(distDir, `openapi-v${version}.yaml`);

try {
  fs.copyFileSync(specSrc, destStandard);
  fs.copyFileSync(specSrc, destVersioned);
  console.log('Published OpenAPI spec to:');
  console.log(' -', destStandard);
  console.log(' -', destVersioned);
} catch (e) {
  console.error('Failed to publish OpenAPI spec:', e);
  process.exit(1);
}
