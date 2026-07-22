---
name: development-support
description: 'ドキュメント調査、実装支援、テスト設計・実行を支援する。Use for day-to-day development support, implementation help, test planning, and documentation impact checks.'
---

# Skill: Weekly Kanban Development Support

## 目的

Weekly Kanban VS Code Extension の作業を支援する。対象はドキュメント調査、ドキュメント作成、実装支援、テスト設計・実行であり、PR レビューは対象外とする。

## 入力

1. 作業目的
2. 変更対象ファイルまたは領域
3. 制約条件
4. 期待する成果物

## 手順

1. まず関連する仕様・検証・運用文書を確認する。
2. 変更対象の責務境界を整理し、必要なら最小の実装案に絞る。
3. テスト方針を先に決め、変更に対応する検証観点を明示する。
4. 仕様や運用に影響がある場合は、関連ドキュメントの更新点を併記する。
5. 推測で埋めず、不明点は論点として明示する。

## 出力

1. 変更案または調査結果
2. 実施すべきテスト
3. 更新が必要なドキュメント
4. 未確定論点

## 注意

1. src/domain ↔ src/parser ↔ src/sync ↔ src/webview ↔ src/extension の依存方向を壊さない。
2. Domain 層の全操作は immutable（spread operator による新規生成）を保つ。
3. Parser の可逆性（コメント、空白、未知の YAML キーの保存）を損なわない。
4. 設計制約と検証要件は `doc/Design_Specification.md` と `doc/Verification_Spec&Result.md` を優先する。
5. Result<T> 型のエラーハンドリングを強制（throw 禁止）。
