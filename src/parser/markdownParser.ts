import { createEmptyBoard, normalizeBoard, type Board, type Card, type ColumnName } from '../domain/kanban.js';
import { err, ok, type Result } from '../shared/result.js';

export interface ParseError {
  code: 'INVALID_FRONTMATTER' | 'INVALID_SECTION' | 'INVALID_CARD' | 'UNKNOWN_ERROR';
  message: string;
  line?: number;
  column?: number;
}

type FrontmatterMap = Record<string, string>;

function parseFrontmatter(lines: string[]): Result<{ data: FrontmatterMap; endLine: number }, ParseError> {
  if (lines[0] !== '---') {
    return err({ code: 'INVALID_FRONTMATTER', message: 'frontmatter must start with ---', line: 1 });
  }

  const data: FrontmatterMap = {};
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!;
    if (line === '---') {
      return ok({ data, endLine: lineIndex });
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      return err({ code: 'INVALID_FRONTMATTER', message: `invalid frontmatter line: ${line}`, line: lineIndex + 1 });
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    data[key] = value;
  }

  return err({ code: 'INVALID_FRONTMATTER', message: 'frontmatter is not closed', line: lines.length });
}

function parseDate(value: string): Date | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseCardLines(cardLines: string[], cardStartLine: number): Result<Card, ParseError> {
  const head = cardLines[0]!;
  const match = /^- \[( |x)\] (.+)$/.exec(head);
  if (match === null) {
    return err({ code: 'INVALID_CARD', message: `invalid card line: ${head}`, line: cardStartLine });
  }

  const completed = match[1] === 'x';
  const title = match[2]!.trim();
  const rawMetadata: Record<string, string> = {};
  let id = '';
  let labels: string[] = [];
  let dueDate: Date | undefined;
  let notes: string | undefined;

  for (let index = 1; index < cardLines.length; index += 1) {
    const line = cardLines[index]!.trim();
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      if (notes === undefined) {
        notes = line;
      } else {
        notes = `${notes}\n${line}`;
      }
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    rawMetadata[key] = value;

    if (key === 'ID') {
      id = value;
    } else if (key === 'Label') {
      labels = value.length === 0 ? [] : value.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
    } else if (key === 'Due') {
      dueDate = parseDate(value);
      if (value.length > 0 && dueDate === undefined) {
        return err({ code: 'INVALID_CARD', message: `invalid due date: ${value}`, line: cardStartLine + index });
      }
    }
  }

  if (id.length === 0) {
    return err({ code: 'INVALID_CARD', message: 'card ID is required', line: cardStartLine });
  }

  return ok({
    id,
    title,
    completed,
    labels,
    lineStart: cardStartLine,
    lineEnd: cardStartLine + cardLines.length - 1,
    rawMetadata,
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(notes !== undefined ? { notes } : {}),
  });
}

function parseSectionName(line: string): ColumnName | undefined {
  const trimmed = line.trim();
  if (trimmed === '## ToDo') {
    return 'ToDo';
  }
  if (trimmed === '## Doing') {
    return 'Doing';
  }
  if (trimmed === '## Done') {
    return 'Done';
  }
  return undefined;
}

export function parseMarkdown(text: string): Result<Board, ParseError> {
  try {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || lines[0] !== '---') {
      return err({ code: 'INVALID_FRONTMATTER', message: 'frontmatter missing', line: 1 });
    }

    const frontmatter = parseFrontmatter(lines);
    if (!frontmatter.ok) {
      return frontmatter;
    }

    const year = Number.parseInt(frontmatter.value.data.year ?? '', 10);
    const week = Number.parseInt(frontmatter.value.data.week ?? '', 10);
    const emptyBoard = createEmptyBoard(year, week);
    if (!emptyBoard.ok) {
      return err({ code: 'INVALID_FRONTMATTER', message: emptyBoard.error.message, line: 1 });
    }

    const board = emptyBoard.value;
    board.metadata = { ...frontmatter.value.data };

    const sections = new Map<ColumnName, Card[]>();
    sections.set('ToDo', []);
    sections.set('Doing', []);
    sections.set('Done', []);

    let currentSection: ColumnName | undefined;
    let index = frontmatter.value.endLine + 1;

    while (index < lines.length) {
      const line = lines[index]!;
      const sectionName = parseSectionName(line);
      if (sectionName !== undefined) {
        currentSection = sectionName;
        index += 1;
        continue;
      }

      if (line.trim().length === 0 || line.trim() === '# Weekly Tasks') {
        index += 1;
        continue;
      }

      if (line.startsWith('- [') && currentSection !== undefined) {
        const cardLines = [line];
        let cardEnd = index + 1;
        while (cardEnd < lines.length) {
          const candidate = lines[cardEnd]!;
          if (candidate.startsWith('  ') || candidate.trim().length === 0) {
            if (candidate.trim().length > 0 || cardLines.length > 1) {
              cardLines.push(candidate);
              cardEnd += 1;
              continue;
            }
          }
          break;
        }

        const parsedCard = parseCardLines(cardLines, index + 1);
        if (!parsedCard.ok) {
          return parsedCard;
        }

        sections.get(currentSection)?.push(parsedCard.value);
        index = cardEnd;
        continue;
      }

      if (line.startsWith('## ')) {
        return err({ code: 'INVALID_SECTION', message: `unsupported section: ${line}`, line: index + 1 });
      }

      index += 1;
    }

    board.columns = [
      { name: 'ToDo', cards: sections.get('ToDo') ?? [] },
      { name: 'Doing', cards: sections.get('Doing') ?? [] },
      { name: 'Done', cards: sections.get('Done') ?? [] },
    ];

    const normalized = normalizeBoard(board);
    if (!normalized.ok) {
      return err({ code: 'UNKNOWN_ERROR', message: normalized.error.message });
    }

    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parser error';
    return err({ code: 'UNKNOWN_ERROR', message });
  }
}