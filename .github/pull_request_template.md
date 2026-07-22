<!-- Pull Request for Weekly Kanban Extension -->

## Description

<!-- Provide a brief description of changes made in this PR -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation update
- [ ] Performance improvement

## Related Issues

<!-- Link to related GitHub issues, e.g., "Closes #123" -->

## Checklist

- [ ] Code follows project style guidelines (TypeScript strict mode)
- [ ] New tests added for changes
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Documentation updated if needed
- [ ] No new console errors or warnings

## Requirement Traceability

<!-- Map changed requirements to implementation and verification evidence -->

| Requirement ID / AC / NFR | Changed Files | Test Evidence (TP-*) | Status (Verified / Partial / Gap) |
|---------------------------|---------------|-----------------------|-----------------------------------|
| [e.g. FR-SYNC-03] | [src/sync/syncEngine.ts] | [TP-S-04, TP-S-15] | [Verified] |

## Verification Coverage Design

<!-- REQUIRED when behavior changes or tests are added/updated -->

| Scenario Type | Covered? | Evidence |
|---------------|----------|----------|
| Normal | [ ] | [happy path / TP-* / manual note] |
| Error | [ ] | [failure path / TP-* / manual note] |
| Boundary | [ ] | [edge condition / TP-* / manual note] |

## Test Coverage

<!-- Describe what testing was performed -->

### Unit Tests
- Test case 1: [description]
- Test case 2: [description]

### Integration Tests
- Integration case 1: [description]

### Manual Tests
- Manual test 1: [description]

## Quality Gate Evidence

<!-- Summarize the evidence that will be checked by Quality Gate / Release Readiness -->

- Lint: PASS / FAIL
- Build: PASS / FAIL
- Test: PASS / FAIL
- Coverage Snapshot: [Parser __% / Domain __% / Overall __%]
- Remaining Gaps Deferred: [none / list]
- Handoff Notes to Quality Gate: [manual checks, known gaps, follow-up]

## AI-Assisted Changes Verification

<!-- **REQUIRED for AI-generated/AI-assisted PRs** -->

- [ ] AI Tool Used: [specify tool, e.g., "GitHub Copilot"]
- [ ] Human Review: [brief summary of human review]
- [ ] Build Status: ✓ PASS / ✗ FAIL
- [ ] Test Status: ✓ PASS (coverage: __%) / ✗ FAIL
- [ ] Verification Date: YYYY-MM-DD HH:MM UTC

### Verification & Traceability Checklist (AI-Assisted PRs)
- [ ] Requirement ID / AC / NFR mapping completed
- [ ] TP-* evidence updated or explicitly deferred
- [ ] Normal / Error / Boundary coverage documented
- [ ] Remaining gaps and manual checks listed for Quality Gate

### Regression Checklist (AI-Assisted PRs)
- [ ] Verified no breaking changes to existing APIs
- [ ] Confirmed parser reversibility (Markdown ↔ Kanban) preserved
- [ ] Checked sync timing doesn't exceed 500ms threshold
- [ ] Validated error handling returns StatusMessage, not exceptions

## Additional Notes

<!-- Any additional context or considerations -->

---

**Thank you for contributing!**
