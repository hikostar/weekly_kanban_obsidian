# Copilot Agents, Skills & Prompts for Weekly Kanban

このプロジェクトは Copilot の agent、skill、prompt 機能を活用した開発ワークフローに対応しています。

## 📋 Agent カタログ

各 Agent の説明文は、用途、担当範囲、主な制約、期待成果物がひと目で分かる粒度にそろえる。Verification & Test Design Agent を基準に、他 Agent も「何を判断し、何を出力し、どこまで責任を持つか」を明確化する。

### Orchestration Delivery Agent
**ファイル**: `.github/agents/delivery-orchestration.agent.md`  
**用途**: 要件定義から設計、検証計画、実装、品質ゲート、ドキュメント、リリース判定までを一気通貫で進めるとき  
**担当範囲**: 全体段取り、委譲順序の制御、完了条件管理、最終判断材料の取りまとめ  
**主な制約**:
- いきなり実装から始めない
- 検証計画未確定のまま実装へ進めない
- 未検証のまま完了宣言しない

**使用例**:
```
@orchestration-delivery Orchestration Delivery Agent
週次ファイル選択フローの改善を、要件定義から品質ゲートまで通しで進めたい。

完了条件:
- FR-CMD-02 に対応する選択UI改善
- 通常系・異常系・境界系の検証計画あり
- build / test / coverage を通してリリース可否まで整理する
```

---

### Requirements Definition Agent
**ファイル**: `.github/agents/requirements-definition.agent.md`  
**用途**: 要件定義、受け入れ条件定義、非機能要件整理、スコープ明確化を行うとき  
**担当範囲**: Goal / Non-goals / Constraints / AC / Requirement ID の整理  
**主な制約**:
- 実装手段を先に固定しない
- 曖昧な受け入れ条件のまま完了扱いにしない
- 要件IDと証跡範囲を明確にする

**使用例**:
```
@requirements-definition Requirements Definition Agent
Kanban カードクリック時の Markdown ジャンプ機能を見直したい。

背景:
- FR-CMD-03 の検証不足を埋めたい
成功条件:
- 受け入れ条件を Given / When / Then で定義
- 関連する NFR と証跡範囲を明確化
```

---

### Implementation Agent
**ファイル**: `.github/agents/implementation.agent.md`  
**用途**: 設計済みタスクの実装、最小差分修正、検証仕様に沿ったテスト追加、受け入れ条件を満たすコード変更が必要なとき  
**担当範囲**: コード変更、関連テスト更新、自己検証、検証仕様との差分明示  
**主な制約**:
- 設計未確定のまま実装しない
- 受け入れ条件に直結する変更のみ
- ビルド・テストで自己検証

**使用例**:
```
@implementation Implementation Agent
新しい feature を追加したい。

要件: "Kanban に検索フィルター機能を追加"
対象ファイル: src/webview/webviewContent.ts, src/sync/syncEngine.ts
受け入れ条件:
- フィルター入力欄が追加される
- Markdown 可逆性を損なわない
- テスト coverage ≥70%
```

---

### Design Review Agent
**ファイル**: `.github/agents/design-review.agent.md`  
**用途**: 要件定義後、実装前に仕様整合性確認、要件IDマッピング、影響層整理、テスト対象候補の洗い出し  
**担当範囲**: 仕様整合性確認、設計制約チェック、変更層の見積もり、テスト候補整理  
**主な制約**:
- 実装方針は Implementation Agent に任せる
- アーキテクチャ制約（層分離、イミュータビリティ）を確認
- 曖昧さは論点として明示

**使用例**:
```
@design-review Design Review Agent
新機能の要件定義ができた。実装前に設計レビューを実施したい。

目的: Status bar に sync state を表示する
受け入れ条件:
1. Idle、Syncing、Error 状態を表示
2. ユーザー操作で状態を切り替え可能
3. Markdown 同期に遅延なし
```

---

### Solution Design Agent
**ファイル**: `.github/agents/solution-design.agent.md`  
**用途**: 設計方針、影響範囲分析、リスク評価、実装順序設計、検証と実装への handoff 設計が必要なとき  
**担当範囲**: Change Plan、影響範囲、リスク緩和、実装順序、設計判断の明文化  
**主な制約**:
- 実装の詳細コードに踏み込みすぎない
- 影響範囲とリスクを省略しない
- 要件ID未確定のまま設計を確定しない

