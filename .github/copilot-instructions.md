<!-- Weekly Kanban VS Code拡張機能 向け Copilot カスタム指示 -->

## プロジェクト概要
- **プロジェクト**: Weekly Kanban - Markdown Sync VS Code Extension
- **言語**: TypeScript / Node.js
- **対象**: VS Code 1.85.0+
- **データモデル**: Markdown + Frontmatter（信頼できる情報源）↔ Kanban Webview（双方向同期）

## アーキテクチャ原則

### 0. コアの依存方向
- Extension → Core（parser, sync, domain） → Utilities
- Core から Extension や Utilities への逆方向依存は禁止

### 1. レイヤー分離
- **プレゼンテーション層** (extension.ts, webview/): VS Code API連携、コマンド処理、UI描画
- **ドメイン層** (domain/): Kanbanデータモデル、ビジネスロジック、外部依存なし
- **パーサー層** (parser/): Markdown ↔ Kanban 変換、可逆性の保証
- **同期層** (sync/): ファイル変更検知、変更の適用、競合検知

### 2. Markdown → Kanban のデータフロー
```
Markdown File → Parser (parse) → Domain Model → Sync (observe) → Webview Render
```

### 3. Kanban → Markdown のデータフロー
```
Webview (user edit) → Sync (generate changeset) → Parser (apply) → Markdown File
```

## 実装上の制約

### 非機能要件
- Markdownの可逆性: 元のコメント、未知の行、空白を保持すること
- パフォーマンス: 10MBファイルのパース1秒未満、Webview描画200ms未満、保存から同期まで500ms未満
- アクセシビリティ: Kanban UIはWCAG 2.1 AA準拠
- 正規表現タイムアウト: いかなるパターン評価も最大250ms

### 機能スコープ（MVP）
- 含む: Markdown → Kanban表示、保存時同期、カードメタデータ抽出、3カラムレイアウト
- 含まない: 自動競合解決、外部API連携、複数ファイル集約、チームコラボレーション

### コード品質基準
- 厳格なTypeScript（明示的な正当化なしに`any`を使用しない）
- エラー処理: 不正な入力でクラッシュしないこと。代わりにStatusMessageを返す
- テスト: 
  - パーサー単体テスト（可逆性）: カバレッジ75%以上
  - ドメイン層テスト: カバレッジ70%以上
  - 全体（MVP目標）: カバレッジ40%以上（Sync/Webviewはv0.1でテスト）
  - パフォーマンスベンチマーク: 10MBパース1秒未満、1000カード描画200ms未満

## ファイル構成
```
src/
  extension.ts          # メインエントリ、activation events、コマンドハンドラ
  domain/
    kanban.ts           # Kanbanデータ構造 (Board, Column, Card)
    markdown.ts         # Markdown Frontmatter & セクションモデル
  parser/
    markdownParser.ts   # M→K 変換
    kanbanWriter.ts     # K→M 変換（可逆）
  sync/
    fileWatcher.ts      # Markdown変更の監視
    syncEngine.ts       # 双方向の変更適用
  webview/
    webviewPanel.ts     # Kanban UIホスト
    webviewContent.ts   # ボード表示用HTML + CSS + JS
  test/
    parser.test.ts
    sync.test.ts
    ui.test.ts
    performance.test.ts
```

## Customization 作成ルール

### 命名規約
- Agent 名は `Role + Agent` で統一する。例: `Implementation Agent`, `Quality Gate Agent`
- Skill 名は kebab-case のフォルダ名と frontmatter `name` を一致させる。例: `pull-request-review`
- Prompt 名は目的が分かる kebab-case を使う
- ファイル名の大文字小文字は既存正本に合わせる。検証仕様は必ず `Verification_Spec&Result.md` を使う

### Description 規約
- frontmatter `description` は必ず `Use when:` で始める
- `description` には用途だけでなく、判断対象や期待成果物が分かる語を含める
- 略語だけで済ませず、主要キーワードを列挙して発見性を落とさない

### パス・参照規約
- `.github/` 配下から `doc/` を参照するときは `../doc/...` を使う
- `.github/` 配下から同階層ファイルを参照するときは `.github/...` ではなく相対パスを使う。例: `AGENTS.md`
- 依存方向や責務境界は Weekly Kanban の構成に合わせ、`extension / domain / parser / sync / webview / tests / docs` を使い、`App/Core` は使わない

### 用語統一
- 検証観点は `通常系 / 異常系 / 境界系` で統一する
- 品質ゲート項目は `lint / build / test / coverage` を基本とする
- Agent の責務表現は `用途`, `担当範囲`, `主な制約`, `使用例` の粒度にそろえる

