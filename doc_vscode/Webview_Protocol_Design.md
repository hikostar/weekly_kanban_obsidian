# Webview Message Protocol 定義

**作成日**: 2026-07-03  
**対象**: `src/webview/` モジュール  
**目的**: Extension Host ↔ Webview 間のメッセージ通信プロトコル定義

---

## 1. Overview

Extension Host と Webview 間では、JSON メッセージを使用して双方向通信を行う。

- **Extension → Webview**: `panel.webview.postMessage(message)`
- **Webview → Extension**: `vscode.postMessage(message)`

---

## 2. Message Structure

### 2.1 Base Message Format

```typescript
interface Message {
  /** メッセージタイプ */
  type: string;
  
  /** リクエスト ID（レスポンス関連付けのため） */
  id?: string;
  
  /** ペイロード（型固有の内容） */
  payload?: unknown;
  
  /** エラー情報 */
  error?: {
    code: string;
    message: string;
  };
}
```

### 2.2 Request-Response パターン

```typescript
interface RequestMessage extends Message {
  type: 'request' | string;
  id: string;  // 必須
  payload: unknown;
}

interface ResponseMessage extends Message {
  type: 'response' | string;
  id: string;  // Request の id と一致
  payload?: unknown;
  error?: { code: string; message: string };
}
```

---

## 3. Extension → Webview メッセージ

### 3.1 boardUpdate（ボード全体更新）

**用途**: Markdown が更新されて、Kanban ボード全体を再描画する必要がある

```typescript
interface BoardUpdateMessage extends Message {
  type: 'boardUpdate';
  payload: {
    board: Board;  // Domain model
    reason?: 'markdown-saved' | 'kanban-reset' | 'initial';
  };
}

// 送信例
panel.webview.postMessage({
  type: 'boardUpdate',
  payload: {
    board: syncEngine.getBoard(),
    reason: 'markdown-saved'
  }
});

// Webview 受信例
vscode.addEventListener('message', (event) => {
  if (event.data.type === 'boardUpdate') {
    const board = event.data.payload.board;
    renderKanban(board);
  }
});
```

### 3.2 syncStateChange（同期状態変更）

**用途**: 同期中/成功/失敗の状態をユーザーに表示

```typescript
interface SyncStateChangeMessage extends Message {
  type: 'syncStateChange';
  payload: {
    state: 'idle' | 'syncing' | 'conflict' | 'error';
    message?: string;
    timestamp: string;  // ISO 8601
  };
}

// 送信例
panel.webview.postMessage({
  type: 'syncStateChange',
  payload: {
    state: 'syncing',
    message: 'Applying changes to Markdown...',
    timestamp: new Date().toISOString()
  }
});

// Webview 受信例
if (event.data.type === 'syncStateChange') {
  const state = event.data.payload.state;
  updateStatusBar(state);  // UI 更新
}
```

### 3.3 cardUpdated（カード個別更新）

**用途**: 単一カードの属性を更新（オプション：パフォーマンス最適化）

```typescript
interface CardUpdatedMessage extends Message {
  type: 'cardUpdated';
  payload: {
    cardId: string;
    columnName: 'ToDo' | 'Doing' | 'Done';
    changes: Partial<Card>;  // 変更内容のみ
  };
}

// 送信例（将来の最適化用）
panel.webview.postMessage({
  type: 'cardUpdated',
  payload: {
    cardId: 'task-1',
    columnName: 'Doing',
    changes: { title: 'Updated Title', completed: true }
  }
});
```

### 3.4 error（エラー通知）

**用途**: エラーをユーザーに表示

```typescript
interface ErrorMessage extends Message {
  type: 'error';
  payload: {
    code: string;  // 'PARSE_ERROR' | 'SYNC_ERROR' | ...
    message: string;
    recoverable: boolean;
    details?: unknown;
  };
}

// 送信例
panel.webview.postMessage({
  type: 'error',
  payload: {
    code: 'PARSE_ERROR',
    message: 'Invalid Frontmatter at line 3',
    recoverable: true,
    details: { line: 3, column: 5 }
  }
});
```

### 3.5 notification（一般通知）

**用途**: 情報・警告をユーザーに表示

```typescript
interface NotificationMessage extends Message {
  type: 'notification';
  payload: {
    level: 'info' | 'warning' | 'error';
    message: string;
    action?: {
      label: string;
      command: string;  // コマンド ID
    };
  };
}

// 送信例
panel.webview.postMessage({
  type: 'notification',
  payload: {
    level: 'info',
    message: 'File saved successfully',
    action: {
      label: 'View Changes',
      command: 'weekly-kanban.viewChanges'
    }
  }
});
```

---

## 4. Webview → Extension メッセージ

### 4.1 cardMoved（カード移動）

**用途**: ユーザーがカードをドラッグして別カラムへ移動