**使用例**:
```
@solution-design Solution Design Agent
Markdown 保存後の Kanban 再描画遅延を改善したい。

対象範囲:
- src/sync
- src/webview
期待:
- 影響範囲、リスク、実装順序、Verification Agent への handoff を整理する
```

---

### Verification & Test Design Agent
**ファイル**: `.github/agents/verification-test-design.agent.md`  
**用途**: 設計仕様に基づく検証計画、要件IDトレーサビリティ、テスト設計、検証証跡整理を行うとき  
**担当範囲**: 検証観点整理、通常系・異常系・境界系の設計、`src/test/` 更新、`doc/Verification_Spec&Result.md` 反映、Quality Gate への handoff  
**主な制約**:
- 設計根拠なしでテストケースを追加しない
- unit / integration / performance / manual-e2e を混在させない
- 最終品質判定は Quality Gate Agent に委譲する
- 実装本体の変更はテスト成立に必要な最小差分に限定する

**強化ポイント**:
- 通常系・異常系・境界系を最低1件ずつ設計して、検証の偏りを防ぐ
- Requirement ID / AC / NFR と TP-* テストのトレーサビリティを表形式で残す
- Coverage 差分、残存 Gap、手動確認項目を証跡として整理する

**使用例**:
```
@verification-test-design Verification & Test Design Agent
新しい sync status bar 機能に対して検証計画を作りたい。

要件ID: FR-CMD-04, FR-SYNC-04, NFR-ACC-01
対象範囲: src/extension.ts, src/test/ui.test.ts, src/test/sync.test.ts
期待:
- 通常系、異常系、境界系をそれぞれ最低1件ずつ含める
- TP-* と要件IDの対応表を更新する
- Quality Gate へ渡す未自動化項目を明示する
```

---

### Documentation Author Agent
**ファイル**: `.github/agents/documentation-author.agent.md`  
**用途**: 実装変更に伴う設計書、操作マニュアル、検証結果、PR説明、リリース向け文書の更新が必要なとき  
**担当範囲**: ドキュメント更新要否判定、表現統一、読者別の説明整理、検証結果の文書反映  
**主な制約**:
- 実装と不整合な説明を書かない
- 根拠のない数値や結果を記載しない
- Verification Agent が作成した技術内容を欠落させない

**使用例**:
```
@documentation-author Documentation Author Agent
sync status bar 変更に合わせて設計書と検証結果を更新したい。

更新対象:
- doc/Design_Specification.md
- doc/Verification_Spec&Result.md
- doc/User_Manual.md
```

---

### Quality Gate Agent
**ファイル**: `.github/agents/quality-gate.agent.md`  
**用途**: build、test、coverage、lint の品質ゲート判定、実行結果照合、残存失敗分析を実施するとき  
**担当範囲**: コマンド実行、カバレッジ測定、Verification Spec 照合、品質判定  
**ベースライン**:
- TypeScript Strict Mode: Pass
- Test Coverage: Parser ≥75%, Domain ≥70%
- Performance: Parse 10MB < 1s, Render 1000 cards < 200ms
- Build Size: < 100 KiB (minified)

**使用例**:
```
@quality-gate Quality Gate Agent
PR をマージする前に品質ゲート判定を実施してください。
```

---

### Release Readiness Agent
**ファイル**: `.github/agents/release-readiness.agent.md`  
**用途**: リリース可否判定、残リスク評価、Go/No-Go 判断、出荷条件と既知制約の整理が必要なとき  
**担当範囲**: 品質ゲート結果の評価、残課題の重大度整理、Ready / Needs Changes 判定  
**主な制約**:
- 判定根拠なしで Ready を出さない
- 未解決リスクを隠さない
- 次アクションを具体化する

**使用例**:
```
@release-readiness Release Readiness Agent
v0.1.0 を公開できるか判定したい。

入力:
- Quality Gate 結果
- 残存 gap 一覧
- 既知制約と回避策
```

---

## 🛠️ Skill カタログ

### delivery-orchestration Skill
**ファイル**: `.github/skills/delivery-orchestration/SKILL.md`  
**用途**: 要件定義から設計、検証計画、実装、品質ゲート、リリース判断までを一気通貫で統括する  
**対象外**: 単一ファイルだけの軽微修正をその場で行う作業  
**主な機能**:
1. 工程ごとのゲート定義
2. 検証計画確定前の実装ブロック
3. 品質ゲートとリリース判定の委譲整理

