# Customization Style Guide

このガイドは、`.github/` 配下の agent、skill、prompt、instructions、補助文書を更新するときの最小運用ルールを定義する。

## Scope

対象:
- `AGENTS.md`
- `copilot-instructions.md`
- `agents/*.agent.md`
- `skills/**/SKILL.md`
- `prompts/*.prompt.md`
- `dev-workflow.md`
- `pull_request_template.md`

対象外:
- 拡張本体コードの実装規約
- `doc/` 配下の一般ドキュメントの文体ルール

## Naming Rules

- Agent 名は `Role + Agent` で統一する。例: `Implementation Agent`, `Quality Gate Agent`
- Skill 名は kebab-case のフォルダ名と frontmatter `name` を一致させる。例: `pull-request-review`
- Prompt 名は目的が分かる kebab-case を使う。例: `debug-ci-failure`
- ファイル名の大文字小文字は既存正本に合わせる。検証仕様は必ず `Verification_Spec&Result.md` を使う

## Description Rules

- frontmatter `description` は必ず `Use when:` で始める
- `description` には用途だけでなく、判断対象や期待成果物が分かる語を含める
- 発見性を落とさないため、略語だけで済ませず、主要キーワードを列挙する

## Path and Reference Rules

- `.github/` 配下から `doc/` を参照するときは `../doc/...` を使う
- `.github/` 配下から同階層ファイルを参照するときは `.github/...` ではなく相対パスを使う。例: `AGENTS.md`
- 依存方向や責務境界は Weekly Kanban の構成に合わせる。`plugin / presentation / sync / parser / domain / tests / docs` を使い、`App/Core` は使わない

## Workflow Terms

- 検証観点は `通常系 / 異常系 / 境界系` で統一する
- 品質ゲート項目は `lint / build / test / coverage` を基本とする
- エージェントの責務表現は `用途`, `担当範囲`, `主な制約`, `使用例` の粒度にそろえる

## Consistency Checks

更新時は最低限次を確認する:
- `JsonEditor`, `dotnet`, `App/Core`, `Verification_Spec&result` が残っていない
- `description` と `argument-hint` が `AGENTS.md` の説明と矛盾していない
- README、AGENTS、dev-workflow の導線が最新の agent/skill 構成と一致している
- markdown のコードブロック、リンク、表の崩れがない

## Recommended Search Terms

更新前に次を検索すると、旧前提の混入を見つけやすい:
- `JsonEditor`
- `dotnet`
- `App/Core`
- `Verification_Spec&result`
- `three specialized agents`
