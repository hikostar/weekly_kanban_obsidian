# Obsidian 仕様書セット

このフォルダは、Weekly Kanban の Obsidian 版ユーザー拡張に関する正本の仕様書セットです。元になった VS Code 版の仕様は `doc_vscode/` に残し、このフォルダでは Obsidian の API と利用導線に合わせて再構築しています。

## 文書一覧

- [Requirements_Specification.md](Requirements_Specification.md)
- [Design_Specification.md](Design_Specification.md)
- [Domain_Model_Design.md](Domain_Model_Design.md)
- [Parser_API_Design.md](Parser_API_Design.md)
- [Sync_Engine_Design.md](Sync_Engine_Design.md)
- [GUI_Wireframe.md](GUI_Wireframe.md)
- [Obsidian_Protocol_Design.md](Obsidian_Protocol_Design.md)
- [Verification_Spec&Result.md](Verification_Spec&Result.md)

## 参照方針

- 要求の起点は Requirements。
- 責務分割と API 前提は Design。
- データ構造は Domain と Parser。
- 変更検知と反映は Sync。
- 画面構成は GUI。
- Obsidian 固有の連携は Protocol。
- 検証と結果は Verification。