**使用例**:
```
@delivery-orchestration delivery-orchestration
週次 Markdown ファイル選択機能の改善を、設計からリリース判定まで通しで計画して。
```
制約:
- Markdown as Truth を壊さない
- Parser 可逆性を維持する
完了条件:
---

### development-support Skill
**ファイル**: `.github/skills/development-support/SKILL.md`  
**用途**: ドキュメント調査、実装支援、テスト設計・実行を支援する  
**対象外**: PR レビュー（別スキルにより実施）  
**主な機能**:
1. 関連仕様・検証文書の確認
2. 変更対象の責務境界整理
3. テスト方針の事前決定
4. ドキュメント更新点の明示

**使用例**:
```
@dev-support development-support
sync status bar の更新処理を調査したい。

作業目的: 実装前の調査と更新方針整理
変更対象ファイル: src/extension.ts, src/sync/syncEngine.ts
制約条件:
- Markdown as Truth を維持する
- StatusMessage ベースの通知方針を壊さない
期待成果物: 関連コードの整理、実装案、テスト計画、ドキュメント更新点
```

---

### pull-request-review Skill
**ファイル**: `.github/skills/pull-request-review/SKILL.md`  
**用途**: PR差分を設計仕様と検証仕様に照らしてレビューする  
**対象外**: 実装そのものを代行すること  
**主な機能**:
1. 層分離と可逆性のレビュー
2. 欠落テストと証跡不足の検出
3. ドキュメント更新漏れの検出

**使用例**:
```
@pull-request-review pull-request-review
このPR差分を、Requirements / Design / Verification の整合性観点でレビューして。

確認観点:
- FR-SYNC-03 と FR-CMD-04 の証跡が揃っているか
- 通常系・異常系・境界系に偏りがないか
- doc/Verification_Spec&Result.md と README 更新漏れがないか
```

---

## 📝 Prompt カタログ

### pr-authoring Prompt
**ファイル**: `.github/prompts/pr-authoring.prompt.md`  
**用途**: `.github/pull_request_template.md` に準拠した PR 本文作成を支援  
**出力ルール**:
- コミットメッセージ形式: `[Area] Short summary`
- AI支援PRの場合は検証結果を必須記載
- 層分離違反の可能性がある場合は「レビューメモ」に明記
- Parser 可逆性への影響は必ず記載

**使用例**:
```
変更概要: Domain layer に Card priority フィールドを追加

変更ファイル: src/domain/card.ts, src/domain/builder.ts, src/test/domain.test.ts

検証結果:
- lint: ✓ Pass
- build: ✓ Pass
- test: ✓ 8/8 Pass (domain.test.ts + 4 新規テスト)
- coverage: ✓ 85% (card.ts)

レイヤー影響確認:
- domain 層: ✓ addPriority, setPriority メソッド追加（immutable）
- parser 層: ✓ Markdown metadata から priority フィールド抽出
- sync 層: ✓影響なし
- webview 層: ✓ UI 側で表示対応（別PR予定）
- extension 層: ✓ 影響なし

ドキュメント更新:
- doc/Design_Specification.md: Domain model 図を更新
- doc/Verification_Spec&Result.md: TP-D-06 に新規テスト結果追加
```

---

### customization-sanity-check Prompt
**ファイル**: `.github/prompts/customization-sanity-check.prompt.md`  
**用途**: `.github/` 配下 customization の旧前提、表記ゆれ、リンク不整合を grep ベースで点検する  
**出力ルール**:
- `JsonEditor`, `dotnet`, `App/Core`, `Verification_Spec&result` などの残存を列挙する
- agent / skill / prompt / instructions 間の整合漏れ候補を簡潔に示す
- 修正優先度を High / Medium / Low で返す

**使用例**:
```
@customization-sanity-check
.github 配下の customization を点検して、旧前提と表記ゆれを洗い出して。
```

---

## 🚀 Copilot Agent の使用方法

### 方法 1: コマンドパレットから直接呼び出し
VS Code のコマンドパレット (`Cmd+Shift+P` or `Ctrl+Shift+P`) で以下のように入力：

```
@implementation Implementation Agent
<タスク詳細>
```

または

```
@dev-support development-support
<作業内容>
```

### 方法 2: チャット中に Agent を指定
Copilot Chat ウィンドウで `@` をタイプすると、登録済み agent が表示されます。

### 方法 3: `.github/copilot-instructions.md` で自動参照
グローバルな Copilot instructions により、プロジェクトの制約・パターンが自動的に context に含まれます。

