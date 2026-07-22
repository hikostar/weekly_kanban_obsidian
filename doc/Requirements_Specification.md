# 要求仕様書 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Weekly Kanban Obsidian Plugin (TypeScript / Obsidian API)  
定義方針: Vault 内の週次 Markdown を正本とし、Obsidian の ItemView 表示とモーダル編集を通じて双方向同期する。

## 1. Goal

- Vault 内の週次 Markdown ファイルを唯一の正本として、週ごとのタスクを管理する。
- Obsidian の ItemView に Kanban ビューを表示し、必要に応じてモーダルからカード編集を行えること。
- 編集内容は Markdown に可逆的に反映され、コメント、空行、未知の Frontmatter を保持すること。

## 2. Non-goals

- 複数 Vault の横断集約表示。
- 外部 API 連携（GitHub Issues など）。
- 自動競合解決の高度なマージロジック。
- 複数ユーザーの同時編集サポート。

## 3. Constraints

- 1回の Kanban 表示対象は 1 Markdown ファイル / 1 週とする。
- Vault 内には複数の週次 Markdown が存在しうる。対象が複数ある場合はユーザーに選択させる。
- 対象ファイルは Vault 内の毎週の Markdown を継続更新する運用とし、次週のファイルは前週の内容を引き継いで作成・更新する。
- セクション名は ToDo / Doing / Done を固定とする。
- 想定ファイルサイズは約 10MB とする。
- Kanban 側の編集は短いデバウンス後に Markdown 反映処理へ進める。

## 4. Functional Requirements

### 4.1 Markdown ファイル管理

- FR-MD-01: ユーザーは Frontmatter + セクション形式の Markdown を開けること。
- FR-MD-02: 開く対象に Frontmatter の週情報（年 / 週番号）が存在すること。
- FR-MD-03: ユーザーは Markdown エディタで直接編集できること。
- FR-MD-04: Markdown 保存時に Kanban ビューが自動更新されること。

### 4.2 Kanban 表示

- FR-KB-01: Kanban ボードは ToDo / Doing / Done の 3 列を表示すること。
- FR-KB-02: 各カラムにタスクカード一覧が表示されること。
- FR-KB-03: カード情報はタイトル、カード ID、ラベル、期限を表示すること。
- FR-KB-04: ユーザーはカードをドラッグしてセクション間で移動できること。
- FR-KB-05: ユーザーは Kanban ビュー上の操作でカードを新規作成できること。作成時にタイトルを入力し、対象カラムを指定できること。
- FR-KB-06: ユーザーは Kanban ビュー上の操作で既存カードのタイトル・ラベル・期限を編集できること。
- FR-KB-07: ユーザーは Kanban ビュー上の操作でカードを削除できること。削除前に確認モーダルを表示すること。
- FR-KB-08: ユーザーは Kanban ビュー上の操作でカードの完了 / 未完了を切り替えられること。

### 4.3 双方向同期

- FR-SYNC-01: Markdown 編集 → Kanban 表示の反映が完了すること。
- FR-SYNC-02: Kanban 編集（ドラッグなど） → Markdown 更新要求を生成すること。
- FR-SYNC-03: Kanban 編集はデバウンス後に Markdown 反映処理へ進み、必要に応じて明示保存コマンドでも反映できること。
- FR-SYNC-04: 同期失敗時はユーザーへ失敗メッセージを通知すること。

### 4.4 コマンド・UI

- FR-CMD-01: Open Kanban View コマンドで Kanban ビューを開けること。
- FR-CMD-02: Open Weekly File コマンドで週次 Markdown を開けること。候補が複数ある場合はファイル選択モーダルを表示すること。
- FR-CMD-03: Kanban カードをクリックして Markdown 内の対応行へジャンプできること。
- FR-CMD-04: ステータスに同期状態（成功 / 失敗）を表示できること。現在対象の Markdown ファイルを識別できること。
- FR-CMD-05: ユーザーはファイルメニューやコンテキストメニューから対象ファイルの Kanban ビューを開けること。
- FR-CMD-06: ユーザーは Obsidian のリボンやコマンドパレットから Kanban ビューを開けること。対象ファイルが未確定の場合は FR-CMD-02 と同様のファイル選択モーダルを表示すること。

