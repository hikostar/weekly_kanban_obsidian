---
name: customization-sanity-check
description: "Customization Sanity Check — Inspect .github customizations for stale project assumptions, naming drift, and broken references"
---

# Customization Sanity Check Prompt

`.github/` 配下の agent、skill、prompt、instructions、補助文書を更新したあとに、旧前提や表記ゆれを点検するための prompt。

## 使い方

以下を Copilot Chat に貼り付けて使う。

```text
@customization-sanity-check
.github 配下の customization を点検して、旧前提と表記ゆれを洗い出して。

対象範囲:
- agents/
- skills/
- prompts/
- AGENTS.md
- copilot-instructions.md
- dev-workflow.md

確認したいこと:
1. JsonEditor / dotnet / App/Core / Verification_Spec&result の残存
2. AGENTS と frontmatter description / argument-hint の齟齬
3. README / AGENTS / dev-workflow / prompts の導線不整合
4. 相対リンクの誤り
```

## 推奨 grep 観点

- `JsonEditor`
- `dotnet`
- `App/Core`
- `Verification_Spec&result`
- `three specialized agents`
- `description:`
- `argument-hint:`

## 期待する出力

1. Findings (High to Low)
2. Naming / Description Drift
3. Broken or Suspicious References
4. Workflow Mismatch
5. Recommended Fix Order

## 出力フォーマット例

```text
Findings (High to Low)
- [High] .github/copilot-instructions.md: relative link to doc/ is broken
- [Medium] .github/skills/...: stale JsonEditor wording remains

Naming / Description Drift
- ...

Broken or Suspicious References
- ...

Workflow Mismatch
- ...

Recommended Fix Order
1. Fix broken links
2. Remove stale project assumptions
3. Align AGENTS and prompt catalog descriptions
```
