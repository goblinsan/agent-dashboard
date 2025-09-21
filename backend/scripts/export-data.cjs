#!/usr/bin/env node
/*
 Export current dataset (tasks, bugs, status updates, design notes) to JSON.
 Works in both in-memory (runtime fetch via HTTP) and SQLite modes.

 Usage:
   node scripts/export-data.cjs > snapshot.json
   PERSISTENCE=sqlite node scripts/export-data.cjs --file backend/data/export-$(date +%s).json
*/

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const OUT_ARG_INDEX = process.argv.indexOf('--file');
const outFile = OUT_ARG_INDEX !== -1 ? process.argv[OUT_ARG_INDEX + 1] : null;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let buf = '';
      res.on('data', d => (buf += d));
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  // We start a transient server instance by requiring the app (if not already running) through spawnless import.
  process.env.VITEST = '1'; // suppress startup logs
  const { app } = await import('../src/server.js');
  const port = 0; // ephemeral
  const server = app.listen(port);
  await new Promise(r => server.once('listening', r));
  const actualPort = server.address().port;
  const base = `http://localhost:${actualPort}`;

  // Anonymous register to obtain apiKey
  const apiKey = await (async () => {
    const resp = await fetchJson(`${base}/agents/register`);
    return resp.data.apiKey;
  })();
  const headers = { 'x-api-key': apiKey };

  async function authed(pathname) {
    return new Promise((resolve, reject) => {
      const u = new URL(pathname, base);
      const req = http.request(u, { headers }, res => {
        let body = '';
        res.on('data', d => (body += d));
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      });
      req.on('error', reject); req.end();
    });
  }

  const [tasksRes, bugsRes, suRes, dnRes] = await Promise.all([
    authed('/tasks'),
    authed('/bugs'),
    authed('/status-updates?limit=10000'),
    authed('/design-notes?limit=10000')
  ]);

  const snapshot = {
    meta: { generatedAt: Date.now(), version: 1 },
    tasks: tasksRes.data || [],
    bugs: bugsRes.data || [],
    statusUpdates: suRes.data || [],
    designNotes: dnRes.data || []
  };

  const json = JSON.stringify(snapshot, null, 2);
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, json);
    console.log(`Exported snapshot to ${outFile}`);
  } else {
    process.stdout.write(json + '\n');
  }
  server.close();
}

run().catch(err => {
  console.error('[export] failed', err);
  process.exit(1);
});
