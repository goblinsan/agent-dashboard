#!/usr/bin/env node
/**
 * dependency-scan.cjs
 * Runs `npm audit --json` (production + dev) and normalizes the output into a concise report:
 * {
 *   generatedAt: epochMs,
 *   advisories: [ { id, module, severity, title, url, vulnerable_versions, recommendation } ],
 *   meta: { total, severities: { low, moderate, high, critical } }
 * }
 * Exits 0 always (report used as artifact, enforcement can happen separately later).
 */

const { execSync } = require('node:child_process');

function runAudit(args = []) {
  try {
    const cmd = ['npm','audit','--json', ...args].join(' ');
    const raw = execSync(cmd, { stdio: 'pipe' }).toString();
    return JSON.parse(raw);
  } catch (e) {
    // npm audit exits non-zero on vulns; still capture stdout
    if (e.stdout) {
      try { return JSON.parse(e.stdout.toString()); } catch { return null; }
    }
    return null;
  }
}

const audit = runAudit();
if (!audit) {
  console.error('Failed to collect audit JSON');
  process.exit(0);
}

// npm v9+ structure: vulnerabilities + metadata; older: advisories map
let advisories = [];
if (audit.advisories) {
  advisories = Object.values(audit.advisories).map(a => ({
    id: a.id,
    module: a.module_name,
    severity: a.severity,
    title: a.title,
    url: a.url,
    vulnerable_versions: a.vulnerable_versions,
    recommendation: a.recommendation || ''
  }));
} else if (audit.vulnerabilities) {
  // Newer format: vulnerabilities keyed by module
  Object.entries(audit.vulnerabilities).forEach(([module, v]) => {
    if (v.via) {
      v.via.forEach(via => {
        if (typeof via === 'string') return; // skip string references
        advisories.push({
          id: via.source || via.id || via.url || module,
            module,
            severity: via.severity || v.severity || 'info',
            title: via.title || via.name || 'N/A',
            url: via.url || '',
            vulnerable_versions: via.range || v.range || 'N/A',
            recommendation: via.fixAvailable ? 'Update available' : ''
        });
      });
    }
  });
}

const severities = { low: 0, moderate: 0, high: 0, critical: 0 };
advisories.forEach(a => {
  if (severities[a.severity] !== undefined) severities[a.severity] += 1;
});

const report = {
  generatedAt: Date.now(),
  advisories: advisories.sort((a,b) => a.severity.localeCompare(b.severity)),
  meta: {
    total: advisories.length,
    severities
  }
};

const fs = require('node:fs');
fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2));
console.log(`Wrote audit-report.json with ${report.meta.total} advisories`);
process.exit(0);
