# PR Authoring Prompt (Weekly Kanban)

以下の入力を使って、PR 本文を作成してください。

## 入力フォーマット

```text
変更概要:

変更ファイル:

関連要件ID:

AI支援の有無:

検証結果:
- lint:
- build:
- test:
- coverage:

トレーサビリティ:
- Requirement / AC / NFR:
- Test Evidence (TP-*):
- Status (Verified / Partial / Gap):

検証観点:
- 通常系:
- 異常系:
- 境界系:

レイヤー影響確認:
- domain 層:
- parser 層:
- sync 層:
- webview 層:
- extension 層:

ドキュメント更新:

Quality Gate への引き継ぎ事項:
```

## 出力ルール

1. コミットメッセージ形式: `[Area] Short summary` (e.g., `[Parser] Add reversible comment preservation`)
2. AI支援PRの場合、「AI変更検証結果」を必ず埋める。
3. 検証結果が不明な項目は `TBD` と書き、推測で埋めない。
4. 層分離違反の可能性がある場合は「レビューメモ」に明記する。
5. Parser 可逆性への影響がある場合は必ず記載する。
6. `関連要件ID`、`トレーサビリティ`、`検証観点` は、[.github/pull_request_template.md](pull_request_template.md) の `Requirement Traceability` と `Verification Coverage Design` を埋められる粒度で要約する。
7. `通常系 / 異常系 / 境界系` のいずれかが未実施なら、未実施理由と手動確認または将来対応先を明記する。
8. `Quality Gate への引き継ぎ事項` には、残存 gap、手動確認項目、Deferred にした検証観点を簡潔に記載する。

## 出力に含める要素

1. PR タイトル案（`[Area] Short summary`）
2. 変更概要
3. Requirement Traceability
4. Verification Coverage Design
5. Test Coverage
6. AI-Assisted Changes Verification
7. Regression Checklist
8. レビューメモ

## 出力サンプル

```markdown
[Sync] Add status bar verification evidence

## Description

sync status bar の状態遷移と検証証跡整理を強化し、PR から Requirement / TP / gap を追跡できるようにした。

## Related Issues

Relates to: FR-CMD-04, FR-SYNC-04, NFR-ACC-01

## Requirement Traceability

| Requirement ID / AC / NFR | Changed Files | Test Evidence (TP-*) | Status |
|---------------------------|---------------|-----------------------|--------|
| FR-CMD-04 | src/extension.ts, src/test/ui.test.ts | TP-U-16 | Partial |
| FR-SYNC-04 | src/sync/syncEngine.ts, src/test/sync.test.ts | TP-S-16 | Verified |
| NFR-ACC-01 | src/webview/webviewContent.ts, src/test/ui.test.ts | TP-U-17 | Partial |

## Verification Coverage Design

| Scenario Type | Covered? | Evidence |
|---------------|----------|----------|
| Normal | [x] | status bar success transition / TP-U-16 |
| Error | [x] | sync failure message propagation / TP-S-16 |
| Boundary | [ ] | file switch edge case deferred to manual check |

## Test Coverage

- lint: PASS
- build: PASS
- test: PASS
- coverage: Parser 79.47% / Domain 33.12% / Overall 46.57%

## AI-Assisted Changes Verification

- AI Tool Used: GitHub Copilot
- Human Review: status bar state labels and tooltip updates reviewed
- Build Status: ✓ PASS
- Test Status: ✓ PASS
- Verification Date: 2026-07-04 12:00 UTC

## Regression Checklist

- [x] Confirmed parser reversibility preserved
- [x] Checked sync timing regression not introduced
- [ ] Verified file-switch boundary case manually

## レビューメモ

- FR-CMD-04 の境界系は未自動化。Quality Gate では手動確認項目として継続。
```