```typescript
interface CardMovedMessage extends Message {
  type: 'cardMoved';
  id: string;  // Request ID for response
  payload: {
    cardId: string;
    sourceColumn: 'ToDo' | 'Doing' | 'Done';
    targetColumn: 'ToDo' | 'Doing' | 'Done';
    targetIndex?: number;  // 列内の位置（オプション）
  };
}

// Webview 送信例
vscode.postMessage({
  type: 'cardMoved',
  id: 'req-1',
  payload: {
    cardId: 'task-1',
    sourceColumn: 'ToDo',
    targetColumn: 'Doing'
  }
});

// Extension 受信例
panel.onDidReceiveMessage((message) => {
  if (message.type === 'cardMoved') {
    const changeset = new ChangesetBuilder()
      .moveCard(message.payload.cardId, message.payload.sourceColumn, message.payload.targetColumn)
      .build();
    
    syncEngine.queueKanbanChange(changeset);
    
    // レスポンス送信
    panel.webview.postMessage({
      type: 'cardMoved',  // Same type
      id: message.id,  // Same ID
      payload: { success: true }
    });
  }
});
```

### 4.2 cardToggleComplete（完了状態切り替え）

**用途**: ユーザーがチェックボックスをクリック

```typescript
interface CardToggleCompleteMessage extends Message {
  type: 'cardToggleComplete';
  id: string;
  payload: {
    cardId: string;
    completed: boolean;
  };
}

// Webview 送信例
vscode.postMessage({
  type: 'cardToggleComplete',
  id: 'req-2',
  payload: {
    cardId: 'task-1',
    completed: true
  }
});

// Extension 処理例
const changeset = new ChangesetBuilder()
  .updateCard(message.payload.cardId, { completed: message.payload.completed })
  .build();
syncEngine.queueKanbanChange(changeset);
```

### 4.3 cardTitleChanged（カードタイトル編集）

**用途**: Webview 内でカードタイトルをインライン編集

```typescript
interface CardTitleChangedMessage extends Message {
  type: 'cardTitleChanged';
  id: string;
  payload: {
    cardId: string;
    newTitle: string;
  };
}
```

### 4.4 cardLabelToggled（ラベルトグル）

**用途**: ユーザーがラベルを追加/削除

```typescript
interface CardLabelToggledMessage extends Message {
  type: 'cardLabelToggled';
  id: string;
  payload: {
    cardId: string;
    label: string;
    add: boolean;  // true = add, false = remove
  };
}
```

### 4.5 cardDeleted（カード削除）

**用途**: ユーザーがカード削除確認

```typescript
interface CardDeletedMessage extends Message {
  type: 'cardDeleted';
  id: string;
  payload: {
    cardId: string;
    columnName: 'ToDo' | 'Doing' | 'Done';
  };
}

// Extension 処理例
const changeset = new ChangesetBuilder()
  .deleteCard(message.payload.columnName, message.payload.cardId)
  .build();
syncEngine.queueKanbanChange(changeset);
```

### 4.6 ready（Webview 準備完了）

**用途**: Webview が DOM をロードして準備完了を通知

```typescript
interface ReadyMessage extends Message {
  type: 'ready';
  payload: {
    timestamp: string;
  };
}

// Webview 送信例
window.addEventListener('DOMContentLoaded', () => {
  vscode.postMessage({
    type: 'ready',
    payload: { timestamp: new Date().toISOString() }
  });
});

// Extension 受信例
panel.onDidReceiveMessage((message) => {
  if (message.type === 'ready') {
    // Webview が準備完了 → 初期ボードを送信
    panel.webview.postMessage({
      type: 'boardUpdate',
      payload: { board: syncEngine.getBoard(), reason: 'initial' }
    });
  }
});
```

### 4.7 jumpToMarkdown（Markdown へのジャンプ）

**用途**: カードをクリックして Markdown 内の対応行へジャンプ

```typescript
interface JumpToMarkdownMessage extends Message {
  type: 'jumpToMarkdown';
  id: string;
  payload: {
    cardId: string;
    lineNumber: number;  // 1-indexed
  };
}

// Extension 処理例
panel.onDidReceiveMessage((message) => {
  if (message.type === 'jumpToMarkdown') {
    const { lineNumber } = message.payload;
    const editor = window.activeTextEditor;
    if (editor) {
      const line = editor.document.lineAt(lineNumber - 1);
      editor.selection = new Selection(line.range.start, line.range.start);
      editor.revealRange(line.range);
    }
  }
});
```

---

## 5. Response Format

メッセージに `id` が含まれている場合、Extension は対応する `id` を持つ Response を返す：

```typescript
// Webview Request
vscode.postMessage({
  type: 'cardMoved',
  id: 'req-123',
  payload: { ... }
});

// Extension Response（必須）
panel.webview.postMessage({
  type: 'cardMoved',  // Same type or 'response'
  id: 'req-123',      // Same ID
  payload: { success: true },
  error?: { code: '...', message: '...' }
});

// Webview 受信
vscode.addEventListener('message', (event) => {
  if (event.data.id === 'req-123') {
    if (event.data.error) {
      console.error('Request failed:', event.data.error.message);
    } else {
      console.log('Request succeeded:', event.data.payload);
    }
  }
});
```

---

## 6. Message Channel Architecture

