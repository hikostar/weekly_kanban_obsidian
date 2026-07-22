# Sync Engine 設計仕様 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Vault 監視と双方向同期モジュール

## 1. Overview

Sync エンジンは以下を担当する。

1. Vault 変更検知
2. 変更内容の抽出
3. Markdown → Kanban / Kanban → Markdown の同期処理
4. 競合検知と通知
5. 失敗時の復旧

## 2. Architecture

```text
Vault events -> SyncEngine -> Parser / Writer -> ItemView / Notice
```

## 3. File Watching

### 3.1 Event Sources

- Vault の create / modify / delete を監視する。
- 現在の対象ファイルが変更された場合のみ再同期する。
- 外部編集を検出した場合は Markdown を優先する。

### 3.2 Event Model

```typescript
interface FileChangeEvent {
  path: string;
  type: 'modified' | 'deleted' | 'created';
  timestamp: Date;
}
```

## 4. SyncEngine

### 4.1 State

```typescript
type SyncState = 'idle' | 'syncing' | 'conflict' | 'error';

interface SyncContext {
  state: SyncState;
  lastSyncTime: Date;
  error?: Error;
  conflictInfo?: ConflictInfo;
  pendingChanges?: KanbanChangeset;
}
```

### 4.2 Core Interface

```typescript
interface ISyncEngine {
  initialize(path: string): Promise<void>;
  dispose(): Promise<void>;
  queueKanbanChange(changes: KanbanChangeset): void;
  applyPendingChanges(): Promise<Result<void>>;
  getBoard(): Board;
  getSyncState(): SyncContext;
}
```

## 5. Flows

### 5.1 Markdown → Kanban

1. Vault event を受け取る。
2. ファイルを再読込する。
3. Parser で Board を再構築する。
4. ItemView に反映する。

### 5.2 Kanban → Markdown

1. カード移動や編集を受け取る。
2. 変更を queue に積む。
3. 300ms debounce でまとめる。
4. Writer で Markdown を更新する。
5. Vault.modify で保存する。

## 6. Conflict Policy

- 外部更新と内部更新が競合したら Markdown を優先する。
- Notice で通知し、必要なら再読込を促す。
- 自動マージはしない。

## 7. Error Recovery

- 保存失敗時は同期状態を error にする。
- 直前の Board を保持し、再試行可能にする。
- 失敗内容は Notice と内部ログへ送る。

## 8. Performance Goals

- 変更キューの集約は 300ms。
- Markdown 再解析は 500ms 以内の対象に抑える。
- 10MB 解析は 1 秒以内を目標とする。
