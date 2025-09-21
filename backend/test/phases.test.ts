import { describe, it, expect } from 'vitest';
import { InMemoryPhaseRepository } from '../src/repositories/phaseRepository.js';
import { InMemoryProjectRepository } from '../src/repositories/projectRepository.js';

describe('Phases basic behavior (Slice 1)', () => {
  it('creates default phase deterministically when ensured', () => {
    const phaseRepo = new InMemoryPhaseRepository();
    phaseRepo.ensureDefaultPhase('default', 'phase_default');
    const list = phaseRepo.list('default');
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('phase_default');
    expect(list[0].orderIndex).toBe(0);
  });

  it('creates phases with incremental orderIndex', () => {
    const phaseRepo = new InMemoryPhaseRepository();
    phaseRepo.ensureDefaultPhase('p1', 'phase_p1');
    phaseRepo.create({ projectId: 'p1', name: 'Second' });
    const list = phaseRepo.list('p1');
    expect(list.map(p => p.orderIndex)).toEqual([0,1]);
  });

  it('reorder normalizes indices', () => {
    const phaseRepo = new InMemoryPhaseRepository();
    phaseRepo.ensureDefaultPhase('p2', 'phase_p2');
    const a = phaseRepo.create({ projectId: 'p2', name: 'A' });
    const b = phaseRepo.create({ projectId: 'p2', name: 'B' });
    // reverse order
    phaseRepo.reorder([
      { id: a.id, orderIndex: 2 },
      { id: b.id, orderIndex: 1 },
      { id: 'phase_p2', orderIndex: 3 }
    ]);
    const list = phaseRepo.list('p2');
    expect(list.length).toBe(3);
    // after normalization orderIndex should be 0..2 ascending relative to new ordering
    expect(list[0].orderIndex).toBe(0);
    expect(list[1].orderIndex).toBe(1);
    expect(list[2].orderIndex).toBe(2);
  });
});
