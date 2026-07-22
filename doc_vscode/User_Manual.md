# ユーザーマニュアル - Weekly Kanban Markdown Sync Extension

作成日: 2026-07-02  
対象: VS Code 1.85.0+

---

## Table of Contents

1. [インストール](#インストール)
2. [クイックスタート](#クイックスタート)
3. [主な機能](#主な機能)
4. [キーボードナビゲーション](#キーボードナビゲーション)
5. [キーボードショートカット](#キーボードショートカット)
6. [アクセシビリティ](#アクセシビリティ)
7. [設定](#設定)
8. [Markdown フォーマット](#markdown-フォーマット)
9. [トラブルシューティング](#トラブルシューティング)

---

## インストール

### VS Code 拡張マーケットプレイスからのインストール

1. VS Code を開く
2. 左サイドバーの **拡張機能** アイコンをクリック
3. "Weekly Kanban" で検索
4. **インストール** をクリック
5. VS Code を再起動

### 手動インストール（開発用）

```bash
git clone https://github.com/user/weekly_kanban_vscode_extension.git
cd weekly_kanban_vscode_extension
npm install
npm run build
code --install-extension dist/extension.vsix
```

---

## クイックスタート

### 1. 週次タスクファイルの作成

新しい Markdown ファイルを作成し、以下の形式で命名：

```
weekly-2026-W27.md
```

ファイルの内容：

```yaml
---
year: 2026
week: 27
created: 2026-07-02
---

# Weekly Tasks (27/2026)

## ToDo

- [ ] タスク 1
  ID: task-1
  Label: feature

## Doing

## Done

```

### 2. Kanban ビューを開く

Kanban ビューは次の 3 つのいずれかの方法で開けます。

**方法1: コマンドパレット**

```
Ctrl+Shift+P  (Windows/Linux)
Cmd+Shift+P   (macOS)
```

"Open Kanban View" を検索して実行

**方法2: Markdown ファイルの右クリック**

エクスプローラーで `weekly-*.md` ファイルを右クリックし、コンテキストメニューから "Open Kanban View" を選択（対象は `weekly-*.md` パターンのファイルのみ）

**方法3: アクティビティバー**

左サイドバーのアクティビティバーにある Weekly Kanban アイコンをクリック（対象ファイルが未確定の場合は選択 UI が表示されます）

### 3. タスクをドラッグで移動

- ToDo 列からカードをドラッグ
- Doing 列へドロップ
- 約300ms後に Markdown 反映処理が走る

### 4. ファイルを保存

```
Ctrl+S  (Windows/Linux)
Cmd+S   (macOS)
```

Kanban での変更が Markdown へ反映されます

---

## 主な機能

### 機能 1: Kanban ビュー表示

**説明**: Markdown 内のタスクを 3 列の Kanban ボード形式で視覚化

**操作**:
1. コマンドパレット、Markdown ファイルの右クリック、またはアクティビティバーのいずれかで "Open Kanban View" を実行
2. `weekly-*.md` が複数ある場合は対象ファイルを選択
3. Kanban ビューが VS Code のタブで開く
4. パネルタイトルに現在対象の Markdown ファイル名が表示される
5. ToDo / Doing / Done 3 列にタスクが表示

**スクリーンショット**: [イメージ挿入予定]

---

### 機能 2: カードの GUI 操作（追加・編集・削除・完了切替）

**説明**: Kanban ビュー上でマウス操作によりカードを直接管理

**操作**:
1. 各カラムの「カード追加」ボタンからタイトルを入力して新規カードを作成
2. カードを選択しタイトル・ラベル・期限を編集
3. チェックボックスで完了/未完了を切替
4. 削除ボタンと確認ダイアログでカードを削除
5. すべての操作はデバウンス後に Markdown へ自動反映される

**注意**: 削除は元に戻せないため、確認ダイアログで必ず確認してください

---

### 機能 3: カードのドラッグアンドドロップ

**説明**: Kanban 上でカードをドラッグして別セクションへ移動

**操作**:
1. Kanban ビューでカードをマウスで選択
2. 別の列へドラッグアンドドロップ
3. 自動的にプレビューが表示
4. 約300msの待機で連続操作がまとめられ、Markdown 反映処理が走る
5. 必要に応じて "Save Weekly File" コマンドで明示反映できる

**注意**: Markdown 側の編集を保存すると、Kanban への再反映は通常 500ms 以内に行われます

---

### 機能 3: Markdown との双方向同期

**説明**: Markdown エディタで直接編集すると、Kanban が自動更新

**シナリオ**:
- エディタでカードタイトルを変更 → 保存 → Kanban へ反映
- Markdown でセクションを追加 → 保存 → 新しいカード表示
- Kanban でカードを移動 → 約300ms後に Markdown 反映処理 → FileWatcher 経由で Kanban を再同期

**同期間隔**:
- Markdown → Kanban: 保存イベント後、通常 500ms 以内
- Kanban → Markdown: 編集後、約300ms のデバウンス後

---

### 機能 4: ステータス表示

**説明**: ステータスバーに同期状態を表示

- ✓ **Synced**: 最後の同期が成功
- ⚠ **Syncing**: 同期中
- ✗ **Error**: 同期に失敗（詳細はコンソールを参照）

**補足**:
- ステータスバーのツールチップには現在対象の Markdown ファイル名が表示されます
- Kanban タブのタイトルにも対象ファイル名が表示されます

---

## キーボードナビゲーション (v0.1.0+)

### Kanban ビュー内のキーボード操作

Kanban ボード上でのキーボード ナビゲーションをサポートします。アクセシビリティと効率性を向上させます。

| キー | 操作 | 説明 |
|-----|-----|------|
| **矢印キー ↑↓←→** | 移動 | カード間でフォーカスを移動。上下で同じ列内、左右で異なる列へ |
| **Enter** | 完了切り替え | フォーカスカードの完了/未完了をトグル |
| **Delete / Backspace** | 削除 | カードを削除（確認ダイアログ表示） |
| **Escape** | フォーカス解除 | フォーカスをボードから外す |
| **Tab** | フォーカス移動 | 次のインタラクティブ要素へ移動 |
| **Shift+Tab** | 逆方向移動 | 前のインタラクティブ要素へ移動 |

### スキップリンク

ページ最上部に "Skip to Kanban board" リンクがあります：
- 最初の Tab キー押下でフォーカスが移動
- アクセシビリティツールの使用者向け

### WCAG 2.1 AA 準拠

- **フォーカスインジケータ**: 3px の視認性の高い枠線
- **ハイコントラストモード**: OS のハイコントラスト設定に対応
- **キーボードトラップなし**: すべてのカードが Tab で抜け出せる
- **ARIA ラベル**: スクリーンリーダー用の説明が完備

---

## キーボードショートカット

### VS Code ネイティブ

| アクション | Windows/Linux | macOS |
|----------|---------------|-------|
| コマンドパレット | Ctrl+Shift+P | Cmd+Shift+P |
| 保存 | Ctrl+S | Cmd+S |
| 元に戻す | Ctrl+Z | Cmd+Z |
| やり直し | Ctrl+Shift+Z | Cmd+Shift+Z |

### 拡張機能コマンド

| コマンド | 実行方法 | 説明 |
|---------|--------|------|
| Open Kanban View | コマンドパレット / Markdown 右クリック / アクティビティバー | Kanban ビューを開く/フォーカス。候補が複数ある場合は対象ファイルを選択 |
| Open Weekly File | コマンドパレット | 週次 Markdown ファイルを開く。候補が複数ある場合は対象ファイルを選択 |
| Save Weekly File | コマンドパレット | キュー済みの Kanban 変更を即時に Markdown へ反映 |

**カスタムキーバインド設定**（オプション）:

`~/.config/Code/User/keybindings.json` に追加：

```json
[
  {
    "key": "ctrl+alt+k",
    "command": "weekly-kanban.openKanban"
  }
]
```

---

## 設定

現行バージョン v0.1.0 では、ユーザー向けの拡張設定項目は公開していません。

- `package.json` に `contributes.configuration` は定義されていません
- 同期タイミングや表示挙動は現在の実装既定値で動作します

将来バージョンでは、カードID規則や表示設定を追加する可能性がありますが、本マニュアルでは現行実装のみを扱います

---

## Markdown フォーマット

### ファイル命名規則

**形式**: `weekly-<YYYY>-W<WW>.md`

**例**:
- `weekly-2026-W27.md`  （2026 年第 27 週）
- `weekly-2026-W01.md`  （2026 年第 01 週）

### ファイル構造

```markdown
---
year: 2026
week: 27
created: 2026-07-02
---

# Weekly Tasks (27/2026)

## ToDo

- [ ] タスク 1
  ID: task-1
  Label: feature,urgent
  Due: 2026-07-10

- [ ] タスク 2
  ID: task-2
  Label: bugfix

## Doing

- [ ] タスク 3
  ID: task-3
  Label: feature

## Done

- [x] 完了済みタスク
  ID: task-4
  Label: feature

```

### メタデータフィールド

| フィールド | 形式 | 必須 | 説明 |
|----------|------|------|------|
| ID | `ID: <value>` | ✓ | カード一意識別子 |
| Label | `Label: <csv>` | ✗ | カテゴリ/優先度タグ |
| Due | `Due: <YYYY-MM-DD>` | ✗ | 期限日 |
| Description | `Description: <text>` | ✗ | 説明文 |

### コメント（保持される）

```markdown
## ToDo

- [ ] タスク 1
  # ここのコメントは保持されます
  ID: task-1

  # ブロックコメント
  # 複数行OK

```

保存前後で上記のコメントが削除されることはありません

---

## トラブルシューティング

### 問題 1: Kanban ビューが表示されない

**原因**: ファイルが Markdown フォーマットに準拠していない

**対処**:
1. ファイル拡張子が `.md` であることを確認
2. Frontmatter が正しい YAML 形式であることを確認
3. セクションヘッダが `## ToDo`, `## Doing`, `## Done` であることを確認
4. VS Code コンソール（F12）でエラーを確認

**例（NG）**:
```yaml
---
year 2026      # ← コロンなし
---
```

**例（OK）**:
```yaml
---
year: 2026     # ← コロンあり
---
```

### 問題 2: カードの移動が反映されない

**原因**: Markdown を保存していない

**対処**:
1. カードをドラッグして移動
2. **必ず Ctrl+S（または Cmd+S）で保存** してください
3. ステータスバーで "Synced" を確認

---

### 問題 3: 同期エラーが表示される

**ステータスバー**: `✗ Error: Sync failed`

**原因**: ファイルが編集中に外部で変更された

**対処**:
1. VS Code がアラート表示：**"File has been changed"** を選択
   - **Revert**: ファイル更新を破棄して再度読み込み
   - **Overwrite**: 現在のバージョンで上書き保存
2. 不確実な場合は **Revert** を選択

---

### 問題 4: パフォーマンスが低下

**症状**: Kanban のドラッグが遅い、Markdown 更新が遅い

**原因**: ファイルサイズが大きい、または複雑な正規表現

**対処**:
1. ファイルサイズを確認（10MB 以下推奨）
2. ラベルなど複雑なメタデータを簡潔にする
3. VS Code を再起動
4. 拡張機能のアップデートを確認

---

### 問題 5: カード ID の重複エラー

**メッセージ**: `Warning: Duplicate card IDs detected`

**原因**: 複数のカードに同じ ID が付与されている

**対処**:
```markdown
# NG: 重複
- [ ] タスク 1
  ID: task-1

- [ ] タスク 2
  ID: task-1    # ← 重複！

# OK: 一意
- [ ] タスク 1
  ID: task-1

- [ ] タスク 2
  ID: task-2
```

---

## サポート

- **バグ報告**: https://github.com/user/weekly_kanban_vscode_extension/issues
- **質問・提案**: GitHub Discussions
- **ドキュメント**: [README.md](../README.md)

---

**Version**: 0.1.0 (Beta)  
**Last Updated**: 2026-07-02
