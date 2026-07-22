# 設計仕様書 - Weekly Kanban Markdown Sync Extension

作成日: 2026-07-02  
対象: Weekly Kanban VS Code Extension（TypeScript）  

## 1. アーキテクチャ概要

### 1.1 層の分離

```
┌─────────────────────────────────────────┐
│   VS Code Extension API Layer           │
│   （VS Code 拡張 API 層）               │
│   (extension.ts, commands, events)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Presentation Layer（表示層）          │
│   - WebviewPanel（Kanban UI）           │
│   - エラー通知（via VS Code）           │
│   - コマンドハンドラー                  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Sync & Orchestration Layer            │
│   （同期・オーケストレーション層）      │
│   - FileWatcher（Markdown 監視）        │
│   - SyncEngine（双方向同期）            │
│   - 変更検知と反映                      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Parser Layer（パーサー層）            │
│   - MarkdownParser（M→K 変換）          │
│   - KanbanWriter（K→M 可逆変換）        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Domain Layer（ドメイン層）            │
│   （外部依存なし）                      │
│   - Board, Column, Card モデル          │
│   - Markdown AST 構造                   │
│   - ビジネスロジック（純関数）          │
└─────────────────────────────────────────┘
```

### 1.2 主要原則

1. **Markdown as Truth**: Markdown ファイルを唯一の正とする
2. **Reversible Parsing**: コメント、不明な YAML、空白を保持する
3. **One-Way Dependencies**: 上位層は下位層に依存し、逆方向依存は持たない
4. **Error-as-Message**: 不正入力でも例外を投げず、StatusMessage を返す
5. **Asynchronous Sync**: デバウンスとスロットリングで競合状態を防ぐ

---

## 2. データモデル

### 2.1 Markdown 形式

```yaml
---
year: 2026
week: 27
created: 2026-07-02
---

# 週間タスク (27/2026)

## ToDo

- [ ] タスク 1
  ID: task-1
  Label: feature
  Due: 2026-07-10

- [ ] タスク 2
  ID: task-2
  Label: bugfix

## Doing

- [ ] 進行中のタスク
  ID: task-3
  Label: feature

## Done

- [x] 完了したタスク
  ID: task-4
  Label: feature
```

### 2.2 ドメインモデル（TypeScript）

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

interface MarkdownAST {
  frontmatter: Record<string, any>;
  sections: Section[];
}

interface Section {
  title: string;
  startLine: number;
  endLine: number;
  items: MarkdownItem[];
}

interface MarkdownItem {
  text: string;
  checked: boolean;
  metadata: Record<string, string>;
  startLine: number;
}
```

`dueDate` は層ごとに次の形式を取る。

- Markdown 上: `Due: YYYY-MM-DD`
- ドメインモデル上: `Date`
- Webview/メッセージ伝送上: JSON シリアライズにより文字列化されうる

このため、Board 複製時に `JSON.parse(JSON.stringify(board))` を使うと `Date` が文字列へ崩れる。複製は `BoardFactory.deepCopy()` のような型保持前提の手段を使う。

---

## 3. 同期フロー

### 3.1 Markdown → Kanban（読み込み経路）

```
1. ファイル保存イベント
   ↓
2. FileWatcher が変更を検知
   ↓
3. SyncEngine.onMarkdownChanged()
   ↓
4. MarkdownParser.parse(fileContent)
  ├─ Frontmatter を抽出
  ├─ セクション見出し（ToDo, Doing, Done）で分割
  ├─ カードメタデータ（ID, labels, due date）を抽出
  └─ Board モデルを構築
   ↓
5. WebviewPanel.updateBoard(board)
  ├─ カラムを描画
  ├─ カードを描画
  └─ ステータスバーを更新
```

**遅延目標**: 解析 + 描画 < 200ms

### 3.2 Kanban → Markdown（書き込み経路）

```
1. ユーザーが Webview 上でカードをドラッグ
   ↓
2. Webview が変更メッセージを送信
   ├─ source: 'kanban'
   ├─ cardId: 'task-1'
   ├─ targetColumn: 'Doing'
   └─ action: 'move'
   ↓
3. SyncEngine.queueKanbanChange()
  ├─ 変更が安全か検証（ファイル編集と競合しないこと）
  └─ changeset をデバウンス用キューへ追加
   ↓
4. 300ms のデバウンスウィンドウ
  └─ 連続したカード移動や編集を集約
   ↓
5. SyncEngine.applyPendingChanges()
  ├─ 現在の Markdown を再読込
  ├─ キュー済みの変更を Board に反映
  ├─ Date/Map フィールドを型安全に deep copy
  └─ KanbanWriter で Markdown テキストを生成
  ↓
