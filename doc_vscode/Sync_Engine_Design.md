# Sync Engine 設計仕様

**作成日**: 2026-07-03  
**対象**: `src/sync/` モジュール  
**目的**: Markdown ↔ Kanban 双方向同期エンジン

---

## 1. Overview

Sync エンジンは以下を担当する：

1. **File Watching**: Markdown ファイル変更検知
2. **Change Detection**: 変更内容の抽出（Add/Delete/Move/Update）
3. **Sync Orchestration**: Markdown → Kanban, Kanban → Markdown の同期処理
4. **Conflict Resolution**: 競合検出と通知
5. **Error Recovery**: 同期失敗時の復旧

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────┐
│   FileWatcher            │
│   (monitors .md changes) │
└────────────┬─────────────┘
             │ onFileChanged
             ▼
┌──────────────────────────────────┐
│   SyncEngine (Orchestrator)      │
│ ┌────────────────────────────┐  │
│ │ State Machine              │  │
│ │ - Idle                     │  │
│ │ - Syncing                  │  │
│ │ - Conflict                 │  │
│ │ - Error                    │  │
│ └────────────────────────────┘  │
│                                  │
│ Change Detection & Application  │
│ Debounce/Throttle Management   │
└────────┬──────────────┬──────────┘
         │              │
    ┌────▼──────┐  ┌────▼──────────┐
    │  Parser   │  │ Webview       │
    │ (M↔K)     │  │ (K→M queue)   │
    └───────────┘  └───────────────┘
```

---

## 3. FileWatcher Module

### 3.1 Interface

```typescript
interface IFileWatcher {
  start(fileUri: string): Promise<void>;
  stop(): Promise<void>;
  onFileChanged: Event<FileChangeEvent>;
}

interface FileChangeEvent {
  uri: string;
  type: 'modified' | 'deleted' | 'created';
  timestamp: Date;
}
```

### 3.2 Implementation

```typescript
class FileWatcher implements IFileWatcher {
  private fileUri: string;
  private watcher: FSWatcher | null = null;
  private onFileChangedEmitter = new EventEmitter<FileChangeEvent>();
  
  readonly onFileChanged = this.onFileChangedEmitter.event;
  
  async start(fileUri: string): Promise<void> {
    this.fileUri = fileUri;
    
    // VS Code FileSystemWatcher を使用
    const pattern = new RelativePattern(
      workspace.getWorkspaceFolder(Uri.parse(fileUri))!,
      relative(workspace.getWorkspaceFolder(Uri.parse(fileUri))!.uri.fsPath, fileUri)
    );
    
    this.watcher = workspace.createFileSystemWatcher(pattern);
    
    this.watcher.onDidChange(() => {
      this.onFileChangedEmitter.fire({
        uri: fileUri,
        type: 'modified',
        timestamp: new Date()
      });
    });
    
    this.watcher.onDidCreate(() => {
      this.onFileChangedEmitter.fire({
        uri: fileUri,
        type: 'created',
        timestamp: new Date()
      });
    });
    
    this.watcher.onDidDelete(() => {
      this.onFileChangedEmitter.fire({
        uri: fileUri,
        type: 'deleted',
        timestamp: new Date()
      });
    });
  }
  
  async stop(): Promise<void> {
    this.watcher?.dispose();
  }
}
```

### 3.3 VS Code API 統合

```typescript
// VS Code の onDidChangeTextDocument イベント使用
workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
  if (event.document.uri.fsPath === this.fileUri) {
    this.onFileChangedEmitter.fire({
      uri: event.document.uri.fsPath,
      type: 'modified',
      timestamp: new Date()
    });
  }
});

// ファイル保存イベント（重要）
workspace.onDidSaveTextDocument((document: TextDocument) => {
  if (document.uri.fsPath === this.fileUri) {
    this.onFileChangedEmitter.fire({
      uri: document.uri.fsPath,
      type: 'modified',
      timestamp: new Date()
    });
  }
});
```

---

## 4. SyncEngine - Main Orchestrator

### 4.1 State Machine

```typescript
type SyncState = 'idle' | 'syncing' | 'conflict' | 'error';

interface SyncContext {
  state: SyncState;
  lastSyncTime: Date;
  error?: Error;
  conflictInfo?: ConflictInfo;
  pendingChanges?: KanbanChangeset;
}