## PR・コミット規約

### コミットメッセージ形式
```
[Area] Short summary

Detailed description if needed.

Issue: #123
Relates to: Requirements FR-SYNC-01, FR-KB-02
```

### PRタイトル形式
```
[Area] Short summary
```
例: `[Parser] Add reversible comment preservation`, `[Sync] Fix timing race in save-event handler`

### PR説明テンプレート
**What changed?**
- Item 1
- Item 2

**Why?**
- Rationale

**Testing**
- Unit test: parser reversibility with comments
- Integration test: Markdown save → Kanban update
- Manual test: Drag card in Kanban, save, verify Markdown

**Verification**
- Build: ✓ `npm run build` passes
- Test: ✓ `npm test` 100% green
- Coverage: ✓ >80% line coverage (use `npm test -- --coverage`)
- Lint: ✓ `npm run lint` passes

## 主要な設計判断

1. **Markdownが信頼できる情報源**: Markdownが真実の情報源であり、Kanbanは派生ビューである。
   - 含意: 競合時はMarkdownが優先される。Kanbanの編集はsave()を通じてのみ永続化される。

2. **可逆パーサー**: 非意味的なMarkdown（コメント、空白、未知のYAMLキー）を保持する
   - AST方式を使用し、行範囲を追跡し、最小限の書き換えを適用する

3. **カード識別**: 移動と編集を区別するため、安定したカードID（UUIDまたはスラッグベース）を使用する
   - IDはMarkdownメタデータ（YAMLまたはHTMLコメント）に保存する

4. **メッセージとしてのエラー**: 不正な入力でも例外をスローしない。
   - `{ status: 'error', message: 'Invalid Frontmatter at line 5' }` を返す
   - VS Code通知に表示する

5. **非同期同期**: ファイル監視と保存は非同期。連続編集にはデバウンスを使用する。
   - デバウンス: Kanban → Markdown書き込みは300ms
   - スロットル: Markdown → Kanban読み込みは500ms

## テスト要件

### 単体テスト (src/test/*.test.ts)
- パーサー: Markdownのラウンドトリップ保持
- ドメイン: Kanban操作（カードの追加・移動・削除）

### 結合テスト (src/test/integration.test.ts)
- ファイル監視 + パース + 表示のフロー
- Kanban編集 + 同期 + Markdown保存のフロー
- 競合検知（両方の情報源が同時に編集された場合）

### パフォーマンステスト (src/test/performance.test.ts)
- 10MB Markdownのパース時間
- 1000カードのKanban描画時間
- 保存から表示までのレイテンシ

### UIテスト (src/test/ui.test.ts)
- Kanbanカラムの描画
- カードのドラッグ&ドロップ動作
- ステータスバーメッセージの表示

## デプロイ・バージョニング

- **バージョン形式**: SemVer (MAJOR.MINOR.PATCH)
- **リリース**: mainブランチにタグ付け、GitHub Release + .vsixアーティファクト
- **CI**: pushごとにGitHub Actions（lint, test, coverage, build）を実行

## 関連ファイル・参照

- [AGENTS.md](AGENTS.md): Copilotエージェント、スキル、プロンプトのカタログ
- [customization-style-guide.md](customization-style-guide.md): `.github/` 配下customizationの命名規約と表記規約
- [dev-workflow.md](dev-workflow.md): Agent / Skill を使った標準開発フロー
- [Requirements_Specification.md](../doc/Requirements_Specification.md): FR/NFR/ACマトリクス
- [Design_Specification.md](../doc/Design_Specification.md): アーキテクチャ & データモデル
- [Verification_Spec&Result.md](../doc/Verification_Spec&Result.md): テスト計画 & 結果
- [User_Manual.md](../doc/User_Manual.md): ユーザー操作 & キーバインド

## Skill 利用指針

- **delivery-orchestration**: 要件定義、設計、検証計画、実装、品質ゲート、リリース判断までを一気通貫で統括するときに使う
- **development-support**: 実装前の調査、責務境界整理、テスト方針整理、ドキュメント更新点の洗い出しを行うときに使う
- **pull-request-review**: PR差分を設計仕様と検証仕様に照らしてレビューするときに使う

Agent は工程ごとの意思決定や成果物作成を担い、Skill は横断的な支援や運用フローの補助に使う。

## Customization更新チェックリスト

`.github/` 配下のagent、skill、prompt、instructions、補助文書を更新する場合は、次を最低限確認する。

