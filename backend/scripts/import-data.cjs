#!/usr/bin/env node
/*
 Import a snapshot produced by export-data.cjs into the current persistence layer.
 NOTE: For now this only performs *inserts* and expects an empty or disposable dataset.
       Use cautiously; no upsert or merge logic yet.

 Usage:
   node scripts/import-data.cjs snapshot.json
   PERSISTENCE=sqlite node scripts/import-data.cjs ./snapshot.json
*/
const fs = require('node:fs');
const path = require('node:path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: import-data.cjs <snapshot.json>');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('Snapshot file not found:', file);
  process.exit(1);
}

async function run() {
  process.env.VITEST = '1'; // suppress logs
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { taskRepo, bugRepo, statusUpdateRepo, designNoteRepo } = await import('../src/server.js');

  // Basic shape validation
  if (!snapshot.tasks || !snapshot.bugs) {
    throw new Error('Snapshot missing required root arrays (tasks, bugs, ...)');
  }

  // Insert tasks
  if (Array.isArray(snapshot.tasks)) {
    for (const t of snapshot.tasks) {
      // Recreate minimal fields via repository create + subsequent save for version/status
      const created = taskRepo.create({ title: t.title, priority: t.priority });
      created.status = t.status; created.version = t.version; created.assignees = t.assignees || []; created.rationaleLog = t.rationaleLog || []; created.priority = t.priority; taskRepo.save(created);
    }
  }

  if (Array.isArray(snapshot.bugs)) {
    for (const b of snapshot.bugs) {
      const created = bugRepo.create({ title: b.title, severity: b.severity, reproSteps: b.reproSteps || ['Imported'], taskId: b.linkedTaskIds && b.linkedTaskIds[0], proposedFix: b.proposedFix });
      created.status = b.status; created.version = b.version; bugRepo.save(created);
    }
  }

  if (Array.isArray(snapshot.statusUpdates)) {
    for (const su of snapshot.statusUpdates) {
      statusUpdateRepo.create({ actor: su.actor || 'import', message: su.message, taskId: su.taskId });
    }
  }

  if (Array.isArray(snapshot.designNotes)) {
    for (const dn of snapshot.designNotes) {
      designNoteRepo.create({ actor: dn.actor || 'import', title: dn.title, context: dn.context, decision: dn.decision, consequences: dn.consequences });
    }
  }

  console.log('Import complete');
}

run().catch(e => { console.error('[import] failed', e); process.exit(1); });