interface ConflictInfo {
  markdown: string;      // 最後の同期時点の Markdown
  kanban: Board;         // 最後の同期時点の Board
  currentMarkdown: string;
  currentKanban: Board;
  reason: 'concurrent_edit' | 'external_modification';
}
```

### 4.2 Core Interface

```typescript
interface ISyncEngine {
  initialize(fileUri: string): Promise<void>;
  dispose(): Promise<void>;
  
  // イベント
  onBoardUpdated: Event<Board>;
  onSyncStateChanged: Event<{ state: SyncState; message?: string }>;
  onError: Event<{ error: Error; recoverable: boolean }>;
  
  // Kanban → Markdown 同期
  queueKanbanChange(changes: KanbanChangeset): void;
  applyPendingChanges(): Promise<Result<void>>;
  
  // 現在の状態取得
  getBoard(): Board;
  getSyncState(): SyncContext;
  getLastError(): Error | undefined;
}
```

### 4.3 Implementation

```typescript
class SyncEngine implements ISyncEngine {
  private fileUri: string;
  private fileWatcher: FileWatcher;
  private parser: MarkdownParser;
  private writer: KanbanWriter;
  
  private board: Board;
  private syncContext: SyncContext = {
    state: 'idle',
    lastSyncTime: new Date()
  };
  
  private markdownDebounceTimer: NodeJS.Timeout | null = null;
  private kanbanDebounceTimer: NodeJS.Timeout | null = null;
  
  private pendingKanbanChanges: KanbanChangeset[] = [];
  
  // Event emitters
  private onBoardUpdatedEmitter = new EventEmitter<Board>();
  private onSyncStateChangedEmitter = new EventEmitter<{ state: SyncState; message?: string }>();
  private onErrorEmitter = new EventEmitter<{ error: Error; recoverable: boolean }>();
  
  readonly onBoardUpdated = this.onBoardUpdatedEmitter.event;
  readonly onSyncStateChanged = this.onSyncStateChangedEmitter.event;
  readonly onError = this.onErrorEmitter.event;
  
  async initialize(fileUri: string): Promise<void> {
    this.fileUri = fileUri;
    
    // 1. ファイル初期読み込み
    const content = await this.readFile(fileUri);
    
    // 2. Markdown パース
    const parseResult = this.parser.parse(content);
    if (!parseResult.ok) {
      throw parseResult.error;
    }
    
    this.board = parseResult.value;
    this.setUISyncState('idle', 'Initialized');
    
    // 3. ファイル監視開始
    this.fileWatcher.start(fileUri);
    
    // 4. イベントハンドラ登録
    this.setupFileWatcherHandlers();
  }
  
  private setupFileWatcherHandlers(): void {
    this.fileWatcher.onFileChanged((event: FileChangeEvent) => {
      if (event.type === 'modified') {
        // Markdown 側の変更検知
        this.onMarkdownChanged();
      }
    });
  }
  
  // ========================
  // Markdown → Kanban フロー
  // ========================
  
  private onMarkdownChanged(): void {
    // Throttle: 500ms（連続変更を1回にまとめる）
    if (this.markdownDebounceTimer) {
      clearTimeout(this.markdownDebounceTimer);
    }
    
    this.markdownDebounceTimer = setTimeout(async () => {
      await this.syncMarkdownToKanban();
    }, 500);
  }
  
  private async syncMarkdownToKanban(): Promise<void> {
    try {
      this.setUISyncState('syncing', 'Reading Markdown...');
      
      // 1. ファイル読み込み
      const content = await this.readFile(this.fileUri);
      
      // 2. パース
      const parseResult = this.parser.parse(content);
      if (!parseResult.ok) {
        throw parseResult.error;
      }
      
      const newBoard = parseResult.value;
      
      // 3. 競合チェック（Kanban で未保存変更がないか）
      if (this.pendingKanbanChanges.length > 0) {
        this.handleConflict({
          markdown: content,
          kanban: newBoard,
          currentMarkdown: content,
          currentKanban: this.board,
          reason: 'concurrent_edit'
        });
        return;
      }
      
      // 4. ボード更新
      this.board = newBoard;
      
      // 5. Webview に通知
      this.onBoardUpdatedEmitter.fire(this.board);
      
      this.setUISyncState('idle', 'Synced');
    } catch (error) {
      this.handleSyncError(error as Error, true);
    }
  }
  
  // ========================
  // Kanban → Markdown フロー
  // ========================
  
