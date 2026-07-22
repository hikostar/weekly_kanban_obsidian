import assert from 'node:assert/strict';
import test from 'node:test';

import { applyPendingChanges, createSyncContext, queueKanbanChange, setConflict, shouldFlushPendingChanges } from '../sync/syncEngine.js';

const board = {
  year: 2026,
  week: 30,
  metadata: {},
  columns: [
    { name: 'ToDo' as const, cards: [] },
    { name: 'Doing' as const, cards: [] },
    { name: 'Done' as const, cards: [] },
  ],
};

test('queueKanbanChange appends a pending change', () => {
  const context = createSyncContext(board, 'weekly.md');
  const queued = queueKanbanChange(context, { type: 'card-created', cardId: 'task-1' }, new Date('2026-07-22T00:00:00Z'));

  assert.equal(queued.pendingChanges.length, 1);
});

test('shouldFlushPendingChanges waits for the debounce window', () => {
  const context = createSyncContext(board, 'weekly.md');
  const queued = queueKanbanChange(context, { type: 'card-created', cardId: 'task-1' }, new Date('2026-07-22T00:00:00Z'));

  assert.equal(shouldFlushPendingChanges(queued, new Date('2026-07-22T00:00:00.100Z')), false);
  assert.equal(shouldFlushPendingChanges(queued, new Date('2026-07-22T00:00:00.350Z')), true);
});

test('applyPendingChanges rejects conflict state', () => {
  const context = createSyncContext(board, 'weekly.md');
  const queued = queueKanbanChange(context, { type: 'card-created', cardId: 'task-1' }, new Date('2026-07-22T00:00:00Z'));
  const conflicted = setConflict(queued, 'external markdown update detected');

  const result = applyPendingChanges(conflicted);
  assert.equal(result.ok, false);
});