# Domain Model - TypeScript Type Definitions

**作成日**: 2026-07-03  
**対象**: `src/domain/` モジュール  
**目的**: Kanban ドメインモデルの型定義と実装ガイドライン

---

## 1. Core Model Hierarchy

```
Board
├─ Column (ToDo, Doing, Done)
│  └─ Card[]
│     ├─ id: string
│     ├─ title: string
│     ├─ completed: boolean
│     ├─ labels: string[]
│     ├─ dueDate?: Date
│     └─ metadata: Map<string, unknown>
└─ metadata: Frontmatter
```

---

## 2. TypeScript Interfaces

### 2.1 Board

```typescript
interface Board {
  /** 年号 (e.g., 2026) */
  year: number;
  
  /** 週番号 (1-53) */
  week: number;
  
  /** 3 つのカラム: ToDo, Doing, Done */
  columns: Column[];
  
  /** Frontmatter メタデータ */
  frontmatter: Frontmatter;
  
  /** 作成タイムスタンプ */
  createdAt: Date;
  
  /** 最終更新タイムスタンプ */
  updatedAt: Date;
}

// Constructor & Factory
class Board {
  static create(year: number, week: number): Board {
    return {
      year,
      week,
      columns: [
        { name: 'ToDo', cards: [] },
        { name: 'Doing', cards: [] },
        { name: 'Done', cards: [] }
      ],
      frontmatter: { metadata: {} },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /** カラムを名前で取得 */
  getColumn(name: ColumnName): Column {
    const col = this.columns.find(c => c.name === name);
    if (!col) throw new Error(`Column ${name} not found`);
    return col;
  }
  
  /** すべてのカードを取得 */
  getAllCards(): Card[] {
    return this.columns.flatMap(col => col.cards);
  }
  
  /** ID でカードを検索 */
  findCard(id: string): Card | undefined {
    return this.getAllCards().find(card => card.id === id);
  }
}
```

### 2.2 Column

```typescript
type ColumnName = 'ToDo' | 'Doing' | 'Done';

interface Column {
  /** カラム名 */
  name: ColumnName;
  
  /** 含まれるカード一覧 */
  cards: Card[];
}

// Helper Methods
namespace Column {
  export function create(name: ColumnName): Column {
    return { name, cards: [] };
  }
  
  export function addCard(col: Column, card: Card): Column {
    return { ...col, cards: [...col.cards, card] };
  }
  
  export function removeCard(col: Column, cardId: string): Column {
    return {
      ...col,
      cards: col.cards.filter(c => c.id !== cardId)
    };
  }
  
  export function moveCardToIndex(
    col: Column,
    cardId: string,
    targetIndex: number
  ): Column {
    const card = col.cards.find(c => c.id === cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    
    const filtered = col.cards.filter(c => c.id !== cardId);
    const newCards = [
      ...filtered.slice(0, targetIndex),
      card,
      ...filtered.slice(targetIndex)
    ];
    
    return { ...col, cards: newCards };
  }
}
```

### 2.3 Card

```typescript
interface Card {
  /** 一意なカード識別子 */
  id: string;
  
  /** カードタイトル */
  title: string;
  
  /** 完了状態 */
  completed: boolean;
  
  /** ラベル一覧 */
  labels: string[];
  
  /** 期限日（オプション） */
  dueDate?: Date;
  
  /** カスタムメタデータ */
  metadata: Map<string, unknown>;
  
  /** パーサーが保持する行番号（Markdown 位置トラッキング） */
  _lineStart?: number;
  _lineEnd?: number;
  
  /** 元のテキスト（可逆性のため） */
  _originalText?: string;
}

// Constructor & Factory
class Card {
  static create(id: string, title: string, options?: {
    completed?: boolean;
    labels?: string[];
    dueDate?: Date;
    metadata?: Record<string, unknown>;
  }): Card {
    return {
      id,
      title,
      completed: options?.completed ?? false,
      labels: options?.labels ?? [],
      dueDate: options?.dueDate,
      metadata: new Map(Object.entries(options?.metadata ?? {}))
    };
  }
  
  /** ラベルを追加 */
  addLabel(label: string): Card {
    if (!this.labels.includes(label)) {
      this.labels.push(label);
    }
    return this;
  }
  
  /** ラベルを削除 */
  removeLabel(label: string): Card {
    this.labels = this.labels.filter(l => l !== label);
    return this;
  }
  
  /** 完了状態を切り替え */
  toggleCompleted(): Card {
    this.completed = !this.completed;
    return this;
  }
  
  /** メタデータを取得 */
  getMetadata(key: string): unknown {
    return this.metadata.get(key);
  }
  
  /** メタデータを設定 */
  setMetadata(key: string, value: unknown): Card {
    this.metadata.set(key, value);
    return this;
  }
}
```

