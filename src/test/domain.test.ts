import assert from 'node:assert/strict';
import test from 'node:test';

import { addCard, createEmptyBoard, moveCard, normalizeBoard, toggleCompleted } from '../domain/kanban.js';

test('createEmptyBoard produces canonical three columns', () => {
  const result = createEmptyBoard(2026, 30);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.value.columns.map((column) => column.name), ['ToDo', 'Doing', 'Done']);
});

test('normalizeBoard rejects duplicate card ids', () => {
  const result = normalizeBoard({
    year: 2026,
    week: 30,
    metadata: {},
    columns: [
      {
        name: 'ToDo',
        cards: [
          { id: 'task-1', title: 'A', completed: false, labels: [], lineStart: 1, lineEnd: 4, rawMetadata: {} },
        ],
      },
      {
        name: 'Doing',
        cards: [
          { id: 'task-1', title: 'B', completed: false, labels: [], lineStart: 5, lineEnd: 8, rawMetadata: {} },
        ],
      },
      { name: 'Done', cards: [] },
    ],
  });

  assert.equal(result.ok, false);
});

test('moveCard moves card across columns and marks done state', () => {
  const boardResult = createEmptyBoard(2026, 30);
  assert.equal(boardResult.ok, true);
  if (!boardResult.ok) {
    return;
  }

  const addedResult = addCard(boardResult.value.columns[0]!, {
    id: 'task-1',
    title: 'Task 1',
    completed: false,
    labels: ['feature'],
    lineStart: 1,
    lineEnd: 4,
    rawMetadata: {},
  });
  assert.equal(addedResult.ok, true);
  if (!addedResult.ok) {
    return;
  }

  const movedResult = moveCard(
    [
      addedResult.value,
      { name: 'Doing', cards: [] },
      { name: 'Done', cards: [] },
    ],
    'task-1',
    'Done',
    0,
  );

  assert.equal(movedResult.ok, true);
  if (!movedResult.ok) {
    return;
  }

  assert.equal(movedResult.value[2]?.cards[0]?.completed, true);
});

test('toggleCompleted flips completion state', () => {
  const result = toggleCompleted({
    id: 'task-1',
    title: 'Task 1',
    completed: false,
    labels: [],
    lineStart: 1,
    lineEnd: 4,
    rawMetadata: {},
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.completed, true);
});