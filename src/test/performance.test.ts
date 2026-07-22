import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

import { parseMarkdown } from '../parser/markdownParser.js';
import { writeMarkdown } from '../parser/kanbanWriter.js';

function generateMarkdown(targetBytes: number): string {
  const header = ['---', 'year: 2026', 'week: 30', '---', '', '# Weekly Tasks', '', '## ToDo', ''].join('\n');
  const footer = ['## Doing', '', '## Done', ''].join('\n');

  let counter = 0;
  let body = '';
  while (header.length + body.length + footer.length < targetBytes) {
    body += `- [ ] Performance Task ${counter}\n`;
    body += `  ID: perf-${counter}\n`;
    body += '  Label: perf\n';
    body += '  Due: 2026-07-30\n\n';
    counter += 1;
  }

  return `${header}\n${body}${footer}`;
}

test('NFR-PERF-01: parse 10MB markdown in under 1 second', () => {
  const markdown10mb = generateMarkdown(10 * 1024 * 1024);

  const startedAt = performance.now();
  const parsed = parseMarkdown(markdown10mb, { timeoutMs: 5_000 });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(parsed.ok, true);
  assert.ok(elapsedMs < 1000, `expected parse < 1000ms but got ${elapsedMs.toFixed(2)}ms`);
});

test('NFR-PERF-03: write and parse sync cycle in under 500ms', () => {
  const markdown = generateMarkdown(1024 * 1024);
  const parsed = parseMarkdown(markdown, { timeoutMs: 5_000 });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const startedAt = performance.now();
  const written = writeMarkdown(markdown, parsed.value);
  assert.equal(written.ok, true);
  if (!written.ok) {
    return;
  }

  const reparsed = parseMarkdown(written.value, { timeoutMs: 5_000 });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(reparsed.ok, true);
  assert.ok(elapsedMs < 500, `expected write+parse < 500ms but got ${elapsedMs.toFixed(2)}ms`);
});

test('NFR-PERF-02 proxy: regenerate markdown for 1000 cards in under 200ms', () => {
  const markdown = generateMarkdown(512 * 1024);
  const parsed = parseMarkdown(markdown, { timeoutMs: 5_000 });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const todo = parsed.value.columns.find((column) => column.name === 'ToDo');
  assert.ok(todo);
  if (!todo) {
    return;
  }

  todo.cards = todo.cards.slice(0, 1000);

  const startedAt = performance.now();
  const written = writeMarkdown(markdown, parsed.value);
  const elapsedMs = performance.now() - startedAt;

  assert.equal(written.ok, true);
  assert.ok(elapsedMs < 200, `expected regenerate < 200ms but got ${elapsedMs.toFixed(2)}ms`);
});