  queueKanbanChange(changes: KanbanChangeset): void {
    // Kanban での変更をキューし、300ms デバウンス後に自動反映する
    this.pendingKanbanChanges.push(changes);

    if (this.kanbanDebounceTimer) {
      clearTimeout(this.kanbanDebounceTimer);
    }

    this.kanbanDebounceTimer = setTimeout(() => {
      this.kanbanDebounceTimer = null;
      void this.applyPendingChanges();
    }, 300);
  }
  
  async applyPendingChanges(): Promise<Result<void>> {
    if (this.pendingKanbanChanges.length === 0) {
      return { ok: true, value: undefined };
    }
    
    try {
      this.setUISyncState('syncing', 'Applying changes to Markdown...');
      
      // 1. ファイル読み込み
      const originalContent = await this.readFile(this.fileUri);
      
      // 2. 元の Board をパース
      const parseResult = this.parser.parse(originalContent);
      if (!parseResult.ok) {
        throw parseResult.error;
      }
      
      let baseBoard = parseResult.value;
      
      // 3. 全てのペンディング変更を適用
      for (const changeset of this.pendingKanbanChanges) {
        baseBoard = this.applyChangeset(baseBoard, changeset);
      }
      
      // 4. Board → Markdown 変換
      const writeResult = this.writer.write(baseBoard, originalContent);
      if (!writeResult.ok) {
        throw writeResult.error;
      }
      
      const updatedContent = writeResult.value;
      
      // 5. ファイル書き込み
      await this.writeFile(this.fileUri, updatedContent);
      
      // 6. 変更をクリア
      this.pendingKanbanChanges = [];
      this.board = baseBoard;
      
      this.setUISyncState('idle', 'Changes applied');
      return { ok: true, value: undefined };
    } catch (error) {
      this.handleSyncError(error as Error, true);
      return { ok: false, error: error as Error };
    }
  }
  
  private applyChangeset(board: Board, changeset: KanbanChangeset): Board {
    let result = BoardFactory.deepCopy(board);  // Date/Map を壊さない deep copy
    
    // Delete
    for (const del of changeset.deleted) {
      const col = result.columns.find((c: any) => c.name === del.columnName);
      col.cards = col.cards.filter((c: any) => c.id !== del.cardId);
    }
    
    // Add
    for (const add of changeset.added) {
      const col = result.columns.find((c: any) => c.name === add.columnName);
      col.cards.push(add.card);
    }
    
    // Move
    for (const move of changeset.moved) {
      // Find card
      let card = null;
      for (const col of result.columns) {
        card = col.cards.find((c: any) => c.id === move.cardId);
        if (card) break;
      }
      
      if (card) {
        // Remove from old column
        for (const col of result.columns) {
          col.cards = col.cards.filter((c: any) => c.id !== move.cardId);
        }
        
        // Add to new column
        const targetCol = result.columns.find((c: any) => c.name === move.targetColumn);
        targetCol.cards.push(card);
      }
    }
    
    // Update
    for (const upd of changeset.updated) {
      const card = result
        .columns.flatMap((c: any) => c.cards)
        .find((c: any) => c.id === upd.cardId);
      
      if (card) {
        Object.assign(card, upd.changes);
      }
    }
    
    result.updatedAt = new Date();
    return result;
  }
  
  // ========================
  // 競合・エラー処理
  // ========================
  
  private handleConflict(conflictInfo: ConflictInfo): void {
    this.syncContext.state = 'conflict';
    this.syncContext.conflictInfo = conflictInfo;
    
    this.onSyncStateChangedEmitter.fire({
      state: 'conflict',
      message: 'File was modified externally. Markdown wins. Kanban changes discarded.'
    });
    
    // Markdown を正本とする（Kanban 変更は破棄）
    this.pendingKanbanChanges = [];
    this.board = conflictInfo.kanban;
    this.onBoardUpdatedEmitter.fire(this.board);
    
    this.setUISyncState('idle', 'Conflict resolved: Markdown is source of truth');
  }
  
  private handleSyncError(error: Error, recoverable: boolean): void {
    this.syncContext.state = 'error';
    this.syncContext.error = error;
    
    this.onErrorEmitter.fire({ error, recoverable });
    this.setUISyncState('error', `Sync error: ${error.message}`);
  }
  
  // ========================
  // ユーティリティ
  // ========================
  
  private setUISyncState(state: SyncState, message?: string): void {
    this.syncContext.state = state;
    this.syncContext.lastSyncTime = new Date();
    this.onSyncStateChangedEmitter.fire({ state, message });
  }
  
