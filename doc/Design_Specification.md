# 設計仕様書 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Weekly Kanban Obsidian Plugin（TypeScript / Obsidian API）

## 1. Architecture Overview

### 1.1 Layer Separation

```text
Obsidian Plugin Layer
  -> Presentation Layer
  -> Sync & Orchestration Layer
  -> Parser Layer
  -> Domain Layer
```

### 1.2 Principles

1. Markdown as truth
2. Reversible parsing
3. One-way dependencies
4. Error as message
5. Asynchronous sync with debounce and throttle

## 2. Domain Model

### 2.1 Markdown Form

```yaml
---
year: 2026
week: 30
created: 2026-07-22
---

# Weekly Tasks

## ToDo

- [ ] Task 1
  ID: task-1
  Label: feature
  Due: 2026-07-30
```

### 2.2 TypeScript Model

```typescript
interface Board {
  year: number;
  week: number;
  columns: Column[];
}

interface Column {
  name: 'ToDo' | 'Doing' | 'Done';
  cards: Card[];
}

interface Card {
  id: string;
  title: string;
  completed: boolean;
  labels: string[];
  dueDate?: Date;
  lineStart: number;
  lineEnd: number;
}
```

`dueDate` は Markdown 上では文字列、ドメイン上では `Date`、UI 伝送時は JSON 文字列として扱う。

## 3. Sync Flow

### 3.1 Markdown → Kanban

1. Vault の modify / create / delete を検知する。
2. SyncEngine が対象ファイルの内容を再読込する。
3. MarkdownParser が Frontmatter とセクションを解析する。
4. Board を生成し、ItemView を更新する。

### 3.2 Kanban → Markdown

1. ItemView または Modal から変更イベントを発行する。
2. SyncEngine が変更をキューに積む。
3. 300ms のデバウンスで変更をまとめる。
4. KanbanWriter が最小差分で Markdown を生成する。
5. Vault.modify で保存し、再同期を行う。

### 3.3 Conflict Policy

- 外部編集と内部編集が競合した場合は Markdown を優先する。
- 競合は Notice で通知し、必要に応じて再読み込みを促す。
- 自動マージは行わない。

## 4. Obsidian Integration

### 4.1 Plugin Responsibilities

- プラグイン初期化時にコマンド、リボン、設定タブ、ビューを登録する。
- 対象ファイル未確定時はファイル選択モーダルを開く。
- 現在の対象ファイルパスと同期状態を保持する。

### 4.2 Presentation Responsibilities

- ItemView は Kanban の常設表示を担当する。
- Modal はカード編集、削除確認モーダル、ファイル選択モーダルを担当する。
- Notice はエラー、同期完了、競合通知を担当する。

### 4.3 File Access

- 読み込みは Vault.read。
- 保存は Vault.modify。
- ファイル存在確認と一覧取得は Vault / metadata cache を使う。

## 5. Event Design

```typescript
type KanbanEvent =
  | { type: 'board-updated'; board: Board }
  | { type: 'card-moved'; cardId: string; targetColumn: Column['name'] }
  | { type: 'card-updated'; cardId: string }
  | { type: 'sync-state'; state: 'idle' | 'syncing' | 'error' | 'conflict'; message?: string };
```

## 6. UI Routing

- コマンドパレット: Open Kanban View / Open Weekly File / Save Weekly File。
- リボン: 対象ファイルが未確定ならファイル選択モーダルを開く。
- ファイルメニュー: 対象 Markdown から Kanban を開く。
- 常設ビュー: 現在の対象ファイルを表示し、カード操作を受け付ける。

## 7. Settings

- 対象フォルダの既定値。
- 週次ファイル命名規則。
- カード ID 生成方式。
- デバウンス時間。
- 表示オプション。

## 8. Non-functional Constraints

- パース 1 秒以内。
- 再描画 200ms 以内。
- 保存同期 500ms 以内。
- 正規表現 250ms 以内で失敗検出。
- WCAG 2.1 AA を満たすキーボード操作とラベル付け。