---

## 📚 Project Constraints（Agent が参照する制約）

### Architecture
- **Layer Isolation**: Extension → Webview/Sync → Parser → Domain（逆依存なし）
- **Immutability**: Domain 層の全操作は新規オブジェクト生成（spread operator）
- **Reversibility**: Parser は コメント、空白、未知の YAML キーを保存
- **Error Handling**: Result<T> 型を強制（throw 禁止）

### Performance Targets
- Parse 10MB file: < 1s
- Render 1000 cards: < 200ms
- Save-to-sync cycle: < 500ms

### Testing Standards
- Parser layer: ≥75% coverage
- Domain layer: ≥70% coverage
- Overall: ≥40% (MVP target)

### Code Quality
- TypeScript Strict Mode (no `any` without justification)
- ESLint compliance
- Build size: < 100 KiB (minified)

---

## 🔄 Workflow Integration

### Typical Developer Journey

1. **New Feature Definition**
   ```
   @design-review Design Review Agent
   新しい feature を定義しました。設計レビューを実施してください。
   ```

2. **Verification Planning**
   ```
   @verification-test-design Verification & Test Design Agent
   要件IDと設計仕様に基づいて、通常系・異常系・境界系を含む検証計画を作成してください。
   ```

3. **Implementation Planning**
   ```
   @dev-support development-support
   実装計画を立てたい。ドキュメントと制約を確認してください。
   ```

4. **Code Implementation**
   ```
   @implementation Implementation Agent
   タスクを実装しました。設計制約に違反していないか確認してください。
   ```

5. **Verification Evidence Update**
   ```
   @verification-test-design Verification & Test Design Agent
   実装差分に合わせて TP-*、coverage 差分、残存 gap、Quality Gate への handoff を整理してください。
   ```

6. **Quality Gate Check**
   ```
   @quality-gate Quality Gate Agent
   品質ゲート判定を実施してください。
   ```

7. **PR Creation**
   - `pr-authoring.prompt.md` に従い PR 本文を作成
   - コミットメッセージ: `[Area] Summary` 形式で統一

---

## 📖 Related Documentation

- [.github/copilot-instructions.md](.github/copilot-instructions.md) — グローバル Copilot 指示（アーキテクチャ原則、テスト要件、PR 基準）
- [.github/customization-style-guide.md](.github/customization-style-guide.md) — `.github/` 配下 customization の命名規約と表記規約
- [doc/Design_Specification.md](doc/Design_Specification.md) — アーキテクチャ詳細、層分離、データモデル
- [doc/Requirements_Specification.md](doc/Requirements_Specification.md) — 機能要件（FR）と非機能要件（NFR）
- [doc/Verification_Spec&Result.md](doc/Verification_Spec&Result.md) — テスト計画、検証仕様、実行結果

---

## ✅ Verification Checklist for New Features

Agent による設計レビューと検証計画作成後、以下をチェックリストとして使用：

- [ ] **Specification Alignment**
  - [ ] アーキテクチャ制約（層分離）に違反していない
  - [ ] Immutability ルール遵守
  - [ ] Parser 可逆性を損なわない

- [ ] **Verification Design**
   - [ ] 通常系・異常系・境界系がそれぞれ少なくとも1件設計されている
   - [ ] Requirement ID / AC / NFR と TP-* のトレーサビリティが整理されている
   - [ ] 自動化対象と手動確認対象が分離されている

- [ ] **Test Coverage**
  - [ ] 対象層のテスト coverage ≥ baseline
  - [ ] パフォーマンス target 達成（該当時）

- [ ] **Documentation**
  - [ ] Design_Specification.md 更新
   - [ ] Verification_Spec&Result.md に テストケース追加
  - [ ] User_Manual.md に新機能説明追加（ユーザー向け機能の場合）

- [ ] **Code Quality**
  - [ ] TypeScript strict mode pass
  - [ ] ESLint pass
  - [ ] Build success (< 100 KiB)

---

**Last Updated**: 2026-07-04  
**Agents Count**: 9 (Orchestration Delivery, Requirements Definition, Design Review, Solution Design, Verification & Test Design, Implementation, Documentation Author, Quality Gate, Release Readiness)  
**Skills Count**: 3 (Delivery Orchestration, Development Support, Pull Request Review)  
**Prompts Count**: 2 (PR Authoring, Customization Sanity Check)
