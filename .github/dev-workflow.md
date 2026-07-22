# Developer Workflow with Copilot Agents & Skills

このドキュメントは、Weekly Kanban 開発時に Copilot Agent と Skill を活用する標準ワークフローを定義します。

## 🚀 標準ワークフロー（新機能追加）

### フェーズ 1: 要件定義（15-30 分）

機能追加のアイデアが出たら、まず要件を明確にします。

**ツール**: `@requirements-definition Requirements Definition Agent`

```
@requirements-definition Requirements Definition Agent
対象機能: [機能の目的]
背景: [なぜ必要か]
成功条件:
1. [受け入れ条件1]
2. [受け入れ条件2]
3. [受け入れ条件3]
制約: [制約条件]
```

**出力物**: 検証済み要件定義ドキュメント

---

### フェーズ 2: 設計レビュー（10-20 分）

要件が確定したら、アーキテクチャ制約（層分離、イミュータビリティ、可逆性）との適合性確認を行います。

**ツール**: `@design-review Design Review Agent`

```
@design-review Design Review Agent
[フェーズ 1 の要件定義出力をペースト]
```

**確認項目**:
- ✓ 層分離制約に違反していないか
- ✓ Immutability ルール遵守
- ✓ Parser 可逆性への影響は無いか
- ✓ Result<T> エラーハンドリングで対応可能か

**出力物**:
- 仕様整合性確認結果
- 対象要件ID マッピング
- 影響を受ける層（domain/parser/sync/presentation/plugin）
- テスト対象候補

**判定**:
- ✓ Approved → フェーズ 3 へ
- ⚠️ Ambiguous → フェーズ 2.5 へ
- ✗ Conflict → 要件定義に戻る（フェーズ 1）

---

### フェーズ 2.5: ソリューション設計（必要に応じて、20-40 分）

設計レビューで曖昧さが指摘された場合、詳細な設計を行います。

**ツール**: `@solution-design Solution Design Agent`

```
@solution-design Solution Design Agent
設計上の疑問点: [設計レビューで指摘された曖昧さ]
対象範囲: [影響を受ける領域]
期待: 影響範囲、リスク、実装順序、Verification Agent への handoff を整理
```

**出力物**: 設計方針決定ドキュメント

---

### フェーズ 3: 検証計画（10-20 分）

実装前に、通常系・異常系・境界系を含む検証計画を確定します。

**ツール**: `@verification-test-design Verification & Test Design Agent`

```
@verification-test-design Verification & Test Design Agent
要件ID: [設計レビューで確認された要件ID]
対象範囲: [影響を受けるファイルまたは層]
期待:
- 通常系・異常系・境界系をそれぞれ最低1件ずつ含める
- TP-* と要件IDの対応表を更新する
- Quality Gate へ渡す未自動化項目を明示する
```

**出力物**:
- Verification Plan
- Traceability Matrix
- Test Design Matrix
- Handoff Notes

---

### フェーズ 4: 実装（30-60 分）

設計が確定したら実装を開始します。

**ツール**: `@implementation Implementation Agent`

```
@implementation Implementation Agent
設計: [フェーズ 2 または 2.5 の設計出力をペースト]
対象ファイル: src/[layer]/[file].ts
受け入れ条件: [要件定義から]
関連要件ID: [FR/NFR/AC]
```

**実装時のチェックリスト**:
- [ ] TypeScript Strict Mode パス
- [ ] ビルド成功（`npm run build`）
- [ ] テスト成功（`npm test`）
- [ ] カバレッジ基準達成（Parser ≥75%, Domain ≥70%）
- [ ] ESLint パス（`npm run lint`）

**出力物**: 実装コード、テストコード、変更ドキュメント

---

### フェーズ 5: 検証証跡更新（10 分）

実装差分に合わせて検証証跡を更新し、Quality Gate に渡す材料を揃えます。

**ツール**: `@verification-test-design Verification & Test Design Agent`

```
@verification-test-design Verification & Test Design Agent
実装差分に合わせて TP-*、coverage 差分、残存 gap、Quality Gate への handoff を整理してください。
```

**出力物**:
- 更新済み Traceability Matrix
- Coverage Report
- Open Risks
- Handoff Notes

---

### フェーズ 6: ローカル品質ゲート（5-10 分）

コミット前に、品質ゲート判定を実施します。

**ツール**: `@quality-gate Quality Gate Agent`

```
@quality-gate Quality Gate Agent
[ローカルでビルド・テストが成功したことを確認してから実行]
```

**検証項目**:
- ✓ ESLint パス
- ✓ Build 成功
- ✓ Test 成功
- ✓ Coverage 基準達成

**判定**:
- ✓ Pass → コミットして PR へ
- ✗ Fail → 修正して再実行

---

### フェーズ 7: コミット＆PR（5 分）

品質ゲートをパスしたら、コミットして PR を作成します。

**コミットメッセージ形式**:
```
[Area] Short summary

Detailed description if needed.

Issue: #123 (if applicable)
Relates to: [要件ID]
```

**PR テンプレート**: [.github/pull_request_template.md](.github/pull_request_template.md) に従う

**PR 本文に含める**:
1. フェーズ 2 の設計レビュー出力
2. フェーズ 4 の実装成果物
3. テスト実行結果
4. ドキュメント更新点

---

### フェーズ 8: PR レビュー＆マージ（Team）

