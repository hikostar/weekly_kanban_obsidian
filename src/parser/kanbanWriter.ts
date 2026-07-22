import type { Board, Card } from '../domain/kanban.js';
import { err, ok, type Result } from '../shared/result.js';

import type { ParseError } from './markdownParser.js';
import { parseMarkdown } from './markdownParser.js';

function sameDate(left: Date | undefined, right: Date | undefined): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return left.getTime() === right.getTime();
}

function sameCard(left: Card, right: Card): boolean {
  if (
    left.id !== right.id ||
    left.title !== right.title ||
    left.completed !== right.completed ||
    left.lineStart !== right.lineStart ||
    left.lineEnd !== right.lineEnd ||
    left.notes !== right.notes
  ) {
    return false;
  }

  if (left.labels.length !== right.labels.length) {
    return false;
  }

  for (let index = 0; index < left.labels.length; index += 1) {
    if (left.labels[index] !== right.labels[index]) {
      return false;
    }
  }

  if (!sameDate(left.dueDate, right.dueDate)) {
    return false;
  }

  const leftKeys = Object.keys(left.rawMetadata);
  const rightKeys = Object.keys(right.rawMetadata);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left.rawMetadata[key] !== right.rawMetadata[key]) {
      return false;
    }
  }

  return true;
}

function sameBoard(left: Board, right: Board): boolean {
  if (left.year !== right.year || left.week !== right.week) {
    return false;
  }

  const leftMetadataKeys = Object.keys(left.metadata);
  const rightMetadataKeys = Object.keys(right.metadata);
  if (leftMetadataKeys.length !== rightMetadataKeys.length) {
    return false;
  }

  for (const key of leftMetadataKeys) {
    if (left.metadata[key] !== right.metadata[key]) {
      return false;
    }
  }

  if (left.columns.length !== right.columns.length) {
    return false;
  }

  for (let columnIndex = 0; columnIndex < left.columns.length; columnIndex += 1) {
    const leftColumn = left.columns[columnIndex]!;
    const rightColumn = right.columns[columnIndex]!;
    if (leftColumn.name !== rightColumn.name || leftColumn.cards.length !== rightColumn.cards.length) {
      return false;
    }

    for (let cardIndex = 0; cardIndex < leftColumn.cards.length; cardIndex += 1) {
      if (!sameCard(leftColumn.cards[cardIndex]!, rightColumn.cards[cardIndex]!)) {
        return false;
      }
    }
  }

  return true;
}

function formatFrontmatter(board: Board): string[] {
  const lines = ['---', `year: ${board.year}`, `week: ${board.week}`];

  for (const [key, value] of Object.entries(board.metadata)) {
    if (key === 'year' || key === 'week') {
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    lines.push(`${key}: ${String(value)}`);
  }

  lines.push('---');
  return lines;
}

function formatCard(card: Card): string[] {
  const lines = [`- [${card.completed ? 'x' : ' '}] ${card.title}`];
  lines.push(`  ID: ${card.id}`);

  if (card.labels.length > 0) {
    lines.push(`  Label: ${card.labels.join(',')}`);
  }

  if (card.dueDate !== undefined) {
    lines.push(`  Due: ${card.dueDate.toISOString().slice(0, 10)}`);
  }

  if (card.notes !== undefined && card.notes.trim().length > 0) {
    for (const noteLine of card.notes.split(/\r?\n/)) {
      lines.push(`  ${noteLine}`);
    }
  }

  for (const [key, value] of Object.entries(card.rawMetadata)) {
    if (key === 'ID' || key === 'Label' || key === 'Due') {
      continue;
    }
    lines.push(`  ${key}: ${value}`);
  }

  return lines;
}

export function writeMarkdown(originalText: string, board: Board): Result<string, ParseError> {
  try {
    const originalParsed = parseMarkdown(originalText);
    if (originalParsed.ok && sameBoard(originalParsed.value, board)) {
      return ok(originalText);
    }

    const lines: string[] = [];
    lines.push(...formatFrontmatter(board));
    lines.push('');
    lines.push('# Weekly Tasks');
    lines.push('');

    for (const column of board.columns) {
      lines.push(`## ${column.name}`);
      lines.push('');

      if (column.cards.length === 0) {
        lines.push('');
        continue;
      }

      for (const card of column.cards) {
        lines.push(...formatCard(card));
        lines.push('');
      }
    }

    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    lines.push('');
    return ok(lines.join('\n'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown writer error';
    return err({ code: 'UNKNOWN_ERROR', message });
  }
}