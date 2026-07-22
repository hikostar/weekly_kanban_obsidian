---
name: pr-review-orchestration
description: "PR Review Orchestration — Bridge pull-request-review Skill with agent-assisted analysis"
---

# PR Review Orchestration Prompt

When a PR is opened, use this prompt to orchestrate both manual review and AI-assisted analysis.

## Phase 1: Apply pull-request-review Skill Checklist

First, gather findings from the PR diff using the pull-request-review Skill:

```
@pull-request-review pull-request-review
[Paste PR diff or summary]
```

Document findings in these categories:
- **Design Alignment**: Does the change fit Weekly Kanban architecture?
- **Code Quality**: TypeScript strict mode, error handling, immutability compliance
- **Test Coverage**: Are new tests aligned with design spec?
- **Documentation**: Are Design_Spec and Verification_Spec updated?

---

## Phase 2: Conditional Agent Routing

Based on pull-request-review findings, route to specialized agents:

### If "Design Alignment" = FAIL or RISK

```
@design-review Design Review Agent
PR Summary: [feature being reviewed]
Impacted Layers: [domain/parser/sync/webview/extension]
Design Concern: [specific alignment issue from review]
Request: Assess specification compliance
```

**Expected Output**: 
- Architecture constraint violations identified
- Reversibility/immutability impact assessment
- Recommendation: Approve / Request Changes / Needs Clarification

### If "Test Coverage" = FAIL or RISK

```
@verification-test-design Verification & Test Design Agent
Current Tests: [what's tested]
Affected Layers: [which layers changed]
Request: Identify missing test coverage gaps
```

**Expected Output**:
- Missing test cases
- Test code scaffold for uncovered paths
- Coverage baseline impact

### If "Documentation" = FAIL

```
@documentation-author Documentation Author Agent
Task: Documentation audit
Changed Code: [summary of code changes]
Current Docs: [what's documented]
Request: Identify doc update needed in Design_Spec, Verification_Spec, User_Manual, README
```

**Expected Output**:
- Specific doc update recommendations
- Sections requiring revision
- New content to add (if any)

---

## Phase 3: PR Comment Documentation

Summarize agent findings in a PR comment:

```markdown
## AI-Assisted Code Review Results

### Design Alignment
[paste @design-review findings if triggered]

### Test Coverage
[paste @verification-test-design findings if triggered]

### Documentation
[paste @documentation-author findings if triggered]

### Summary
- [ ] All architecture constraints satisfied
- [ ] Test coverage meets baseline requirements
- [ ] Documentation updated appropriately

**Recommendation**: [Approve | Request Changes | Needs Clarification]
```

---

## Phase 4: Human Review & Merge Decision

Team lead conducts final review:

1. ✓ Check pull-request-review Skill output
2. ✓ Verify agent routing decisions (if any)
3. ✓ CI checks pass (lint, build, test, coverage)
4. ✓ Human code review completed
5. **Decision**: Approve & Merge OR Request Changes

---

## Orchestration Rules

| Finding | Trigger | Agent | Action |
|---------|---------|-------|--------|
| Design Alignment FAIL | Yes | @design-review | Review PR architecture fit |
| Test Coverage FAIL | Yes | @verification-test-design | Add missing tests or mark as deferred |
| Documentation gap | Yes | @documentation-author | Add required doc updates to PR or task |
| All Findings PASS | — | None | Proceed to human review |

---

## Integration with CI/CD

This orchestration runs **asynchronously alongside CI checks**:

- CI checks (.github/workflows/ci.yml): 5-10 min (lint, build, test, coverage)
- Agent review routing: 0-5 min (if needed)
- Human review + decision: 10-30 min (team capacity dependent)

**Goal**: Complete PR review within 30-60 min from open to merge.

---

## Example Workflow

```
PR Opened
  ↓
CI Runs (parallel): npm lint, build, test, coverage
  ↓
pull-request-review Skill applied
  ↓
Finding: Design Alignment = RISK
  ↓
@design-review Design Review Agent triggered
  ↓
Design Review Output added to PR comment
  ↓
Human review + decision (with AI insights)
  ↓
Approve & Merge (or Request Changes)
```

---

**Last Updated**: 2026-07-04  
**Orchestration Version**: 1.1  
**Trigger**: PR opened  
**Responsible**: Team lead (with AI support)