### 4.5 Settings

- FR-SET-01: カード ID 生成規則（UUID / 連番 / slug）を設定できること。
- FR-SET-02: セクション名の国際化対応を設定できること。
- FR-SET-03: Kanban ビューの列幅・カード高さをユーザー設定で保存できること。

現行バージョン v0.1.0 では、上記の設定スキーマは公開機能の対象外とする。

## 5. Non-functional Requirements

- NFR-PERF-01: 10MB Markdown ファイルの解析完了は 1 秒以内であること。
- NFR-PERF-02: Kanban 再描画は 200ms 以内に完了すること。
- NFR-PERF-03: Markdown 保存時の同期処理は 500ms 以内に完了すること。
- NFR-PERF-04: 正規表現パースタイムアウトは 250ms で検出されること。
- NFR-REL-01: Markdown 可逆性が確保されること。
- NFR-ACC-01: Kanban 操作は WCAG 2.1 AA レベルのアクセシビリティを満たすこと。
- NFR-PLAT-01: Obsidian の対応バージョンで動作すること。

## 6. Acceptance Criteria

- AC-MD-01:
  - Given Frontmatter + セクション形式の Markdown ファイル
  - When ファイルを開く
  - Then Frontmatter から週情報が抽出され、Kanban カードが展開される

- AC-KB-01:
  - Given Kanban ビューが表示されている
  - When Markdown に有効なカード定義が存在する
  - Then 3 列（ToDo / Doing / Done）に対応するカードが並ぶ

- AC-SYNC-01:
  - Given Markdown がエディタで編集・保存される
  - When 保存イベントが発火する
  - Then Kanban ボードが更新される

- AC-SYNC-02:
  - Given Kanban ビューのカード
  - When カードをドラッグして別セクションへ移動する
  - Then Kanban 編集は短いデバウンス後に Markdown 反映処理へ進む

- AC-CMD-01:
  - Given コマンドパレットまたはリボン操作
  - When Open Kanban View または Open Weekly File を実行する
  - Then 対応するビューまたはファイルが開く

- AC-CMD-02:
  - Given Kanban カードが表示されている
  - When カードをクリックする
  - Then Markdown の対応行へカーソルが移動する

- AC-KB-02:
  - Given Kanban ビューのいずれかのカラム
  - When ユーザーがカード追加操作でタイトルを入力し確定する
  - Then 新しいカードが対象カラムに追加され、Markdown へ反映される

- AC-KB-03:
  - Given Kanban ビュー上の既存カード
  - When ユーザーがタイトル・ラベル・期限を編集し確定する
  - Then カードの表示内容が更新され、Markdown へ反映される

- AC-KB-04:
  - Given Kanban ビュー上の既存カード
  - When ユーザーが削除操作を確認、または完了 / 未完了を切り替える
  - Then カードが削除または状態変更され、Markdown へ反映される

- AC-CMD-03:
  - Given ファイルやリボンから対象ファイルを選択する
  - When Kanban ビュー起動操作を行う
  - Then 対象ファイルの Kanban ビューが開く

- AC-CMD-04:
  - Given リボンまたはコマンドから起動する
  - When Kanban ビューを開く
  - Then 対象ファイル未確定の場合はファイル選択モーダルが表示される

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
- ステータス表示の更新
- GUI からのカード追加・編集・削除・完了切替操作

### 7.4 Entry Point Tests

- コマンドパレットからの Kanban ビュー起動
- ファイルメニューやコンテキストメニューからの起動
- リボンからの Kanban ビュー起動と、対象ファイル未確定時のファイル選択モーダル表示

### 7.5 Performance Tests

- 10MB Markdown ファイル解析時間計測
- 1000 件カード表示時の再描画速度

### 7.6 Regression Tests

- 既存 Markdown フォーマットとの後方互換性
- 保存前後のデータ整合性確認

## 8. Future Considerations

- FR-EXT-01: 複数週の Kanban 統合表示。
- FR-EXT-02: AI 補助によるタスク分類。
- FR-EXT-03: 外部タスク管理サービスとの双方向同期。
- FR-EXT-04: チーム共有モードの競合解決ロジック。
