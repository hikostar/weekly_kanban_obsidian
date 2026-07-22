# weekly_kanban_obsidian

Weekly Kanban の Obsidian 版に関する仕様書を管理するリポジトリです。

このリポジトリでは、Obsidian 向けに再構成した仕様書を 正本 として doc/ に置き、比較・参照用の VS Code 版仕様を doc_vscode/ に保持しています。

## ディレクトリ構成

- doc/: Obsidian 版の正本仕様書
- doc_vscode/: VS Code 版の参照用仕様書
- .github/: Copilot カスタマイズ、プロンプト、ワークフロー

## 主なドキュメント

- doc/README.md: Obsidian 版仕様書の入口
- doc/Requirements_Specification.md: 要件定義
- doc/Design_Specification.md: 全体設計
- doc/Domain_Model_Design.md: ドメインモデル設計
- doc/Parser_API_Design.md: パーサー API 設計
- doc/Sync_Engine_Design.md: 同期エンジン設計
- doc/GUI_Wireframe.md: 画面ワイヤーフレーム
- doc/Obsidian_Protocol_Design.md: Obsidian 連携設計
- doc/Verification_Spec&Result.md: 検証仕様と結果

## 運用方針

- Obsidian 向けの仕様更新は doc/ を優先します。
- 既存の VS Code 版との差分確認には doc_vscode/ を参照します。
- ドキュメント起点で設計・検証を進め、必要に応じて .github/ 配下の補助資料を使います。