チーム側の PR レビュープロセス。

**ツール**: pull-request-review Skill + @design-review（必要に応じて）

**チェックリスト**:
- [ ] 仕様整合性確認
- [ ] コード品質確認
- [ ] テストカバレッジ確認
- [ ] ドキュメント更新確認

**CI チェック**:
- ✓ Lint パス
- ✓ Build パス
- ✓ Test パス
- ✓ Coverage 要件達成

**判定**: Approve & Merge

---

### フェーズ 9: ドキュメント仕上げとリリース判定（10-20 分）

実装と検証結果をドキュメントへ反映し、必要なら出荷判定まで行います。

**ツール**: `@documentation-author Documentation Author Agent` と `@release-readiness Release Readiness Agent`

```
@documentation-author Documentation Author Agent
作業目的: ドキュメント更新
変更内容: [実装内容の要約]
対象ファイル: doc/Design_Specification.md, doc/Verification_Spec&Result.md, doc/User_Manual.md
期待成果物: ドキュメント更新案
```

```
@release-readiness Release Readiness Agent
品質ゲート結果と残存 gap を踏まえて、v0.x の出荷可否を判定してください。
```

**更新対象**:
- `doc/Design_Specification.md` — アーキテクチャ図、データモデル更新
- `doc/Verification_Spec&Result.md` — テスト結果更新
- `doc/User_Manual.md` — ユーザー向け機能説明追加（ユーザー機能の場合）

---

## ⚡ 高速パス（バグ修正・ドキュメント変更）

小規模な変更（≤50 行、ドキュメント変更のみ）の場合、以下をスキップ可能：

- フェーズ 2.5（ソリューション設計）
- フェーズ 3（検証計画）

**最小ワークフロー**:
```
設計レビュー → 検証計画 → 実装 → ローカル品質ゲート → コミット＆PR
```

---

## 🎯 ワークフロー選択ガイド

| シナリオ | 対象フェーズ | 所要時間 |
|--------|-----------|--------|
| 新機能追加（通常） | 1→2→3→4→5→6→7 | 60-120 min |
| 新機能追加（複雑） | 1→2→2.5→3→4→5→6→7→9 | 100-150 min |
| バグ修正（軽微） | 設計レビュー→検証計画→実装→品質ゲート | 15-30 min |
| ドキュメント変更 | ドキュメント更新→ローカルチェック→PR | 10-20 min |
| 仕様曖昧時の相談 | dev-support Skill | 5-10 min |

---

## 📚 各 Agent・Skill の用途早見表

| 場面 | 推奨ツール | 用途 |
|-----|----------|------|
| 機能アイデアの明確化 | @requirements-definition | 受け入れ条件と要件IDの決定 |
| アーキテクチャ整合性確認 | @design-review | 層分離・イミュータビリティ・可逆性チェック |
| 実装着手前の詳細設計 | @solution-design | 影響範囲、リスク、実装順序の整理 |
| 実装前後の検証計画整理 | @verification-test-design | 通常系・異常系・境界系、TP-*、証跡整理 |
| 実装着手前の相談 | @dev-support | 技術的疑問解決、調査支援 |
| 実装実行 | @implementation | 設計→コード変換、最小差分修正 |
| コミット前の最終確認 | @quality-gate | lint/build/test/coverage 検証 |
| PR 前後のドキュメント更新 | @documentation-author | 仕様・検証・操作文書の整合 |
| 出荷可否判断 | @release-readiness | 残リスク整理と Go/No-Go 判断 |
| CI エラーの診断 | @quality-gate / @implementation | ビルド・テスト失敗の原因特定・修正案提示 |

---

## ✅ 品質ゲート基準

すべてのフェーズで以下を満たす必要があります：

### Code Quality
- ✓ TypeScript Strict Mode: 0 errors
- ✓ ESLint: 0 violations (`npm run lint`)
- ✓ Build: Success (`npm run build`)
- ✓ Bundle Size: < 100 KiB (minified)

### Testing
- ✓ Unit Test: 100% pass (`npm test`)
- ✓ Coverage (by layer):
  - Parser: ≥75%
  - Domain: ≥70%
  - Overall (MVP): ≥40%

### Performance
- ✓ Parse 10MB file: < 1s
- ✓ Render 1000 cards: < 200ms
- ✓ Save-to-sync cycle: < 500ms

### Architecture Compliance
- ✓ No reverse dependency (Plugin ← Presentation/Sync ← Parser ← Domain)
- ✓ Immutability: Domain operations use spread operator only
- ✓ Reversibility: Parser preserves comments, whitespace, unknown YAML keys
- ✓ Error Handling: Result<T> type used, no throws on invalid input

---

## 🔗 Related Documentation

- [.github/AGENTS.md](.github/AGENTS.md) — Agent/Skill カタログ
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — グローバル制約
- [doc/Design_Specification.md](../doc/Design_Specification.md) — アーキテクチャ詳細
- [doc/Requirements_Specification.md](../doc/Requirements_Specification.md) — 機能・非機能要件

---

**Last Updated**: 2026-07-04  
**Workflow Version**: 1.1  
**Agents Integrated**: 7 (Requirements Definition, Design Review, Solution Design, Verification & Test Design, Implementation, Documentation Author, Quality Gate, Release Readiness)  
**Skills Integrated**: 3 (Delivery Orchestration, Development Support, Pull Request Review)