  private async readFile(fileUri: string): Promise<string> {
    const uri = Uri.parse(fileUri);
    const content = await workspace.fs.readFile(uri);
    return new TextDecoder().decode(content);
  }
  
  private async writeFile(fileUri: string, content: string): Promise<void> {
    const uri = Uri.parse(fileUri);
    const data = new TextEncoder().encode(content);
    await workspace.fs.writeFile(uri, data);
  }
  
  getBoard(): Board {
    return this.board;
  }
  
  getSyncState(): SyncContext {
    return this.syncContext;
  }
  
  getLastError(): Error | undefined {
    return this.syncContext.error;
  }
  
  async dispose(): Promise<void> {
    await this.fileWatcher.stop();
    if (this.markdownDebounceTimer) clearTimeout(this.markdownDebounceTimer);
    if (this.kanbanDebounceTimer) clearTimeout(this.kanbanDebounceTimer);
  }
}
```

---

## 5. Changeset Type Definition

```typescript
interface KanbanChangeset {
  timestamp: Date;
  changes: {
    added?: { columnName: ColumnName; card: Card }[];
    deleted?: { columnName: ColumnName; cardId: string }[];
    moved?: { cardId: string; from: ColumnName; to: ColumnName }[];
    updated?: { cardId: string; changes: Partial<Card> }[];
  };
}

// Builder
class ChangesetBuilder {
  private changeset: KanbanChangeset = {
    timestamp: new Date(),
    changes: {}
  };
  
  addCard(columnName: ColumnName, card: Card): ChangesetBuilder {
    if (!this.changeset.changes.added) this.changeset.changes.added = [];
    this.changeset.changes.added.push({ columnName, card });
    return this;
  }
  
  deleteCard(columnName: ColumnName, cardId: string): ChangesetBuilder {
    if (!this.changeset.changes.deleted) this.changeset.changes.deleted = [];
    this.changeset.changes.deleted.push({ columnName, cardId });
    return this;
  }
  
  moveCard(cardId: string, from: ColumnName, to: ColumnName): ChangesetBuilder {
    if (!this.changeset.changes.moved) this.changeset.changes.moved = [];
    this.changeset.changes.moved.push({ cardId, from, to });
    return this;
  }
  
  updateCard(cardId: string, changes: Partial<Card>): ChangesetBuilder {
    if (!this.changeset.changes.updated) this.changeset.changes.updated = [];
    this.changeset.changes.updated.push({ cardId, changes });
    return this;
  }
  
  build(): KanbanChangeset {
    return this.changeset;
  }
}
```

---

## 6. Timing & Debouncing

| イベント | Debounce/Throttle | 理由 |
|---------|-------------------|------|
| Markdown 変更（ユーザー編集） | Throttle 500ms | 連続編集をまとめる |
| ファイル保存（save イベント） | なし | 即座に同期 |
| Kanban 変更（ユーザー操作） | Debounce 300ms | 高速ドラッグや連続編集をまとめ、自動で applyPendingChanges() を呼ぶ |
| 保存実行（Ctrl+S） | なし | 即座に Kanban 変更を反映 |

補足:

- `Board` には `Date` や `Map` を含むため、`JSON.parse(JSON.stringify(board))` による複製は使用しない
- Board 複製には `BoardFactory.deepCopy()` のような型保持前提の実装を用いる

---

## 7. Error Recovery Strategy

| エラー | 原因 | 復旧方法 |
|-------|------|--------|
| ENOENT | ファイル削除 | ユーザーに通知、監視停止 |
| EACCES | 権限不足 | ユーザーに通知、再試行 |
| Parse Error | 形式不正 | エラー内容表示、Markdown 優先 |
| Concurrent Edit | 外部編集 + Kanban 編集 | Markdown 優先、Kanban 変更破棄 |

---

## 8. Testing Strategy

```typescript
describe('SyncEngine', () => {
  it('should sync Markdown changes to Kanban', async () => {
    // Given: FileWatcher triggers change event
    // When: File content updated with new card
    // Then: Board updated, onBoardUpdated emitted
  });
  
  it('should apply Kanban changes to Markdown on save', async () => {
    // Given: Kanban changeset queued
    // When: applyPendingChanges() called
    // Then: File updated with new Markdown
  });
  
  it('should handle concurrent edits (Markdown wins)', async () => {
    // Given: Markdown edited externally
    // And: Kanban changes queued
    // When: Markdown change detected
    // Then: Markdown applied, Kanban changes discarded
  });
});
```
