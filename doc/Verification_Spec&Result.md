# 検証仕様書兼結果報告 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象バージョン: v0.1.0

## 1. Purpose

この文書は、Weekly Kanban Obsidian Plugin の検証仕様と現行結果を一体化した正本である。

## 2. Current Release Summary

| 項目 | 値 |
|------|-----|
| 対象バージョン | v0.1.0 |
| Build | Pass |
| Tests | Pass |
| Parser Coverage | Unit tests added |
| Domain Coverage | Unit tests added |
| Overall Coverage | Partial |
| Sync Coverage | Unit tests added |
| UI Coverage | 未実施 |
| 総合判定 | Partial Pass |

## 3. Quality Gates

### 3.1 Build Quality

- TypeScript Compilation: no errors. Pass (`npm run build`).
- Lint: not yet configured.
- Bundle / packaging: not yet configured.

### 3.2 Test Quality

- Unit tests pass. Pass (`npm test`).
- Parser unit tests added for frontmatter, section parsing, and exact round-trip preservation.
- Domain unit tests added for 3-column invariant, duplicate card ID rejection, move/toggle operations.
- Sync unit tests added for queueing, debounce window, and conflict rejection.
- Overall coverage target not yet measured.

### 3.3 Performance Quality

- 10MB Markdown parse under 1 second.
- Kanban redraw under 200ms.
- Save sync under 500ms.
- Regex timeout detected within 250ms.

## 4. Requirements Traceability

### 4.1 Markdown File Management

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-MD-01 | Frontmatter + セクション形式を開ける | 通常系 / 異常系 / 境界系 | Partial |
| FR-MD-02 | 週情報を持つ | 通常系 / 異常系 | Partial |
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
| FR-SYNC-01 | Markdown → Kanban | 通常系 / 異常系 | Partial |
| FR-SYNC-02 | Kanban → Markdown 要求生成 | 通常系 | Partial |
| FR-SYNC-03 | debounce 後の反映 | 境界系 | Partial |
| FR-SYNC-04 | 失敗通知 | 異常系 | Draft |

### 4.4 Command and UI

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-CMD-01 | Open Kanban View | 通常系 | Partial |
| FR-CMD-02 | Open Weekly File | 通常系 / 異常系 | Partial |
| FR-CMD-03 | カードクリックでジャンプ | 通常系 / 境界系 | Draft |
| FR-CMD-04 | ステータス表示 | 通常系 / 異常系 | Partial |
| FR-CMD-05 | メニューから起動 | 通常系 | Draft |
| FR-CMD-06 | リボン / コマンド起動 | 通常系 | Partial |

## 5. Test Plan

### 5.1 Parser Unit Tests

- Frontmatter 抽出。
- セクション認識。
- カードの reversible parse/write。
- Exact round-trip preservation for unchanged markdown.

### 5.2 Sync Integration Tests

- Vault change → view update。
- view change → save。
- conflict handling。
- Debounce window behavior.

### 5.3 Domain Unit Tests

- 3 列不変条件。
- duplicate card id rejection.
- move / toggle behavior.

### 5.4 UI Component Tests

- ItemView の 3 列表示。
- Modal の開閉と入力。
- drag and drop。

### 5.5 Entry Point Tests

- コマンドパレット起動。
- リボン起動。
- ファイルメニュー起動。

### 5.6 Performance Tests

- 大容量ファイル解析。
- 1000 カード描画。

## 6. Known Gaps

- Presentation の実描画、カード操作モーダル、ファイル選択モーダルの実 UI は未実装。
- Vault 監視による自動同期と保存イベント連携は未実装。
- lint / coverage / performance 計測は未実施。
- 参照元仕様（VS Code 版）からの移植差分が大きい領域は、まず要求と設計の整合を確定してから実装する。
