import { err, ok, type Result } from '../shared/result.js';

export type ColumnName = 'ToDo' | 'Doing' | 'Done';

export interface Board {
  year: number;
  week: number;
  columns: Column[];
  metadata: Record<string, unknown>;
}

export interface Column {
  name: ColumnName;
  cards: Card[];
}

export interface Card {
  id: string;
  title: string;
  completed: boolean;
  labels: string[];
  dueDate?: Date | undefined;
  notes?: string | undefined;
  lineStart: number;
  lineEnd: number;
  rawMetadata: Record<string, string>;
}

export type DomainError = {
  code: string;
  message: string;
};

export type DomainResult<T> = Result<T, DomainError>;

const columnOrder: ColumnName[] = ['ToDo', 'Doing', 'Done'];

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1000 && year <= 9999;
}

function isValidWeek(week: number): boolean {
  return Number.isInteger(week) && week >= 1 && week <= 53;
}

function normalizeLabels(labels: string[]): DomainResult<string[]> {
  const normalized: string[] = [];

  for (const label of labels) {
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      return err({ code: 'INVALID_LABEL', message: 'labels must not contain empty entries' });
    }

    if (!normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
  }

  return ok(normalized);
}

function validateCard(card: Card): DomainResult<Card> {
  if (card.id.trim().length === 0) {
    return err({ code: 'INVALID_CARD_ID', message: 'card id must not be empty' });
  }

  if (card.title.trim().length === 0) {
    return err({ code: 'INVALID_CARD_TITLE', message: 'card title must not be blank' });
  }

  const labelsResult = normalizeLabels(card.labels);
  if (!labelsResult.ok) {
    return labelsResult;
  }

  if (card.dueDate !== undefined && Number.isNaN(card.dueDate.getTime())) {
    return err({ code: 'INVALID_DUE_DATE', message: 'dueDate must be a valid date' });
  }

  return ok({
    ...card,
    title: card.title.trim(),
    labels: labelsResult.value,
  });
}

function createCanonicalColumns(columns?: Column[]): Column[] {
  const sourceColumns = new Map<ColumnName, Card[]>();
  for (const name of columnOrder) {
    sourceColumns.set(name, []);
  }

  for (const column of columns ?? []) {
    if (!sourceColumns.has(column.name)) {
      continue;
    }

    sourceColumns.set(
      column.name,
      column.cards.map((card) => ({
        ...card,
        labels: [...card.labels],
        dueDate: card.dueDate ? new Date(card.dueDate.getTime()) : undefined,
        rawMetadata: { ...card.rawMetadata },
      })),
    );
  }

  return columnOrder.map((name) => ({ name, cards: sourceColumns.get(name) ?? [] }));
}

function cloneBoard(board: Board): Board {
  return {
    year: board.year,
    week: board.week,
    metadata: { ...board.metadata },
    columns: board.columns.map((column) => ({
      name: column.name,
      cards: column.cards.map((card) => ({
        ...card,
        labels: [...card.labels],
        dueDate: card.dueDate ? new Date(card.dueDate.getTime()) : undefined,
        rawMetadata: { ...card.rawMetadata },
      })),
    })),
  };
}

export function createEmptyBoard(year: number, week: number): DomainResult<Board> {
  if (!isValidYear(year)) {
    return err({ code: 'INVALID_YEAR', message: 'year must be a 4-digit integer' });
  }

  if (!isValidWeek(week)) {
    return err({ code: 'INVALID_WEEK', message: 'week must be between 1 and 53' });
  }

  return ok({
    year,
    week,
    metadata: {},
    columns: createCanonicalColumns(),
  });
}

