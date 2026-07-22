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
| Overall Coverage | Partial（UI/Entry E2E は手動中心） |
| Sync Coverage | Unit tests added |
| UI Coverage | ItemView / Modal 実装済み（自動は unit 中心） |
| 総合判定 | Partial Pass |

## 3. Quality Gates

### 3.1 Build Quality

- TypeScript Compilation: no errors. Pass (`npm run build`).
- Lint: not yet configured.
- Bundle / packaging: not yet configured.

### 3.2 Test Quality

- Unit tests pass. Pass (`npm test`).
- Parser unit tests added for frontmatter, section parsing, and exact round-trip preservation.
- Parser timeout tests added for 250ms budget overflow detection (`REGEX_TIMEOUT`).
- Domain unit tests added for 3-column invariant, duplicate card ID rejection, move/toggle operations.
- Sync unit tests added for queueing, debounce window, and conflict rejection.
- Performance tests added for parse, regenerate, and write+parse cycle latency.
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
| FR-MD-03 | 直接編集できる | Obsidian 標準動作確認 | Partial |
| FR-MD-04 | 保存時に更新される | 保存イベント連携 | Partial |

### 4.2 Kanban Display

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-KB-01 | 3 列表示 | 通常系 | Partial |
| FR-KB-02 | カード一覧表示 | 通常系 / 境界系 | Partial |
| FR-KB-03 | タイトル / ID / ラベル / 期限表示 | 通常系 | Partial |
| FR-KB-04 | 列間移動 | 通常系 / 境界系 | Partial |
| FR-KB-05 | 新規作成 | 通常系 / 異常系 | Partial |
| FR-KB-06 | 編集 | 通常系 / 異常系 | Partial |
| FR-KB-07 | 削除確認付き | 異常系 | Partial |
| FR-KB-08 | 完了切替 | 通常系 / 境界系 | Partial |

### 4.3 Sync

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-SYNC-01 | Markdown → Kanban | 通常系 / 異常系 | Partial |
| FR-SYNC-02 | Kanban → Markdown 要求生成 | 通常系 | Partial |
| FR-SYNC-03 | debounce 後の反映 | 境界系 | Partial |
| FR-SYNC-04 | 失敗通知 | 異常系 | Partial |

### 4.4 Command and UI

| ID | 要求 | 検証観点 | 状態 |
|----|------|----------|------|
| FR-CMD-01 | Open Kanban View | 通常系 | Partial |
| FR-CMD-02 | Open Weekly File | 通常系 / 異常系 | Partial |
| FR-CMD-03 | カードクリックでジャンプ | 通常系 / 境界系 | Partial |
| FR-CMD-04 | ステータス表示 | 通常系 / 異常系 | Partial |
| FR-CMD-05 | メニューから起動 | 通常系 | Partial |
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

- 大容量ファイル解析（10MB、< 1s）。
- 1000 カード再生成（描画 proxy、< 200ms）。
- 保存同期相当の write+parse サイクル（< 500ms）。
- regex timeout 検出（250ms 予算超過で `REGEX_TIMEOUT`）。

## 6. Known Gaps

- Entry Point 系（ファイルメニュー、リボン、コマンド）の自動 E2E が未整備で、現状は手動確認が中心。
- NFR-PERF-02 は markdown 再生成を redraw proxy として計測しているため、実 UI の再描画計測は別途必要。
- lint / coverage の品質ゲートは未整備。