### 2.4 Frontmatter

```typescript
interface Frontmatter {
  /** YAML メタデータ（year, week は Board に別途） */
  metadata: Record<string, unknown>;
}

// 期待されるキー
interface FrontmatterData extends Frontmatter {
  metadata: {
    year: number;
    week: number;
    created?: string;
    [key: string]: unknown;  // 不明なキーも許可
  };
}

class Frontmatter {
  static create(year: number, week: number): Frontmatter {
    return {
      metadata: { year, week, created: new Date().toISOString() }
    };
  }
}
```

---

## 3. Immutability & Builder Pattern

### 3.1 Immutable Operations

```typescript
// ❌ BAD: Direct mutation
board.columns[0].cards[0].title = 'New Title';

// ✅ GOOD: Immutable update
const updatedCard = { ...card, title: 'New Title' };
const updatedColumn = { ...column, cards: column.cards.map(c => 
  c.id === card.id ? updatedCard : c
) };
const updatedBoard = { ...board, columns: board.columns.map(col =>
  col.name === column.name ? updatedColumn : col
) };
```

### 3.2 BoardBuilder（便利メソッド）

```typescript
class BoardBuilder {
  private board: Board;
  
  constructor(board: Board) {
    this.board = JSON.parse(JSON.stringify(board));  // deep copy
  }
  
  addCard(columnName: ColumnName, card: Card): BoardBuilder {
    const column = this.board.getColumn(columnName);
    column.cards.push(card);
    this.board.updatedAt = new Date();
    return this;
  }
  
  removeCard(cardId: string): BoardBuilder {
    for (const column of this.board.columns) {
      const idx = column.cards.findIndex(c => c.id === cardId);
      if (idx >= 0) {
        column.cards.splice(idx, 1);
        break;
      }
    }
    this.board.updatedAt = new Date();
    return this;
  }
  
  moveCard(cardId: string, toColumnName: ColumnName): BoardBuilder {
    const card = this.board.findCard(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    
    // Remove from old column
    for (const column of this.board.columns) {
      column.cards = column.cards.filter(c => c.id !== cardId);
    }
    
    // Add to new column
    const targetColumn = this.board.getColumn(toColumnName);
    targetColumn.cards.push(card);
    
    this.board.updatedAt = new Date();
    return this;
  }
  
  updateCard(cardId: string, updates: Partial<Card>): BoardBuilder {
    const card = this.board.findCard(cardId);
    if (!card) throw new Error(`Card ${cardId} not found`);
    
    Object.assign(card, updates);
    this.board.updatedAt = new Date();
    return this;
  }
  
  build(): Board {
    return this.board;
  }
}

// Usage
const updatedBoard = new BoardBuilder(board)
  .moveCard('task-1', 'Doing')
  .updateCard('task-1', { title: 'Updated Title' })
  .addCard('Done', Card.create('task-5', 'New Task'))
  .build();
```

---

## 4. Validation Rules

### 4.1 Card ID Validation

```typescript
interface CardIdValidator {
  validate(id: string): boolean;
}

class UUIDCardIdValidator implements CardIdValidator {
  validate(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}

class SequentialCardIdValidator implements CardIdValidator {
  validate(id: string): boolean {
    return /^\d{1,10}$/.test(id);
  }
}

class SlugCardIdValidator implements CardIdValidator {
  validate(id: string): boolean {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);
  }
}
```

### 4.2 Board Validation

```typescript
class BoardValidator {
  static validate(board: Board): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check duplicate IDs
    const allCards = board.getAllCards();
    const ids = allCards.map(c => c.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      errors.push(`Duplicate card IDs: ${duplicates.join(', ')}`);
    }
    
    // Check column count
    if (board.columns.length !== 3) {
      errors.push(`Expected 3 columns, got ${board.columns.length}`);
    }
    
    // Check for orphaned cards
    for (const card of allCards) {
      if (!card.id) {
        warnings.push(`Card without ID: "${card.title}"`);
      }
      if (!card.title) {
        warnings.push(`Card without title: ${card.id}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## 5. Serialization / Deserialization

### 5.1 JSON Serialization