6. 拡張機能がファイルを更新
   ├─ vscode.workspace.fs.writeFile()
  ├─ ファイル変更検知を発火
  └─ ステータスバーで通知
  ↓
7. FileWatcher + 500ms スロットル
  └─ ファイルを再パースして Webview を更新
```

**遅延目標**: 変更セット生成 + 書き込み < 500ms

### 3.3 デバウンスとスロットリング

- **Kanban → Markdown**: デバウンス 300ms（連続するカード移動を集約）
- **Markdown → Kanban**: スロットル 500ms（大量編集時の過剰な再描画を防止）
- **明示的な保存コマンド**: `Save Weekly File` でキュー済み Kanban 変更を即時反映できる
- **競合検知**: 両ソースが同時に編集された場合は Markdown を優先し、ユーザーへ通知する

---

## 4. Webview アーキテクチャ

### 4.1 構成

```
Webview（分離されたコンテキスト）
├─ HTML: Board レイアウト、カラム、カード
├─ CSS: スタイル、ドラッグ&ドロップの視覚フィードバック
└─ JavaScript: イベントハンドラー、ドラッグ&ドロップロジック

↔（メッセージ受け渡し）

Extension Host（拡張ホスト）
├─ vscode.postMessage() ← Webview
├─ panel.onDidReceiveMessage() → Extension
└─ 同期ロジックとファイル操作
```

UI 上では、Kanban パネルのタイトルとステータスバーのツールチップに現在対象の Markdown ファイル名を表示し、複数の `weekly-*.md` が存在するワークスペースでも対象ファイルを識別できるようにする。

### 4.3 起動導線（Entry Points）

Kanban ビューを開く導線は、コマンドパレットに加えて次の 2 経路を追加する。いずれも最終的に既存の `openKanbanView()`（`src/extension.ts`）を呼び出し、Webview パネルの生成・表示ロジックは共通化する。

1. **Markdown 右クリックメニュー**
   - `package.json` の `contributes.menus.explorer/context` に `weekly-kanban.openKanban` を登録する。
   - `when` 句は `resourceExtname == .md` かつファイル名が `weekly-*.md` パターンに一致する場合に限定し、無関係な Markdown での誤起動を防ぐ。
   - コマンドハンドラーは VS Code から渡される `vscode.Uri` 引数を受け取り、`currentFileUri` へ設定してから `openKanbanView()` を呼ぶ。既に他ファイルの Kanban が開いている場合は、対象切替であることをユーザーへ明示する（通知またはタイトル更新）。

2. **アクティビティバーの専用アイコン**
   - `package.json` の `contributes.viewsContainers.activitybar` に `Weekly Kanban` コンテナを追加し、アイコンをクリックすると `weekly-kanban.openKanban` コマンドを実行する。
   - 対象ファイルが未確定の場合は、既存の `promptForWeeklyFile()` によるファイル選択 UI をそのまま利用し、新規の選択 UI は作らない。
   - 独自のツリービュー実装は今回のスコープに含めず、アイコンはあくまで既存 Webview パネルの起動・フォーカス用ショートカットとする。

いずれの経路でも、Kanban パネルが既に表示中であれば `webviewPanel.getPanel().reveal()` で前面化するのみとし、二重パネルを生成しない現行の抑制ロジックを維持する。

### 4.2 メッセージプロトコル

**Webview → Extension**

```typescript
{
  source: 'kanban',
  action: 'move' | 'update' | 'delete' | 'create',
  payload: {
    cardId: string;
    targetColumn?: string;
    title?: string;
    labels?: string[];
    dueDate?: string;
  }
}
```

ここでの `dueDate` は JSON メッセージ上の表現であり、ドメインモデル上では `Date` として扱う。

実装上は上記の統一 `action` 形式ではなく、`type` ごとに独立したメッセージ（`cardMoved` / `cardToggleComplete` / `cardTitleChanged` / `cardLabelToggled` / `cardDeleted`）を `MessageHandler.handleMessage()`（`src/webview/messageHandler.ts`）で分岐している。GUI からのカード新規作成には、これらと同じ形式で `cardCreated` メッセージを追加する。

```typescript
{
  type: 'cardCreated',
  id?: string;
  payload: {
    columnName: 'ToDo' | 'Doing' | 'Done';
    title: string;
    labels?: string[];
    dueDate?: string;
  }
}
```

`cardCreated` の受理後は、既存のカード編集系と同様に `ChangesetBuilder`（`src/domain/builder.ts`）で changeset を組み立て、`SyncEngine.queueKanbanChange()` 経由でデバウンス後に Markdown へ反映する。カード ID は Extension 側で生成し、既存の ID 採番方針（UUID/連番/slug のいずれか、FR-SET-01 で設定化予定）に従う。v0.1 時点では連番または UUID の固定方針で実装し、設定化は defer する。

**Extension → Webview**

```typescript
{
  source: 'extension',
  type: 'boardUpdate' | 'error' | 'statusChange',
  payload: Board | { message: string } | { status: string }
}
```

---

## 5. パーサー設計

### 5.1 可逆性戦略

**目的**: 非意味的な Markdown 要素をすべて保持する。

**実装方針**:
1. 文字列置換ではなく行範囲追跡を使う
2. 不明な YAML キーの元テキストを保持する
3. カード項目外のコメントと空行を保持する
4. 行範囲単位の差分更新（insert/delete/replace）を適用する

**例**:
```markdown
# 元の状態
## ToDo

