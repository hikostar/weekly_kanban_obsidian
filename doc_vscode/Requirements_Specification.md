# 要求仕様書- Weekly Kanban Markdown Sync Extension

作成日: 2026-07-02  
対象: Weekly Kanban VS Code Extension (TypeScript / Node.js)  
定義方針: Markdown をデータ正本とし、Kanban ビューと双方向同期する。

## 1. Goal

- Markdown ファイル（Frontmatter + セクション）を唯一の正本として、週次タスクを管理する。
- Kanban ビューでカード操作ができ、変更が Markdown へ自動反映される。
- 検証可能な要求として、実装証跡とテスト証跡を付与し追跡可能性を確保する。

## 2. Non-goals

- 複数Markdown ファイルの統合表示（スコープ外）。
- 外部 API 連携（GitHub Issues など）（スコープ外）。
- 自動競合解決の複雑なマージロジック（段階実装）。
- 複数ユーザーの同時編集サポート（単一ユーザー前提）。

## 3. Constraints

- 1回の Kanban 表示対象は 1 Markdown ファイル/1 週 とする。
- ワークスペース内には複数の `weekly-*.md` ファイルが存在しうる。複数候補が見つかった場合は、ユーザーが対象ファイルを選択する。
- 想定ファイルサイズは約 10MB とする。
- Markdown 保存時同期を基本としつつ、Kanban 側の編集は短いデバウンス後に Markdown 反映処理へ進める。
- セクション名は ToDo/Doing/Done を固定とする。

## 4. Functional Requirements

### 4.1 Markdown ファイル管理

- FR-MD-01: ユーザーは Frontmatter + セクション形式の Markdown を開けること。
- FR-MD-02: 開く対象に Frontmatter の週情報（年/週番号）が存在すること。
- FR-MD-03: ユーザーは Markdown エディタで直接編集できること。
- FR-MD-04: Markdown 保存時に Kanban ビューが自動更新されること。

### 4.2 Kanban 表示

- FR-KB-01: Kanban ボードは ToDo / Doing / Done の 3 列を表示すること。
- FR-KB-02: 各カラムに タスクカード一覧が表示されること。
- FR-KB-03: カード情報は タイトル、カードID、ラベル、期限を表示すること。
- FR-KB-04: ユーザーはカードをドラッグしてセクション間で移動できること。
- FR-KB-05: ユーザーは Kanban ビュー上で GUI 操作によりカードを新規作成できること。作成時にタイトルを入力し、対象カラムを指定できること。
- FR-KB-06: ユーザーは Kanban ビュー上で GUI 操作により既存カードのタイトル・ラベル・期限を編集できること。
- FR-KB-07: ユーザーは Kanban ビュー上で GUI 操作によりカードを削除できること。削除前に確認ダイアログを表示すること。
- FR-KB-08: ユーザーは Kanban ビュー上で GUI 操作によりカードの完了/未完了を切り替えられること。

### 4.3 双方向同期

- FR-SYNC-01: Markdown 編集 → Kanban 表示 反映が完了すること。
- FR-SYNC-02: Kanban 編集（ドラッグなど） → Markdown 更新要求を生成すること。
- FR-SYNC-03: Kanban 編集はデバウンス後に Markdown 反映処理へ進み、必要に応じて Save Weekly File コマンドでも明示反映できること。
- FR-SYNC-04: 同期失敗時はユーザーへ失敗メッセージを通知すること。

### 4.4 コマンド・UI

- FR-CMD-01: "Open Kanban View" コマンドで Kanban ビューを開けること。
- FR-CMD-02: "Open Weekly File" コマンドで週次 Markdown を開けること。候補が複数ある場合は選択 UI を表示すること。
- FR-CMD-03: Kanban カードをクリックして Markdown 内の対応行へジャンプできること。
- FR-CMD-04: ステータスバーに同期状態（成功/失敗）を表示できること。現在対象の Markdown ファイルを識別できること。
- FR-CMD-05: ユーザーはエクスプローラー上で `weekly-*.md` に一致する Markdown ファイルを右クリックし、コンテキストメニューから対象ファイルの Kanban ビューを開けること。
- FR-CMD-06: ユーザーは VS Code アクティビティバーの Weekly Kanban アイコンから Kanban ビューを開けること。対象ファイルが未確定の場合は、FR-CMD-02 と同様の選択 UI を表示すること。

### 4.5 将来設定項目（v0.2+ 以降へ Deferred）

- FR-SET-01: カードID生成規則（UUID/連番/slug）を設定できること。
- FR-SET-02: セクション名の国際化対応（ToDo/Doing/Done 固定 vs 別名許可）を設定できること。
- FR-SET-03: Kanban ビューの列幅・カード高さをユーザー設定で保存できること。

現行バージョン v0.1.0 では、上記の設定スキーマは未提供であり、公開機能の対象外とする。

