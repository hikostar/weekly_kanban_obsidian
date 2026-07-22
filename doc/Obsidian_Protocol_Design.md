# Obsidian Integration Protocol Design - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Plugin 内イベント連携と Obsidian API の役割分担

## 1. Purpose

Obsidian 版では Plugin 内イベントと Obsidian API のコマンド、ビュー、モーダルを直接用いて連携する。

## 2. Event Types

```typescript
type KanbanEvent =
  | { type: 'board-updated'; board: Board }
  | { type: 'board-loaded'; board: Board; path: string }
  | { type: 'card-created'; cardId: string }
  | { type: 'card-updated'; cardId: string }
  | { type: 'card-moved'; cardId: string; targetColumn: 'ToDo' | 'Doing' | 'Done' }
  | { type: 'card-deleted'; cardId: string }
  | { type: 'sync-state'; state: 'idle' | 'syncing' | 'conflict' | 'error'; message?: string };
```

## 3. Command Surface

- open-kanban-view
- open-weekly-file
- save-weekly-file
- refresh-kanban-view

## 4. API Responsibilities

### 4.1 Vault

- read / modify / create / delete を担当する。
- ファイル一覧の取得を担当する。

### 4.2 Commands

- 起動導線と明示保存を担当する。
- 対象ファイル未確定時は選択モーダルへ誘導する。

### 4.3 Notices

- 同期成功、失敗、競合を伝える。
- 回復可能なエラーは再試行の導線を示す。

### 4.4 Menu and Ribbon

- リボンは Kanban 起動のショートカットにする。
- ファイルメニューは選択中の Markdown に対する起動導線にする。

## 5. Request-Response Guidance

Obsidian では汎用的な request-response より、直接的なコマンド呼び出しとイベント購読を優先する。

```typescript
interface CommandContext {
  path?: string;
  board?: Board;
}
```

## 6. Validation

- 未保存状態から保存状態への遷移。
- 対象ファイル未確定時の選択動作。
- 競合時の Notice 表示。
- コマンドから View への遷移。
