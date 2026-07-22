---
name: debug-ci-failure
description: "Debug CI Failure — Troubleshoot GitHub Actions build/test failures"
---

# CI Failure Debugging Prompt

Use this prompt when GitHub Actions CI fails on a PR or push to help diagnose and resolve issues quickly.

## Usage

Paste this prompt + CI failure output into Copilot Chat:

```
@implementation Implementation Agent
CI Failure Debugging

Error Output:
[paste CI log output below]

```

Or for test-only failures:

```
@quality-gate Quality Gate Agent
CI Test Failure

Error Output:
[paste test failure log]
```

---

## Step 1: Collect CI Error Output

### From GitHub Actions UI:
1. Open PR or branch in GitHub
2. Click "Details" on failing CI check
3. Scroll to failing step (e.g., "Run npm test")
4. Copy full error output

### Common Failure Points:
- **Lint**: `npm run lint` failures (ESLint violations)
- **Build**: `npm run build` failures (TypeScript errors, webpack errors)
- **Test**: `npm test` failures (failing unit tests)
- **Coverage**: Coverage threshold not met (< baseline)

---

## Step 2: Paste Error & Request Diagnosis

### Template for @implementation Agent:

```
@implementation Implementation Agent
Task: Debug CI failure

Branch: [your-feature-branch]
Failed Step: [lint | build | test | coverage]
Error Message:
[paste full error output]

What I did:
- [describe your code changes]

Request:
1. Identify root cause of failure
2. Show minimal fix to resolve
3. Verify fix works locally (`npm run lint`, `npm run build`, `npm test`)
```

### Template for @quality-gate Agent (test-only):

```
@quality-gate Quality Gate Agent
Task: Debug test failure

Failed Tests:
[paste test output]

Request:
1. What tests are failing?
2. What's the root cause?
3. How to fix and re-run?
```

---

## Step 3: Apply Fix Locally

Once agent suggests fix:

```powershell
# 1. Apply suggested changes to your branch

# 2. Rebuild & test locally
npm run lint     # If lint failed
npm run build    # If build failed
npm test         # If test failed
npm test -- --coverage  # If coverage failed

# 3. If pass → commit & push
git add .
git commit -m "[Area] Fix CI failure"
git push

# 4. Check CI again on PR
```

---

## Step 4: Common Failure Patterns

### Pattern 1: TypeScript Strict Mode Violations
**Error**: `Property 'X' has no initializer and is not definitely assigned in the constructor`

**Quick Fix**:
```typescript
// Add type annotation or initialize
myProperty: SomeType = defaultValue;
// OR use non-null assertion (if justified)
myProperty!: SomeType;
```

### Pattern 2: Immutability Rule Violation
**Error**: `Cannot mutate domain object`

**Quick Fix**:
```typescript
// ❌ Wrong (mutates original)
card.title = newTitle;

// ✅ Correct (new object)
const updatedCard = { ...card, title: newTitle };
```

### Pattern 3: Missing Test Coverage
**Error**: `Coverage threshold not met (expected >= 70%, got 65%)`

**Quick Fix**:
```bash
# Add test cases for uncovered lines
npm test -- --coverage  # See coverage report
# Update src/test/**.test.ts with new test cases
```

### Pattern 4: Parser Reversibility Broken
**Error**: \Round-trip test failed: markdown changed after parse/write cycle\

**Quick Fix**:
- Don't strip comments, whitespace, or unknown YAML keys
- Use existing comment preservation logic in kanbanWriter.ts
- Test with `npm test -- parser.test.ts`

### Pattern 5: ESLint Violation
**Error**: `no-unused-vars: 'myVar' is defined but never used`

**Quick Fix**:
- Remove unused variable, OR
- Prefix with underscore if intentionally unused: `_myVar`

---

## Step 5: Commit Message for Fix

Once all tests pass locally:

```
[Bugfix] Fix CI [lint|build|test|coverage] failure

Root Cause: [what was wrong]
Solution: [how it was fixed]
Verification: npm run lint/build/test passed locally

Relates to: [original PR issue]
```

---

## Integration with PR Workflow

```
Feature Branch Created
  ↓
npm run lint locally (should pass before push)
  ↓
git push
  ↓
CI Runs on PR
  ↓
CI FAILS? 
  ↓
→ Use this prompt with @implementation
  ↓
→ Apply suggested fix
  ↓
→ Commit & push fix
  ↓
→ CI Runs again
  ↓
CI PASS ✓
  ↓
Ready for PR review
```

---

## Prevention: Lint Before Push

Add to your workflow:

```powershell
# Before git push, always:
npm run lint
npm run build
npm test

# If all pass → safe to push
git push
```

---

## Quick Reference: CI Command Meanings

| Command | What It Does | Failure = | Fix Type |
|---------|------------|-----------|----------|
| `npm run lint` | ESLint violations | Code style | Reformat code |
| `npm run build` | TypeScript + Webpack | Type/build errors | Fix TS types or code logic |
| `npm test` | Jest unit tests | Test assertion failures | Fix code or update test |
| `npm test -- --coverage` | Code coverage report | Coverage < baseline | Add test cases |

---

## Troubleshooting This Prompt

**Problem**: Agent says "I don't have enough context"

**Solution**: Paste more of the error log, including stack trace

**Problem**: Agent suggests changes but I'm not sure

**Solution**: Ask agent to explain *why* each change is needed

**Problem**: CI still fails after applying suggested fix

**Solution**: Paste new error output back to agent; might be a follow-up issue

---

**Last Updated**: 2026-07-04  
**Debug Prompt Version**: 1.1  
**Target Agents**: @implementation, @quality-gate  
**Expected Resolution Time**: 10-30 min per CI failure