### 6.1 Request-Response Pattern

```
Timeline:

Webview Timeline:
  t0: Post cardMoved (id='1')
  t1: UI locked, show spinner
  t2: [waiting...]
  t5: Receive response (id='1') ✓
  t6: UI unlocked, show result

Extension Timeline:
  t0: Receive cardMoved (id='1')
  t1: Queue changeset
  t2: Return response (id='1')
```

### 6.2 Request Timeout

```typescript
class WebviewMessageHandler {
  private requestTimeouts = new Map<string, NodeJS.Timeout>();
  
  async sendRequest<T>(type: string, payload: unknown, timeoutMs = 5000): Promise<T> {
    const id = generateRequestId();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestTimeouts.delete(id);
        reject(new Error(`Request ${id} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      this.requestTimeouts.set(id, timeout);
      
      panel.webview.postMessage({ type, id, payload });
    });
  }
}
```

---

## 7. Error Handling in Messages

### 7.1 Extension エラー

```typescript
// cardMoved request 失敗例
panel.webview.postMessage({
  type: 'cardMoved',
  id: 'req-123',
  payload: null,
  error: {
    code: 'CARD_NOT_FOUND',
    message: 'Card task-1 not found in ToDo column'
  }
});
```

### 7.2 Webview エラー

```typescript
// Webview で DOM 取得失敗例
vscode.postMessage({
  type: 'error',
  payload: {
    code: 'RENDER_ERROR',
    message: 'Failed to render Kanban board',
    recoverable: true
  }
});
```

---

## 8. Message Type Registry

```typescript
// 完全なメッセージタイプ一覧

// Extension → Webview
type ExtensionToWebviewMessage =
  | BoardUpdateMessage
  | SyncStateChangeMessage
  | CardUpdatedMessage
  | ErrorMessage
  | NotificationMessage;

// Webview → Extension
type WebviewToExtensionMessage =
  | CardMovedMessage
  | CardToggleCompleteMessage
  | CardTitleChangedMessage
  | CardLabelToggledMessage
  | CardDeletedMessage
  | ReadyMessage
  | JumpToMarkdownMessage;

// Union
type Message = ExtensionToWebviewMessage | WebviewToExtensionMessage;
```

---

## 9. Usage Example - Complete Flow

```typescript
// === Extension Side ===

// 1. Webview ハンドラ設定
panel.onDidReceiveMessage((message: Message) => {
  switch (message.type) {
    case 'ready':
      panel.webview.postMessage({
        type: 'boardUpdate',
        payload: { board: syncEngine.getBoard(), reason: 'initial' }
      });
      break;
      
    case 'cardMoved':
      const changeset = new ChangesetBuilder()
        .moveCard(
          message.payload.cardId,
          message.payload.sourceColumn,
          message.payload.targetColumn
        )
        .build();
      syncEngine.queueKanbanChange(changeset);
      
      panel.webview.postMessage({
        type: 'cardMoved',
        id: message.id,
        payload: { success: true }
      });
      break;
  }
});

// 2. Sync エンジンイベントリスナ
syncEngine.onBoardUpdated((board) => {
  panel.webview.postMessage({
    type: 'boardUpdate',
    payload: { board, reason: 'markdown-saved' }
  });
});

syncEngine.onSyncStateChanged(({ state, message }) => {
  panel.webview.postMessage({
    type: 'syncStateChange',
    payload: {
      state,
      message,
      timestamp: new Date().toISOString()
    }
  });
});

// === Webview Side ===

// 1. VS Code メッセージ受信
vscode.addEventListener('message', (event) => {
  const message = event.data;
  
  if (message.type === 'boardUpdate') {
    renderKanban(message.payload.board);
  } else if (message.type === 'syncStateChange') {
    updateStatusBar(message.payload.state);
  }
});

// 2. ドラッグアンドドロップ完了
function onCardDropped(cardId, targetColumn) {
  vscode.postMessage({
    type: 'cardMoved',
    id: generateRequestId(),
    payload: {
      cardId,
      sourceColumn: getCurrentColumn(cardId),
      targetColumn
    }
  });
}

// 3. Webview 準備完了を通知
window.addEventListener('DOMContentLoaded', () => {
  vscode.postMessage({
    type: 'ready',
    payload: { timestamp: new Date().toISOString() }
  });
});
```

---

## 10. Testing Message Protocol

```typescript
describe('Message Protocol', () => {
  it('should handle cardMoved request-response', async () => {
    // Webview sends
    const request: CardMovedMessage = {
      type: 'cardMoved',
      id: 'test-1',
      payload: { ... }
    };
    
    // Extension receives and responds
    handler.onMessage(request);
    
    // Verify response
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'cardMoved',
      id: 'test-1',
      payload: { success: true }
    });
  });
  
  it('should timeout on slow response', async () => {
    // Request takes > 5000ms
    // Should reject
  });
});
```

---

**次のステップ**: Phase 2 完了。Parser API、Domain Model、Sync Engine、Webview Protocol の詳細設計が完成しました。次は Phase 3（MVP 実装）へ進みます。