- [ ] タスク 1
  # 特別なコメント
  ID: task-1

# Doing へ移動後
## ToDo

## Doing

- [ ] タスク 1
  # 特別なコメント
  ID: task-1
```

### 5.2 カード解析

- Card ID 抽出: メタデータ行の `ID: <id>`
- Label 抽出: `Label: <comma-separated>`
- Due date 抽出: `Due: <date>`
- 完了状態: チェックボックス `[x]` と `[ ]`

---

## 6. エラーハンドリング

### 6.1 不正な Markdown

```typescript
type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; line?: number } };

// 例外は投げず、必ず Result を返す
const parse = (content: string): Result<Board> => {
  try {
    // ...
  } catch (e) {
    return {
      ok: false,
      error: { code: 'PARSE_ERROR', message: e.message, line: e.line }
    };
  }
};
```

### 6.2 競合シナリオ

| シナリオ | 挙動 |
|----------|------|
| Kanban ドラッグ中に Markdown が外部編集された | ユーザーへ通知し、ファイルから再読込する |
| Kanban を編集したがファイルがロックされている | エラー通知を表示する |
| move 対象の ID が不一致 | move を拒否し、警告ログを出力する |

### 6.3 Date/構造化フィールドの扱い

- `dueDate` はドメインモデル上では `Date` として扱う
- `metadata` は `Map` として保持する
- `Board` 複製では `Date` と `Map` を保ったままコピーする必要がある
- そのため `JSON.parse(JSON.stringify(board))` のような汎用 JSON round-trip は使用しない
- Markdown writer は防御的に `dueDate` の型崩れを扱えるようにするが、正規経路では型保持済みの `Board` を受け取る前提とする

---

## 7. 性能目標

| 操作 | 目標 | テストデータ |
|------|------|--------------|
| Markdown の解析 | < 1 sec | 10MB ファイル |
| Kanban の描画 | < 200ms | 1000 カード |
| 保存から同期までの遅延 | < 500ms | 平均ケース |
| 正規表現パターン照合 | < 250ms | 最悪ケース |

---

## 8. テスト戦略

### 8.1 単体テスト（Parser）

- [ ] 正常な Markdown を解析して Board モデルへ変換できる
- [ ] 不正な Markdown を解析してエラーメッセージを返す
- [ ] 可逆な書き込み（Board → Markdown）がコメントを保持する
- [ ] カード移動でセクション配置が更新される

### 8.2 統合テスト（Sync）

- [ ] ファイル変更から 200ms 以内に Webview が更新される
- [ ] Kanban ドラッグ後、保存を経て 500ms 以内にファイルへ書き込まれる
- [ ] 競合時に Markdown 外部編集を検知してユーザーへ通知する

### 8.3 UI テスト（Webview）

- [ ] Kanban が正しいカラム数で描画される
- [ ] ドラッグ&ドロップでカードが対象カラムへ移動する
- [ ] ステータスバーが同期状態（成功/失敗）を表示する
- [ ] GUI からのカード追加・編集・削除・完了切替が Markdown へ反映される
- [ ] Markdown 右クリックメニューから対象ファイルの Kanban ビューが開く（`weekly-*.md` 以外では表示されない）
- [ ] アクティビティバーのアイコンから Kanban ビューが開き、未確定時はファイル選択 UI が表示される

---

## 9. 将来拡張（Post-MVP）

- [ ] 複数セクション Kanban（スプリント計画ビュー）
- [ ] Kanban 操作の undo/redo
- [ ] カードの検索とフィルター
- [ ] カスタムカラム名（i18n）
- [ ] MCP Server 連携（自然言語によるタスク更新）
