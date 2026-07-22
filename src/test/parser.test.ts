import assert from 'node:assert/strict';
import test from 'node:test';

import { writeMarkdown } from '../parser/kanbanWriter.js';
import { parseMarkdown } from '../parser/markdownParser.js';

const sampleMarkdown = `---
year: 2026
week: 30
created: 2026-07-22
---

# Weekly Tasks

<!-- keep me -->

## ToDo

- [ ] Task 1
  ID: task-1
  Label: feature,urgent
  Due: 2026-07-30

  Note line one
  Note line two

## Doing

## Done
`;

test('parseMarkdown reads weekly board structure', () => {
  const result = parseMarkdown(sampleMarkdown);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.year, 2026);
  assert.equal(result.value.week, 30);
  assert.equal(result.value.columns[0]?.cards[0]?.id, 'task-1');
});

test('writeMarkdown produces a canonical board document', () => {
  const parsed = parseMarkdown(sampleMarkdown);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const written = writeMarkdown(sampleMarkdown, parsed.value);
  assert.equal(written.ok, true);
  if (!written.ok) {
    return;
  }

  assert.match(written.value, /## ToDo/);
  assert.match(written.value, /ID: task-1/);
});

test('round-trip preserves exact original markdown when unchanged', () => {
  const parsed = parseMarkdown(sampleMarkdown);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const written = writeMarkdown(sampleMarkdown, parsed.value);
  assert.equal(written.ok, true);
  if (!written.ok) {
    return;
  }

  assert.equal(written.value, sampleMarkdown);
});

test('parseMarkdown returns timeout error when regex budget is exceeded', () => {
  let tick = 0;
  const result = parseMarkdown(sampleMarkdown, {
    timeoutMs: 250,
    now: () => {
      tick += 300;
      return tick;
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, 'REGEX_TIMEOUT');
});