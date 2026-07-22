# 検証仕様書兼結果報告 - Weekly Kanban Extension

作成日: 2026-07-02　最終更新: 2026-07-05　対象バージョン: v0.1.0

## 1. Document Purpose and Scope

この文書は、Weekly Kanban VS Code Extension の **検証仕様（何をどう検証するか）** と **現行結果（実測でどうだったか）** を一体化した正本である。

- **正本の扱い**: 現行リリース（v0.1.0）の品質ゲート判定は [8. Sign-Off and Release Decision](#8-sign-off-and-release-decision) を最終権威とする。
- **構成方針**: 現行版の結論を先頭（1〜3章）に置き、要求とテストのトレーサビリティを中核（4〜6章）に据え、未解決課題を明示（7章）した上で、過去バージョンの経過は [9. Verification History](#9-verification-history) に隔離する。
- **既知の是正**: 旧版では MVP（v0.0.1）時点の Pending 表と v0.1.0 実績が同一章に混在し、Overall Coverage を「38.4% ✅ (target ≥40%)」と誤記していた（38.4% は 40% 未達）。本改版でこれを是正する。

---

## 2. Current Release Summary

| 項目 | 値 |
|------|-----|
| 対象バージョン | v0.1.0 |
| Build | ✅ PASS（webpack production, `extension.js` 60.8 KiB, 0 TypeScript errors） |
| Tests | ✅ 131/131 passing（9/9 test suites） |
| Parser Coverage | ✅ 79.47%（目標 ≥75%） |
| Domain Coverage | ⚠️ 34.81%（目標 ≥70%、-35.19pt） |
| Overall Coverage | ✅ 51.67% stmts / 52.59% lines（目標 ≥40%） |
| Sync Coverage | ℹ️ 43.27%（正式な baseline 未設定、参考値） |
| Webview Coverage | ✅ 66.33%（`webviewContent.ts` は 2026-07-05 の jsdom 導入で 0% → 100% に到達。`messageHandler.ts`/`webviewPanel.ts` は残存ギャップあり） |
| ESLint | ❌ Gap（`eslint src --ext ts` 実行時に設定ファイルが見つからず実行不可。リポジトリに `.eslintrc*` が存在しない既知の環境課題） |
| 総合判定 | 🟡 **Conditional Go**（詳細は 8 章） |

**総合判定の要旨**: Parser/Sync の主要回帰とビルドは健全で、今回の dueDate / debounce 系のバグに対する自動回帰テストも追加済みである。2026-07-05 に Webview 層へ jsdom ベースの DOM テストを導入し、GUI カード CRUD（FR-KB-05〜08）の主要経路をコンポーネントレベルで自動検証できるようになった。一方で Domain coverage は baseline 未達、FR-CMD-03・FR-CMD-04・FR-CMD-05/06・NFR-PERF-04 に自動検証が無く、ESLint は設定ファイル不備で実行不可であるため、**無条件の release-ready ではなく条件付き承認**とする。

---

## 3. Quality Gates

### 3.1 Build Quality

| Gate | Criteria | Result |
|------|----------|--------|
| TypeScript Compilation | No errors (strict mode) | ✅ PASS |
| ESLint | No violations | ❌ Gap（設定ファイル不在のため `npm run lint` が実行不可。既存の環境課題であり今回の変更が原因ではない） |
| Webpack Bundle | < 100 KiB | ✅ PASS（60.8 KiB, compile ~2.8s） |

### 3.2 Test Quality

| Gate | Criteria | Result |
|------|----------|--------|
| Unit Test Pass Rate | 100% | ✅ PASS（131/131） |
| Parser Coverage | ≥ 75% | ✅ PASS（79.47%） |
| Domain Coverage | ≥ 70% | ⚠️ WARNING（34.81%、依然として baseline 未達） |
| Overall Coverage | ≥ 40% | ✅ PASS（51.67% stmts / 52.59% lines） |
| Sync Coverage | 参考値（baseline 未設定） | ℹ️ INFO（43.27%） |
| Webview Coverage | 参考値（baseline 未設定） | ✅ INFO（66.33%。`webviewContent.ts` は jsdom DOM テストで 100%） |

**Coverage 内訳（`npm test -- --coverage` 実測, 2026-07-05）**:

```
All files  | Stmts 51.67% | Branch 33.33% | Funcs 41.23% | Lines 52.59%
domain    | Stmts 34.81%  (board.ts 50.0% / builder.ts 60.31% / card.ts 32.43% / validation.ts 6.4%)
parser    | Stmts 79.47%  (markdownParser.ts 89.34% / kanbanWriter.ts 70.0%)
sync      | Stmts 43.27%  (fileWatcher.ts 23.07% / syncEngine.ts 48.22%)
webview   | Stmts 66.33%  (messageHandler.ts 70.96% / webviewContent.ts 100% / webviewPanel.ts 65.45%)
```

### 3.3 Performance Quality

| Gate | Criteria | Result | 備考 |
|------|----------|--------|------|
| NFR-PERF-01: Parse < 1 sec | 想定 10MB ファイル | ⚠️ PARTIAL（実測 210.77ms／入力 457,836 bytes ≈ 0.45MB） | 実際には 10MB 相当のデータで検証していない |
| NFR-PERF-02: Render < 200ms | 1000 カード | ⚠️ PARTIAL（`KanbanWriter.write()` 3.16ms） | Markdown 書き出し速度のみ計測。Webview 実描画は未計測 |
| NFR-PERF-03: Sync < 500ms | 典型ワークフロー | ⚠️ PARTIAL（write+parse サイクル 0.34ms） | 実ファイルI/O・Webview 反映を含まない |
| NFR-PERF-04: Regex timeout < 250ms | 複雑な正規表現 | ❌ GAP（該当テスト無し） | `performance.test.ts` の TP-PERF-04 は「200 board operations（1.68ms）」であり、正規表現タイムアウトを検証していない |

---

## 4. Requirements Traceability

FR・AC・NFR ごとに、実装箇所・検証方法・状態を対応付ける。状態は `Verified`（自動テストまたは明確な手動確認で裏付け）、`Partial`（実装はあるが検証が弱い、または一部のみ確認）、`Gap`（実装はあるが自動検証が皆無）、`Not Implemented`（実装が確認できない）の4段階。

本改版から、各要求に対して `通常系 / 異常系 / 境界系` のどの観点まで証跡があるかも併記する。記号は `N` = 通常系、`E` = 異常系、`B` = 境界系 とし、`○` は証跡あり、`△` は限定的、`—` は未確認を表す。

### 4.1 Markdown ファイル管理

| ID | 要求 | 実装箇所 | 検証 | N | E | B | 状態 |
|----|------|---------|------|---|---|---|------|
| FR-MD-01 | Frontmatter + セクション形式の Markdown を開ける | `src/parser/markdownParser.ts` | TP-P-01/02（parser.test.ts） | ○ | △ | △ | ✅ Verified |
| FR-MD-02 | Frontmatter の週情報（年/週番号）が存在すること | `markdownParser.ts` | TP-P-01 | ○ | △ | — | ✅ Verified |
| FR-MD-03 | Markdown エディタで直接編集できる | VS Code 標準エディタ（機能委譲） | 手動確認（VS Code 既定機能） | ○ | — | — | ✅ Verified（設計上 native editor に委譲） |
| FR-MD-04 | Markdown 保存時に Kanban ビューが自動更新される | `src/sync/syncEngine.ts`, `fileWatcher.ts` | `sync.test.ts` は mock 越しの単体検証のみ、実ファイル保存→Webview反映のe2eは無し | ○ | △ | — | ⚠️ Partial |

### 4.2 Kanban 表示

| ID | 要求 | 実装箇所 | 検証 | N | E | B | 状態 |
|----|------|---------|------|---|---|---|------|
| FR-KB-01 | ToDo/Doing/Done 3 列表示 | `src/webview/webviewContent.ts` | TP-U-01（`ui.test.ts`）は配列長の比較のみで実際の Webview 出力は未検証 | ○ | — | △ | ⚠️ Partial |
| FR-KB-02 | 各カラムにカード一覧表示 | `webviewContent.ts` | TP-U-02 は定数オブジェクトの比較 | ○ | — | — | ⚠️ Partial |
| FR-KB-03 | カード情報（タイトル、ID、ラベル、期限）表示 | `webviewContent.ts` | TP-U-02 同様に定数比較 | ○ | — | △ | ⚠️ Partial |
| FR-KB-04 | カードをドラッグしてセクション間移動 | `webviewContent.ts`（drag handlers）, `extension.ts`（onCardMoved） | TP-U-03 はドラッグデータのオブジェクト形状を確認するのみ | ○ | △ | △ | ⚠️ Partial |
| FR-KB-05 | GUI からのカード新規作成 | `extension.ts`（`onCardCreated`）, `messageHandler.ts`（`cardCreated`）, `webviewContent.ts`（add-card form） | `extension.test.ts`/`messageHandler.test.ts` で ID 生成・空タイトル拒否・ラベル/期限の渡しを検証。`webviewContent.dom.test.ts`（新規、jsdom）で実 HTML/JS 上のフォーム表示・送信・キャンセル・二重オープン防止を検証 | ○ | ○ | ○ | ✅ Verified（コンポーネントレベル DOM テスト） |
| FR-KB-06 | GUI からのカード編集（タイトル/ラベル/期限） | `extension.ts`（`onCardTitleChanged`/`onCardLabelToggled`/`onCardDueDateChanged`）, `syncEngine.ts`（`labelToggles` 累積適用）, `webviewContent.ts`（edit-card form） | `sync.test.ts` TP-S-16 でラベル追加/削除の累積適用を回帰検証、`extension.test.ts`/`messageHandler.test.ts` で期限変更を検証。`webviewContent.dom.test.ts` で編集フォームの初期値プリフィル・差分送信・無変更時の無送信・期限クリア・キャンセルを検証 | ○ | △ | ○ | ✅ Verified（コンポーネントレベル DOM テスト） |
| FR-KB-07 | GUI からのカード削除（確認ダイアログ付き） | `webviewContent.ts`（マウス削除ボタンに `confirm()` を追加し、キーボード削除と仕様を統一）, `messageHandler.ts`（`cardDeleted`） | `messageHandler.test.ts` で `cardDeleted` ルーティングを検証。`webviewContent.dom.test.ts` で `confirm()` 承認/キャンセル双方の分岐を検証 | ○ | ○ | — | ✅ Verified（コンポーネントレベル DOM テスト） |
| FR-KB-08 | GUI からの完了/未完了切替 | `webviewContent.ts`（card-checkbox）, `messageHandler.ts`（`cardToggleComplete`） | `extension.test.ts` で `onCardToggleComplete` の changeset 生成を検証。`webviewContent.dom.test.ts` でチェックボックス変更イベントからの送信を検証 | ○ | — | — | ✅ Verified（コンポーネントレベル DOM テスト） |

### 4.3 双方向同期

| ID | 要求 | 実装箇所 | 検証 | N | E | B | 状態 |
|----|------|---------|------|---|---|---|------|
| FR-SYNC-01 | Markdown 編集 → Kanban 表示反映 | `syncEngine.ts` | TP-S-09（初期化）、TP-S-01（mock changeset）。実ファイル変更→Webview反映のe2eは無し | ○ | △ | — | ⚠️ Partial |
| FR-SYNC-02 | Kanban 編集 → Markdown 更新要求生成 | `domain/builder.ts`（ChangesetBuilder） | TP-S-01/02/04（`sync.test.ts`）で changeset 生成ロジックを検証 | ○ | △ | △ | ✅ Verified（unit レベル） |
| FR-SYNC-03 | Kanban 編集はデバウンス後に Markdown へ反映処理へ進み、必要に応じて明示保存もできる | `syncEngine.ts`（`queueKanbanChange` → debounce → `applyPendingChanges`）, `extension.ts`（`saveWeeklyFile` コマンド） | `sync.test.ts` の debounce 自動適用検証、`parser.test.ts` の dueDate を含む write 回帰検証。実ファイルI/Oを含む e2e は無し | ○ | △ | ○ | ⚠️ Partial |
| FR-SYNC-04 | 同期失敗時の失敗メッセージ通知 | `syncEngine.ts`（onError）, `extension.ts` | TP-S-13 はエラー分類ロジックを文字列比較で検証。実際の通知経路は未検証 | △ | ○ | — | ⚠️ Partial |

### 4.4 コマンド・UI

| ID | 要求 | 実装箇所 | 検証 | N | E | B | 状態 |
|----|------|---------|------|---|---|---|------|
| FR-CMD-01 | "Open Kanban View" コマンド | `extension.ts`（`registerCommand`）, `package.json`（`contributes.commands`） | 自動テスト無し。手動確認のみ | ○ | — | — | ⚠️ Partial（Deferred to manual checklist） |
| FR-CMD-02 | "Open Weekly File" コマンド | 同上 | 同上 | ○ | △ | △ | ⚠️ Partial（Deferred to manual checklist） |
| FR-CMD-03 | カードクリックで Markdown 該当行へジャンプ | `extension.ts`（`onJumpToMarkdown`）, `webview/messageHandler.ts`（`jumpToMarkdown`）, `webview/webviewPanel.ts` | 自動テスト無し（grep で該当テスト0件） | — | — | — | ❌ Gap |
| FR-CMD-04 | ステータスバーに同期状態表示 | `extension.ts`（`statusBar.text`/`tooltip`/`command` の状態遷移） | 自動テスト無し。ファイル名 tooltip 表示も未検証 | — | — | — | ❌ Gap |
| FR-CMD-05 | Markdown 右クリックメニューからの Kanban 起動 | `package.json`（`contributes.menus.explorer/context`, `weekly-*.md` 限定の `when`）, `extension.ts`（`openKanban` の `fileUri` 引数対応） | 自動テスト無し（VS Code の `when` 句評価とコンテキストメニューは手動確認が必要） | △ | — | — | ⚠️ Partial（実装済み、手動確認依存） |
| FR-CMD-06 | アクティビティバーからの Kanban 起動 | `package.json`（`contributes.viewsContainers.activitybar`, `viewsWelcome`）, `extension.ts`（`weeklyKanbanActivityView` の TreeDataProvider 登録） | 自動テスト無し（アクティビティバー表示とウェルカムビューのリンク動作は手動確認が必要） | △ | — | — | ⚠️ Partial（実装済み、手動確認依存） |

### 4.5 設定・状態

| ID | 要求 | 実装箇所 | 検証 | N | E | B | 状態 |
|----|------|---------|------|---|---|---|------|
| FR-SET-01 | カードID生成規則の設定 | 該当実装なし（`package.json` に `contributes.configuration` 自体が存在しない） | — | — | — | — | 🚫 Not Implemented |
| FR-SET-02 | セクション名の国際化設定 | 該当実装なし | — | — | — | — | 🚫 Not Implemented |
| FR-SET-03 | 列幅・カード高さの設定保存 | 該当実装なし | — | — | — | — | 🚫 Not Implemented |

### 4.6 非機能要求

| ID | 要求 | 実装箇所 | 検証 | N | E | B | 状態 |
|----|------|---------|------|---|---|---|------|
| NFR-PERF-01 | 10MB Markdown 解析 < 1秒 | `parser/markdownParser.ts` | TP-PERF-01 は約0.45MB相当の入力で計測（210.77ms）。10MBでの実測ではない | ○ | — | △ | ⚠️ Partial |
| NFR-PERF-02 | Kanban 再描画 < 200ms | `webview/webviewContent.ts` | TP-PERF-02 は `KanbanWriter.write()` の時間（3.16ms）で代用。Webview 実描画は未計測 | ○ | — | △ | ⚠️ Partial |
| NFR-PERF-03 | 保存時同期 < 500ms | `syncEngine.ts` | TP-PERF-03 は write+parse サイクルのみ（0.34ms）。実ファイルI/O・Webview反映を含まない | ○ | △ | △ | ⚠️ Partial |
| NFR-PERF-04 | 正規表現パースタイムアウト検出 < 250ms | 該当テスト無し | — | — | — | ❌ Gap |
| NFR-REL-01 | Markdown 可逆性（コメント・空白保持） | `parser/kanbanWriter.ts` | TP-P-04（round-trip） | ○ | △ | △ | ✅ Verified（基本ケースのみ、コメントの edge case は未網羅） |
| NFR-ACC-01 | WCAG 2.1 AA 準拠 | `webview/webviewContent.ts`（ARIA, focus outline, high contrast, skip-link, keyboard nav） | TP-U-06/07/08 は定数比較が中心で、実際のコントラスト比・DOM構造は未計測 | ○ | △ | △ | ⚠️ Partial（実装はあるが検証が弱い） |
| NFR-PLAT-01 | VS Code 1.85.0+ で動作 | `package.json`（`engines.vscode: ^1.85.0`） | 自動テスト無し。マニフェスト宣言のみ | ○ | — | — | ⚠️ Partial（Deferred to manual checklist） |

---

## 5. Acceptance Criteria Status

| AC ID | 対応 FR | N | E | B | 判定 | 根拠 |
|-------|--------|---|---|---|------|------|
| AC-MD-01 | FR-MD-01/02 | ○ | △ | △ | ⚠️ Partial | Frontmatter 抽出は TP-P-01 で Verified。週/年のUI表示、カードの Kanban 展開は未検証（Webview側テストが定数比較のため） |
| AC-KB-01 | FR-KB-01/02/03 | ○ | — | △ | ⚠️ Partial | 3列構成はコード上実装済みだが、実際の Webview 出力に対するテストが無い |
| AC-SYNC-01 | FR-SYNC-01 | ○ | △ | — | ⚠️ Partial | Markdown保存→200ms以内のKanban更新は、実ファイル保存を伴うe2eテストが無く、単体レベルの信号確認のみ |
| AC-SYNC-02 | FR-SYNC-02/03 | ○ | △ | ○ | ⚠️ Partial | Changeset 生成は Verified。debounce 自動適用と dueDate を含む write 回帰は検証済み。実ファイル保存を含む e2e は未検証 |
| AC-CMD-01 | FR-CMD-01/02 | ○ | △ | △ | ⚠️ Partial | コマンド登録は確認できるが、実行→ビュー/ファイルオープンの自動テストは無く、手動確認チェックリストに依存 |
| AC-CMD-02 | FR-CMD-03 | — | — | — | ❌ Gap | 実装はあるが自動テストが皆無 || AC-KB-02 | FR-KB-05 | ○ | ○ | ○ | ✅ Verified | `onCardCreated`/`cardCreated` ルートと `webviewContent.dom.test.ts` の追加フォーム DOM テストの双方で検証済み |
| AC-KB-03 | FR-KB-06 | ○ | △ | ○ | ✅ Verified | タイトル/期限/ラベルトグルのロジックと編集フォームの実 DOM 挙動（プリフィル・差分送信・キャンセル）を検証済み |
| AC-KB-04 | FR-KB-07/08 | ○ | ○ | — | ✅ Verified | 削除/完了切替のメッセージルーティングと、削除確認ダイアログの承認/キャンセル分岐を DOM テストで検証済み |
| AC-CMD-03 | FR-CMD-05 | △ | — | — | ⚠️ Partial | 実装済み。右クリックメニューの `when` 評価は手動確認依存 |
| AC-CMD-04 | FR-CMD-06 | △ | — | — | ⚠️ Partial | 実装済み。アクティビティバー表示の手動確認が必要 |
---

## 6. Current Test Map

`通常系 / 異常系 / 境界系` の観点で見ると、Parser と Sync の一部には証跡がある一方、UI とコマンド系は `通常系のみ` または `未整備` に偏っている。

| テストファイル | 対象層 | 主な TP-* | N | E | B | 実態 | 主な指摘 |
|--------------|--------|-----------|---|---|---|------|---------|
| `src/test/parser.test.ts` | Parser | TP-P-01〜07 | ○ | △ | ○ | ✅ 実アサーション | reversibility に加え、dueDate を含む parse → deepCopy → move → write の回帰を検証 |
| `src/test/domain.test.ts` | Domain | TP-D-01〜06 | ○ | △ | △ | ✅ 実アサーション | Board/Card の不変操作に加え、deepCopy が Date/Map を保持する回帰を検証。ただし `validation.ts`（6.4%）と `card.ts`（24.32%）のカバレッジは薄い |
| `src/test/sync.test.ts` | Sync | TP-S-01〜15 | ○ | ○ | ○ | 🟡 混在 | ChangesetBuilder 部分は実アサーション。SyncEngine 部分は vscode mock 越しの検証が中心だが、queueKanbanChange → 300ms debounce → applyPendingChanges の自動適用回帰は追加済み |
| `src/test/ui.test.ts` | Webview UI | TP-U-01〜15 | △ | △ | — | 🔴 大半が placeholder | `expect(columns.length).toBe(3)` のように、実装ではなく定数・リテラルを比較するテストが多数。仕様の例示に近く、回帰検出力は低い |
| `src/test/performance.test.ts` | Performance | TP-PERF-01〜05 | ○ | — | △ | 🟡 部分的に仕様と不一致 | TP-PERF-01 は10MBではなく約0.45MB入力。TP-PERF-02/03はUI/実ファイルI/Oを含まない。TP-PERF-04 は NFR-PERF-04（regex timeout）ではなく board operation latency を検証しており、要求とテストのIDが噛み合っていない |
| `src/test/regression.test.ts` | Regression | TP-REG-01〜03（予定） | — | — | — | 🚫 ファイル自体が存在しない | TP-REG-01/02/03 に対応する実装が無い。後方互換性・保存前後整合性・コマンド無破壊の回帰検証がゼロ |

### 6.1 Test Evidence by Scenario Type

| Scenario Type | 主に担保しているファイル | 現状評価 | 主な不足 |
|---------------|--------------------------|----------|----------|
| 通常系 | `parser.test.ts`, `domain.test.ts`, `sync.test.ts` | ○ 比較的そろっている | UI / コマンドの実出力検証が弱い |
| 異常系 | `sync.test.ts`, 一部 `parser.test.ts` | △ 層ごとの偏りあり | command / status bar / invalid input の異常系が不足 |
| 境界系 | `parser.test.ts`, `sync.test.ts`, `performance.test.ts` | △ debounce と一部性能系に偏る | 10MB相当、DOM件数上限、コマンド境界条件が不足 |

---

## 7. Known Gaps and Deferred Items

### 7.1 今サイクルでテスト追加すべき（Bucket 1）

優先順位は、`N / E / B` の欠損が大きく、かつ release-ready 判定に直接影響するものを上位とする。

| Priority | 対象 | 主な不足観点 | 追加すべき証跡 | 理由 |
|----------|------|--------------|----------------|------|
| P1 | FR-CMD-03（jump-to-Markdown） | N / E / B すべて未整備 | 通常系のジャンプ成功、異常系の対象不在、境界系の行端・複数カードケース | AC-CMD-02 が Gap のままで、ユーザー操作の主経路に直結する |
| P1 | FR-CMD-04（ステータスバー状態遷移とファイル名表示） | N / E / B すべて未整備 | 通常系の状態更新、異常系のエラー表示、境界系の対象ファイル切替 | 出荷済み UI だが自動検証がゼロで、既知 gap として明示されている |
| P1 | NFR-PERF-04（正規表現タイムアウト） | E / B 未整備 | timeout 発火、入力サイズ境界、250ms 閾値近傍 | 非機能要求を品質主張できず、現状は要求と TP が不整合 |
| P2 | `src/test/regression.test.ts` 新規作成（TP-REG-01〜03） | N / E / B 体系が未整備 | 保存前後整合性、既存 Markdown 互換、コマンド無破壊 | 横断回帰の受け皿が無く、将来の検証証跡を積み上げにくい |
| P2 | `ui.test.ts` placeholder 置換 | N は限定的、E / B がほぼ未整備 | 実 HTML / DOM ベースの通常系、エラー表示、件数境界 | Webview 層の現行テストは回帰検出力が低く、Partial の根本要因 |

先に着手すべき順序は、`P1 コマンド系 → P1 性能 timeout → P2 regression 受け皿 → P2 UI 実 DOM 化` とする。これにより、通常系・異常系・境界系の穴を release 判定へ影響の大きい順に埋められる。

### 7.2 文書側を是正すべき（Bucket 2、コード変更不要）

1. [doc/Requirements_Specification.md](../Requirements_Specification.md) の同期説明と実装済み debounce フローを整合させる
2. NFR-PERF-01 の「10MB」要求と、実テストの入力サイズ（約0.45MB）の乖離を、要求側の実測範囲明記かテスト側のデータ生成のどちらかで解消する
3. `performance.test.ts` の TP-PERF-04 とこの検証仕様書上の NFR-PERF-04（regex timeout）のID対応が取れていない点を明記的に解消する

### 7.3 次版へ defer すべき（Bucket 3）

1. FR-SET-01/02/03: 設定スキーマ自体が `package.json` に無く、実装着手前のため、[doc/Requirements_Specification.md](../Requirements_Specification.md) 上で v0.2+ へ明示的に defer する
2. Webview 層の DOM テスト基盤は `jest-environment-jsdom`/`jsdom` の導入により `webviewContent.dom.test.ts` として着手済み（GUI カード CRUD の主要経路をカバー）。ただし VS Code Extension Development Host 上での本格的な E2E（Playwright 相当、右クリックメニューやアクティビティバーの実起動を含む）は投資規模が大きいため、引き続き v0.2 の技術的投資項目として計画する

### 7.4 新規定義済み・実装完了（Bucket 4）

2026-07-04 の要求拡張レビューで、GUI カード CRUD（FR-KB-05〜08）と複数起動導線（FR-CMD-05/06）を新規に定義し、同日に実装した。2026-07-05 に Webview 層の DOM テスト基盤（`jsdom`）を追加し、`webviewContent.dom.test.ts`（新規、12 ケース）で add-card フォーム、edit-card フォーム、削除確認ダイアログ、完了切替チェックボックスを実 HTML/JS 上で検証した。ロジック層（extension.ts / messageHandler.ts / builder.ts / syncEngine.ts）は `extension.test.ts`、`messageHandler.test.ts`、`sync.test.ts`（TP-S-16）で自動検証済み。残っているギャップは次のとおり。

| 項目 | 状態 | 残ギャップ |
|------|------|----------|
| FR-KB-05〜08（GUI カード CRUD） | ✅ Verified | ロジックとコンポーネントレベル DOM テストの双方で自動検証済み。VS Code Extension Development Host 上での実ブラウザ確認は未実施 |
| FR-CMD-05/06（起動導線） | ⚠️ Partial | `package.json` の `when` 句と `viewsWelcome` の実動作は宣言的な contributes 設定であり自動テスト対象外。VS Code 上での手動確認が必要 |
| 回帰 | ✅ Verified | `npm run build` および `npm test`（131/131 passing）で既存のドラッグ移動・可逆性テストが引き続き Green |

次サイクルでは、FR-CMD-05/06 の手動確認記録の追加と、カードのドラッグ&ドロップ（FR-KB-04）の DOM テスト化を推奨する。

## 8. Sign-Off and Release Decision

- **Verification Lead**: AI (Copilot-assisted QA)
- **Sign-Off Date**: 2026-07-05
- **対象バージョン**: v0.1.0
- **判定**: 🟡 **Conditional Go**（無条件の APPROVED ではない）

**承認条件（今回リリースで許容する残債）**:
1. Domain coverage 34.81%（目標 70%）は、Parser を critical path とする現行スコープ定義の下では許容するが、次版では正対象とする
2. FR-CMD-03 / FR-CMD-04 / FR-CMD-05 / FR-CMD-06 は機能として出荷されているが自動検証が無い（宣言的 contributes 設定とコマンド登録のみ）ため、リリースノートまたは既知の問題として明記する
3. NFR-PERF-04 は未検証のため、正規表現タイムアウト検出の品質主張は保留とする
4. FR-SET-01〜03 は「対応予定」として案内しない。実装が無い旨を公開文書からも明確にする
5. ESLint は設定ファイル不在のため `npm run lint` が実行不可。lint 品質ゲートは今回のリリース判定から除外し、次版で `.eslintrc` 等の整備を行う

**次版に持ち越す条件**:
- 7章 Bucket 1 のテスト追加が完了するまで、コマンド系（FR-CMD-03/04）と NFR-PERF-04 の回帰保証は限定的である前提を維持する
- Domain coverage と Overall coverage が baseline に届くまで、品質ゲートは Warning 付きの Conditional 判定を継続する
- FR-CMD-05/06（起動導線）は VS Code 上での手動確認記録が揃うまで Partial 扱いとする

**リリースステータス**: マーケットプレイス提出は可能だが、既知の制約（7章）を CHANGELOG または既知の問題として明示した上で行うことを推奨する。

---

## 9. Verification History

### 9.1 MVP (v0.0.1) 時点の記録

- **Overall**: MVP Verification Complete（2026-07-03 時点の旧記録）
- **Coverage**: 31.86%（Parser 78.4%, Domain 28.0%, Sync 0% [deferred], Webview 0% [deferred]）
- **Build**: Success（46.3 KiB minified）
- **Tests**: 21/21 passing（100%）

```
Total Tests: 26 (4 categories)
Passed: 21 ✅ / Failed: 0 / Skipped: 5 (Sync/Webview - deferred to v0.1)

Coverage Breakdown (MVP):
├─ Parser:     78.4% ✅ (exceeds ≥75% baseline)
├─ Domain:     28.0% ⚠️  (below ≥70% baseline)
├─ Sync:        0.0%  [v0.1 planned]
└─ Webview:     0.0%  [v0.1 planned]

Performance (MVP, all exceeded targets at the time):
├─ Parse 10MB相当:  145ms  (target: <1s)     ✅
├─ Render 1000: 1.57ms (target: <200ms)  ✅
├─ Save-sync:   0.60ms (target: <500ms)  ✅
└─ Board ops:   0.99ms (target: <10ms)   ✅
```

### 9.2 v0.1.0 実装フェーズの記録（Phase E–G）

- ✅ **Phase E（Sync Layer）**: Jest mock framework による統合テスト。TP-S-01〜TP-S-15（15カテゴリ）。Sync coverage 22.01%
- ✅ **Phase F（Keyboard + WCAG AA）**: Arrow/Enter/Delete/Escape キーボード操作、3px focus outline、high contrast mode、skip-to-content link。TP-U-06〜TP-U-08
- ✅ **Phase G（UI Integration + Performance）**: boardUpdate/syncStateChange/error/cardUpdated のメッセージハンドリング、1000カード描画 <200ms（※ writer 時間ベース、6.1参照）、TP-U-12〜TP-U-15

この履歴時点の Sign-Off では「96/96 tests passing（38.4% coverage）を根拠に APPROVED」としていたが、Overall coverage 38.4% は目標 40% を下回っており、旧 Sign-Off の PASS 表記は誤りだった。本改版（2026-07-03 rebuild）でこの点を是正済み（8章参照）。

### 9.3 Phase 1〜5 の完了チェック（旧テンプレート）

- [x] Phase 1 Completion: Requirements verification
- [x] Phase 2 Completion: Architecture & design verification
- [x] Phase 3 Completion: MVP implementation verification
- [x] Phase 4 Completion: Quality gate verification（ただし Conditional、8章参照）
- [ ] Phase 5 Completion: Orchestration & regression verification（TP-REG-01〜03 未実装のため未完了）

---

## 10. CI/CD Integration and Manual Checklist

### 10.1 Automated Verification

- **Build**: `npm run build` on each push（target: 0 errors, < 100 KiB）
- **Lint**: `npm run lint` on each PR（target: 0 violations）
- **Tests**: `npm test` on each PR（target: 100% pass rate）
- **Coverage**: `npm test -- --coverage` on each PR
  - Parser: ≥ 75%（critical path）
  - Domain: ≥ 70%（critical path、現状未達 — 7章 Bucket 1/9.2 参照）
  - Overall: ≥ 40%（現状僅少未達 — 7章 Bucket 1/9.2 参照）
- **Package**: Generate `.vsix` on tag（SemVer）

### 10.2 Manual Verification Checklist

Before release:
- [x] All automated tests passing locally（96/96）
- [ ] Manual smoke tests completed for FR-CMD-01/02/03/04（コマンド実行、ジャンプ、ステータスバー状態遷移）
- [x] README updated
- [x] CHANGELOG updated
- [ ] VSIX generated and tested
- [ ] 既知の問題（7章）をリリースノートに明記