export function normalizeBoard(board: Board): DomainResult<Board> {
  if (!isValidYear(board.year)) {
    return err({ code: 'INVALID_YEAR', message: 'year must be a 4-digit integer' });
  }

  if (!isValidWeek(board.week)) {
    return err({ code: 'INVALID_WEEK', message: 'week must be between 1 and 53' });
  }

  const seenIds = new Set<string>();
  const normalizedColumns = createCanonicalColumns(board.columns);

  for (const column of normalizedColumns) {
    for (let index = 0; index < column.cards.length; index += 1) {
      const validatedCard = validateCard(column.cards[index]!);
      if (!validatedCard.ok) {
        return validatedCard;
      }

      const card = validatedCard.value;
      if (seenIds.has(card.id)) {
        return err({ code: 'DUPLICATE_CARD_ID', message: `duplicate card id: ${card.id}` });
      }

      seenIds.add(card.id);
      column.cards[index] = {
        ...card,
        completed: column.name === 'Done' ? true : card.completed,
      };
    }
  }

  return ok({
    year: board.year,
    week: board.week,
    metadata: { ...board.metadata },
    columns: normalizedColumns,
  });
}

export function deepCopyBoard(board: Board): Board {
  return cloneBoard(board);
}

export function addCard(column: Column, card: Card): DomainResult<Column> {
  const validatedCard = validateCard(card);
  if (!validatedCard.ok) {
    return validatedCard;
  }

  return ok({
    name: column.name,
    cards: [...column.cards, { ...validatedCard.value }],
  });
}

export function removeCard(column: Column, cardId: string): DomainResult<Column> {
  if (cardId.trim().length === 0) {
    return err({ code: 'INVALID_CARD_ID', message: 'card id must not be empty' });
  }

  return ok({
    name: column.name,
    cards: column.cards.filter((card) => card.id !== cardId),
  });
}

export function moveCard(columns: Column[], cardId: string, targetColumn: ColumnName, targetIndex: number): DomainResult<Column[]> {
  if (cardId.trim().length === 0) {
    return err({ code: 'INVALID_CARD_ID', message: 'card id must not be empty' });
  }

  if (!Number.isInteger(targetIndex) || targetIndex < 0) {
    return err({ code: 'INVALID_TARGET_INDEX', message: 'targetIndex must be a non-negative integer' });
  }

  const clonedColumns = createCanonicalColumns(columns);
  let movingCard: Card | undefined;

  for (const column of clonedColumns) {
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index >= 0) {
      movingCard = column.cards.splice(index, 1)[0];
      break;
    }
  }

  if (movingCard === undefined) {
    return err({ code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` });
  }

  const destination = clonedColumns.find((column) => column.name === targetColumn);
  if (destination === undefined) {
    return err({ code: 'INVALID_COLUMN', message: `invalid target column: ${targetColumn}` });
  }

  const normalizedCard = {
    ...movingCard,
    completed: targetColumn === 'Done',
  };

  const insertionIndex = Math.min(targetIndex, destination.cards.length);
  destination.cards = [
    ...destination.cards.slice(0, insertionIndex),
    normalizedCard,
    ...destination.cards.slice(insertionIndex),
  ];

  return ok(clonedColumns);
}

export function toggleCompleted(card: Card): DomainResult<Card> {
  return ok({
    ...card,
    completed: !card.completed,
  });
}

export function updateCardTitle(card: Card, title: string): DomainResult<Card> {
  if (title.trim().length === 0) {
    return err({ code: 'INVALID_CARD_TITLE', message: 'card title must not be blank' });
  }

  return ok({
    ...card,
    title: title.trim(),
  });
}

export function updateCardLabels(card: Card, labels: string[]): DomainResult<Card> {
  const normalizedLabels = normalizeLabels(labels);
  if (!normalizedLabels.ok) {
    return normalizedLabels;
  }

  return ok({
    ...card,
    labels: normalizedLabels.value,
  });
}

export function updateCardDueDate(card: Card, dueDate: Date | undefined): DomainResult<Card> {
  if (dueDate !== undefined && Number.isNaN(dueDate.getTime())) {
    return err({ code: 'INVALID_DUE_DATE', message: 'dueDate must be a valid date' });
  }

  return ok({
    ...card,
    dueDate: dueDate ? new Date(dueDate.getTime()) : undefined,
  });
}