1. `description` が `Use when:` で始まり、用途だけでなく判断対象や期待成果物も含んでいる。
2. `AGENTS.md` の説明、frontmatter `description`、`argument-hint`、使用例が矛盾していない。
3. `JsonEditor`, `dotnet`, `App/Core`, `Verification_Spec&result` のような旧前提が残っていない。
4. `.github/` 配下からの相対リンクが正しい。`doc/` 参照は `../doc/...`、同階層参照は `AGENTS.md` のように書く。
5. README、AGENTS、dev-workflow、関連promptの導線が最新のagent / skill構成と一致している。
6. Agent 名は `Role + Agent`、Skill 名は kebab-case と frontmatter `name` の一致を守っている。
7. 検証系の正本ファイル名は `Verification_Spec&Result.md` を使い、大文字小文字差分を混ぜていない。

## Copilot 標準フロー

1. **Requirements Definition Agent**: Goal / Non-goals / Constraints / AC / Requirement ID を整理する
2. **Design Review Agent**: 要件とアーキテクチャ制約の整合性を確認する
3. **Solution Design Agent**: 設計レビューで曖昧さが残る場合に、影響範囲、リスク、実装順序を明文化する
4. **Verification & Test Design Agent**: 通常系・異常系・境界系を含む検証計画とトレーサビリティを確定する
5. **Implementation Agent**: 設計確定済みタスクを最小差分で実装し、関連テストを更新する
6. **Quality Gate Agent**: `lint / build / test / coverage` の品質ゲートを判定する
7. **Documentation Author Agent**: 設計書、検証結果、操作マニュアル、PR説明を更新する
8. **Release Readiness Agent**: 品質ゲート結果と残存リスクから Go / No-Go を判定する

要件定義からリリース判断まで一気通貫で進める場合は、**Orchestration Delivery Agent** を起点にして、各工程への委譲順序と完了条件を管理する。

## Copilotエージェントワークフロー

このプロジェクトには、開発を支援する段階的なエージェントワークフローが用意されている。

1. **Requirements Definition Agent** (`.github/agents/requirements-definition.agent.md`)
   - 要件定義、受け入れ条件定義、非機能要件整理、スコープ明確化を行う
   - Goal / Non-goals / Constraints / AC / Requirement ID を整理する
   - 曖昧な受け入れ条件や証跡範囲の抜けを残さない

2. **Design Review Agent** (`.github/agents/design-review.agent.md`)
   - 実装前に仕様との整合性を検証する
   - アーキテクチャ制約（レイヤー分離、イミュータビリティ）を確認する
   - テスト対象とリグレッションポイントを洗い出す

3. **Solution Design Agent** (`.github/agents/solution-design.agent.md`)
   - 設計レビューで曖昧さが残る場合に、影響範囲、リスク、実装順序を整理する
   - 実装と Verification Agent への handoff を設計する
   - 要件ID未確定のまま設計を確定しない

4. **Verification & Test Design Agent** (`.github/agents/verification-test-design.agent.md`)
   - 要件IDに紐づいた検証計画を作成する
   - 正常系・異常系・境界系のテストカバレッジを強化する
   - 品質ゲート向けのトレーサビリティとハンドオフメモを準備する

5. **Implementation Agent** (`.github/agents/implementation.agent.md`)
   - 設計承認済みのタスクを最小差分で実行する
   - ビルド、テスト、制約遵守を検証する
   - 変更内容と技術的リスクを文書化する

6. **Quality Gate Agent** (`.github/agents/quality-gate.agent.md`)
   - lint、build、test、coverageチェックを実行する
   - プロジェクトのベースラインと照合する
   - 詳細な失敗内容と復旧計画を報告する

7. **Documentation Author Agent** (`.github/agents/documentation-author.agent.md`)
   - 設計書、ユーザーマニュアル、検証結果ドキュメントを実装と整合させる
   - 要件、設計、テスト証跡間の一貫性を維持する

8. **Release Readiness Agent** (`.github/agents/release-readiness.agent.md`)
   - 残存リスクと出荷条件を評価する
   - 品質エビデンスからGo / No-Go判断を導き出す

9. **Orchestration Delivery Agent** (`.github/agents/delivery-orchestration.agent.md`)
   - 要件定義から設計、検証計画、実装、品質ゲート、ドキュメント更新、リリース判定までを一気通貫で統括する
   - 工程ごとの委譲順序、完了条件、残課題を管理する
   - 未検証のまま完了宣言しない

詳細な使用方法は [AGENTS.md](AGENTS.md) を参照。

