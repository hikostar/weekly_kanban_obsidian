# 検証仕様書兼結果報告 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象バージョン: v0.1.0

## 1. Purpose

この文書は、Weekly Kanban Obsidian Plugin の検証仕様と現行結果を一体化した正本である。

## 2. Current Release Summary

| 項目 | 値 |
|------|-----|
| 対象バージョン | v0.1.0 |
| Build | 未実施 |
| Tests | 未実施 |
| Parser Coverage | 未実施 |
| Domain Coverage | 未実施 |
| Overall Coverage | 未実施 |
| Sync Coverage | 未実施 |
| UI Coverage | 未実施 |
| 総合判定 | Draft |

## 3. Quality Gates

### 3.1 Build Quality

- TypeScript Compilation: no errors.
- Lint: no violations.
- Bundle / packaging: plugin package built successfully.

### 3.2 Test Quality

- Unit tests pass.
- Parser coverage meets target.
- Domain coverage meets target.
- Overall coverage meets target.

### 3.3 Performance Quality

- 10MB Markdown parse under 1 second.
- Kanban redraw under 200ms.
- Save sync under 500ms.
- Regex timeout detected within 250ms.

## 4. Requirements Traceability

### 4.1 Markdown File Management

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-MD-01 | Frontmatter + セクション形式を開ける | 通常系 / 異常系 / 境界系 | Draft |
| FR-MD-02 | 週情報を持つ | 通常系 / 異常系 | Draft |
| FR-MD-03 | 直接編集できる | Obsidian 標準動作確認 | Draft |
| FR-MD-04 | 保存時に更新される | 保存イベント連携 | Draft |

### 4.2 Kanban Display

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-KB-01 | 3 列表示 | 通常系 | Draft |
| FR-KB-02 | カード一覧表示 | 通常系 / 境界系 | Draft |
| FR-KB-03 | タイトル / ID / ラベル / 期限表示 | 通常系 | Draft |
| FR-KB-04 | 列間移動 | 通常系 / 境界系 | Draft |
| FR-KB-05 | 新規作成 | 通常系 / 異常系 | Draft |
| FR-KB-06 | 編集 | 通常系 / 異常系 | Draft |
| FR-KB-07 | 削除確認付き | 異常系 | Draft |
| FR-KB-08 | 完了切替 | 通常系 / 境界系 | Draft |

### 4.3 Sync

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-SYNC-01 | Markdown → Kanban | 通常系 / 異常系 | Draft |
| FR-SYNC-02 | Kanban → Markdown 要求生成 | 通常系 | Draft |
| FR-SYNC-03 | debounce 後の反映 | 境界系 | Draft |
| FR-SYNC-04 | 失敗通知 | 異常系 | Draft |

### 4.4 Command and UI

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-CMD-01 | Open Kanban View | 通常系 | Draft |
| FR-CMD-02 | Open Weekly File | 通常系 / 異常系 | Draft |
| FR-CMD-03 | カードクリックでジャンプ | 通常系 / 境界系 | Draft |
| FR-CMD-04 | ステータス表示 | 通常系 / 異常系 | Draft |
| FR-CMD-05 | メニューから起動 | 通常系 | Draft |
| FR-CMD-06 | リボン / コマンド起動 | 通常系 | Draft |

## 5. Test Plan

### 5.1 Parser Unit Tests

- Frontmatter 抽出。
- セクション認識。
- カードの reversible parse/write。

### 5.2 Sync Integration Tests

- Vault change → view update。
- view change → save。
- conflict handling。

### 5.3 UI Component Tests

- ItemView の 3 列表示。
- Modal の開閉と入力。
- drag and drop。

### 5.4 Entry Point Tests

- コマンドパレット起動。
- リボン起動。
- ファイルメニュー起動。

### 5.5 Performance Tests

- 大容量ファイル解析。
- 1000 カード描画。

## 6. Known Gaps

- まだ実装がないため結果欄は Draft のみ。
- 既存 VS Code 版からの移植差分が大きい領域は、まず要求と設計の整合を確定してから実装する。