```typescript
class BoardSerializer {
  static toJSON(board: Board): string {
    const data = {
      year: board.year,
      week: board.week,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
      columns: board.columns.map(col => ({
        name: col.name,
        cards: col.cards.map(card => ({
          id: card.id,
          title: card.title,
          completed: card.completed,
          labels: card.labels,
          dueDate: card.dueDate?.toISOString(),
          metadata: Object.fromEntries(card.metadata)
        }))
      })),
      frontmatter: board.frontmatter
    };
    return JSON.stringify(data, null, 2);
  }
  
  static fromJSON(json: string): Result<Board> {
    try {
      const data = JSON.parse(json);
      const board: Board = {
        year: data.year,
        week: data.week,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        columns: data.columns.map((col: any) => ({
          name: col.name,
          cards: col.cards.map((card: any) => ({
            id: card.id,
            title: card.title,
            completed: card.completed,
            labels: card.labels,
            dueDate: card.dueDate ? new Date(card.dueDate) : undefined,
            metadata: new Map(Object.entries(card.metadata || {}))
          }))
        })),
        frontmatter: data.frontmatter
      };
      return { ok: true, value: board };
    } catch (e) {
      return {
        ok: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as Error).message }
      };
    }
  }
}
```

---

## 6. Equality & Comparison

### 6.1 Card Equality

```typescript
function cardsEqual(a: Card, b: Card): boolean {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.completed === b.completed &&
    JSON.stringify(a.labels) === JSON.stringify(b.labels) &&
    a.dueDate?.toISOString() === b.dueDate?.toISOString() &&
    JSON.stringify(Array.from(a.metadata)) === JSON.stringify(Array.from(b.metadata))
  );
}
```

### 6.2 Board Diff

```typescript
interface BoardDiff {
  added: Card[];
  removed: Card[];
  moved: { card: Card; from: ColumnName; to: ColumnName }[];
  updated: { card: Card; oldCard: Card }[];
}

function diffBoards(oldBoard: Board, newBoard: Board): BoardDiff {
  const oldCards = new Map(oldBoard.getAllCards().map(c => [c.id, c]));
  const newCards = new Map(newBoard.getAllCards().map(c => [c.id, c]));
  
  const added: Card[] = [];
  const removed: Card[] = [];
  const updated: { card: Card; oldCard: Card }[] = [];
  
  for (const [id, newCard] of newCards) {
    const oldCard = oldCards.get(id);
    if (!oldCard) {
      added.push(newCard);
    } else if (!cardsEqual(oldCard, newCard)) {
      updated.push({ card: newCard, oldCard });
    }
  }
  
  for (const [id, oldCard] of oldCards) {
    if (!newCards.has(id)) {
      removed.push(oldCard);
    }
  }
  
  // TODO: detect moved cards
  const moved: any[] = [];
  
  return { added, removed, moved, updated };
}
```

---

## 7. Usage Examples

### 7.1 基本的な操作

```typescript
import { Board, Card, Column } from './domain';

// 新規ボード作成
const board = Board.create(2026, 27);

// カード作成・追加
const card1 = Card.create('task-1', 'Implement parser', {
  labels: ['feature'],
  dueDate: new Date('2026-07-10')
});
const card2 = Card.create('task-2', 'Write tests', {
  labels: ['testing']
});

new BoardBuilder(board)
  .addCard('ToDo', card1)
  .addCard('ToDo', card2)
  .moveCard('task-1', 'Doing')
  .updateCard('task-2', { completed: true })
  .build();
```

### 7.2 検証と操作

```typescript
// 検証
const validation = BoardValidator.validate(board);
if (!validation.valid) {
  console.error(validation.errors);
}

// 差分検出
const oldBoard = loadBoard();
const newBoard = updateBoard();
const diff = diffBoards(oldBoard, newBoard);
console.log(`Added ${diff.added.length}, Removed ${diff.removed.length}`);
```

---

## 8. File Organization

```
src/domain/
├── board.ts           # Board, Column interfaces + classes
├── card.ts            # Card interface + class
├── frontmatter.ts     # Frontmatter interface + class
├── builder.ts         # BoardBuilder, CardBuilder
├── validation.ts      # BoardValidator, CardIdValidator
├── serialization.ts   # BoardSerializer
├── comparison.ts      # cardsEqual, diffBoards
└── index.ts           # Public exports
```

---

## 9. Performance Considerations

- **Immutability**: Deep copies は重い。必要な部分だけコピー（spread operator）
- **Map 使用**: Card メタデータは Map で O(1) lookup
- **Lazy validation**: validator は必要時のみ呼び出し
- **Index cache**: 大規模ボード用に findCard index キャッシュ予定（Phase 2+）
