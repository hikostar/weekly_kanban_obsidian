# ドメインモデル設計 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Domain 層の純粋なモデル

## 1. Purpose

ドメイン層は、Obsidian 依存を持たない純粋な TypeScript モデルとして、Board / Column / Card の変換、検証、整合性維持を担う。

## 2. Core Model

```typescript
type ColumnName = 'ToDo' | 'Doing' | 'Done';

interface Board {
  year: number;
  week: number;
  columns: Column[];
  metadata: Record<string, unknown>;
}

interface Column {
  name: ColumnName;
  cards: Card[];
}

interface Card {
  id: string;
  title: string;
  completed: boolean;
  labels: string[];
  dueDate?: Date;
  notes?: string;
  lineStart: number;
  lineEnd: number;
  rawMetadata: Record<string, string>;
}
```

## 3. Invariants

- Board は 3 列を持つ。
- 各 Card の ID は同一 Board 内で一意である。
- completed は Done 列と整合する。
- labels は順序を保持しつつ重複を許さない。
- lineStart / lineEnd は可逆更新のために保持する。

## 4. Operations

### 4.1 Board Factory

- `createEmptyBoard(year, week)`
- `normalizeBoard(board)`
- `deepCopyBoard(board)`

### 4.2 Column Operations

- `addCard(column, card)`
- `removeCard(column, cardId)`
- `moveCard(columns, cardId, targetColumn, targetIndex)`

### 4.3 Card Operations

- `toggleCompleted(card)`
- `updateCardTitle(card, title)`
- `updateCardLabels(card, labels)`
- `updateCardDueDate(card, dueDate)`

## 5. Validation Rules

- year は 4 桁の正整数。
- week は 1 から 53 の範囲。
- title は空白のみを禁止。
- labels は空文字を許可しない。
- dueDate は有効な日付文字列から生成する。

## 6. Error Model

```typescript
type DomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
```

## 7. Testing Focus

- カード移動と並び順保持。
- 既存メタデータの保持。
- deep copy 時の Date / メタデータ保持。
- invalid input の結果値返却。