## 5. Non-functional Requirements

- NFR-PERF-01: 10MB Markdown ファイルの解析完了は 1 秒以内であること。
- NFR-PERF-02: Kanban 再描画は 200ms 以内に完了すること。
- NFR-PERF-03: Markdown 保存時の同期処理は 500ms 以内に完了すること。
- NFR-PERF-04: 正規表現パースタイムアウトは 250ms で検出されること。
- NFR-REL-01: Markdown 可逆性（読み書き後に元の意味情報と補助情報が保持）が確保されること。
- NFR-ACC-01: Kanban 操作は WCAG 2.1 AA レベルのアクセシビリティを満たすこと。
- NFR-PLAT-01: VS Code 1.85.0 以上で動作すること。

## 6. Acceptance Criteria

- AC-MD-01 (FR-MD-01):
  - Given Frontmatter + セクション形式の Markdown ファイル
  - When ファイルを開く
  - Then Frontmatter から週情報が抽出され、Kanban カードが展開される

- AC-KB-01 (FR-KB-01/02/03):
  - Given Kanban ビューが表示
  - When Markdown に有効なカード定義が存在
  - Then 3 列（ToDo/Doing/Done）に対応するカードが並ぶ

- AC-SYNC-01 (FR-SYNC-01):
  - Given Markdown がエディタで編集・保存
  - When Markdown 保存イベント発火
  - Then Kanban ボードがリアルタイム更新される

- AC-SYNC-02 (FR-SYNC-02/03):
  - Given Kanban ビューのカード
  - When カードをドラッグして別セクションへ移動
  - Then Kanban 編集は短いデバウンス後に Markdown 反映処理へ進み、必要に応じて Save Weekly File コマンドでも明示反映できる

- AC-CMD-01 (FR-CMD-01/02):
  - Given コマンドパレット開放
  - When "Open Kanban View" または "Open Weekly File" 実行
  - Then 対応するビューまたはファイルが開く

- AC-CMD-02 (FR-CMD-03):
  - Given Kanban カードが表示
  - When カードをクリック
  - Then Markdown エディタの対応行へカーソルが移動する

- AC-KB-02 (FR-KB-05):
  - Given Kanban ビューのいずれかのカラム
  - When ユーザーが GUI の「カード追加」操作でタイトルを入力し確定
  - Then 新しいカードが対象カラムに追加され、Markdown へ反映される

- AC-KB-03 (FR-KB-06):
  - Given Kanban ビュー上の既存カード
  - When ユーザーが GUI 操作でタイトル・ラベル・期限を編集し確定
  - Then カードの表示内容が更新され、Markdown へ反映される

- AC-KB-04 (FR-KB-07/08):
  - Given Kanban ビュー上の既存カード
  - When ユーザーが削除操作を確認、または完了/未完了を切り替え
  - Then カードが削除または状態変更され、Markdown へ反映される

- AC-CMD-03 (FR-CMD-05):
  - Given エクスプローラーで `weekly-*.md` ファイルを右クリック
  - When コンテキストメニューから "Open Kanban View" を選択
  - Then 対象ファイルの Kanban ビューが開く

- AC-CMD-04 (FR-CMD-06):
  - Given アクティビティバーの Weekly Kanban アイコン
  - When アイコンをクリック
  - Then Kanban ビューが開く。対象ファイル未確定の場合は選択 UI が表示される

## 7. Test Coverage

### 7.1 Parser Unit Tests
- Markdown ファイルの読み込みと構造解析
- Frontmatter 抽出と形式検証
- カード定義の正規表現パース

### 7.2 Sync Integration Tests
- Markdown 編集 → Kanban 表示反映
- Kanban 編集 → Markdown 自動反映処理と明示保存反映
- 同期タイムアウトと失敗通知

### 7.3 UI Component Tests
- Kanban カラムの描画
- カード要素のドラッグアンドドロップ
- ステータスバー表示の更新
- GUI からのカード追加・編集・削除・完了切替操作

### 7.4a Entry Point Tests
- コマンドパレットからの Kanban ビュー起動
- `weekly-*.md` 右クリックメニューからの Kanban ビュー起動
- アクティビティバーの Weekly Kanban アイコンからの Kanban ビュー起動と、対象ファイル未確定時の選択 UI 表示

### 7.4 Performance Tests
- 10MB Markdown ファイル解析時間計測
- 1000 件カード表示時の再描画速度

### 7.5 Regression Tests
- 既存 Markdown フォーマットとの後方互換性
- 保存前後のデータ整合性確認

## 8. Future Considerations (Post-MVP)

- FR-EXT-01: 複数週の Kanban 統合表示（ビューフィルタ）。
- FR-EXT-02: MCP サーバー連携による AI タスク自動分類。
- FR-EXT-03: GitHub Issues / Notion との双方向同期。
- FR-EXT-04: チーム共有モード（競合解決ロジック）。
