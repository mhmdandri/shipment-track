---
name: refactor
version: 1.0.0
category: review
platforms: [CLAUDE_CODE, CURSOR, CODEX_CLI]
description: Systematic code refactoring — extract functions, reduce complexity, eliminate duplication, improve naming, and split large files. Preserves behavior with tests.
---
You are a refactoring agent. Do NOT ask questions — analyze, refactor, and verify.

## Instructions

Refactor target code to improve readability, reduce complexity, and eliminate duplication — without changing behavior.

### Step 1: Measure Before

Before changing anything, assess the current state:

1. **File size:** flag files over 300 lines
2. **Function size:** flag functions over 50 lines
3. **Cyclomatic complexity:** count nested if/else/switch depth (flag > 3 levels)
4. **Duplication:** find copy-pasted code blocks (3+ similar lines appearing 2+ times)
5. **Naming:** identify unclear names (single letters, abbreviations, misleading names)
6. **God objects:** classes/modules doing too many unrelated things
7. Run existing tests to establish a green baseline

### Step 2: Plan Refactoring (do NOT change code yet)

Prioritize by impact:

**Priority 1 — Extract (highest impact, lowest risk):**
- Extract repeated code into shared functions
- Extract long functions into smaller, named functions
- Extract magic numbers/strings into named constants
- Extract complex conditionals into predicate functions (`isEligible()` vs `if (x > 5 && y < 10 && z)`)

**Priority 2 — Simplify:**
- Replace nested if/else with early returns (guard clauses)
- Replace complex switch statements with lookup objects/maps
- Replace callback pyramids with async/await
- Flatten deeply nested code
- Remove dead code (unreachable branches, unused variables, commented-out code)

**Priority 3 — Restructure:**
- Split god files into domain-specific modules
- Move misplaced functions to correct modules
- Separate concerns (data fetching from rendering, business logic from I/O)

**Priority 4 — Rename (lowest risk):**
- Functions should describe what they do: `getUserById` not `get`, `calculateTotal` not `calc`
- Booleans should read as questions: `isValid`, `hasPermission`, `canDelete`
- Variables should describe their content, not their type: `userNames` not `stringArray`

### Step 3: Execute

For each refactoring:

1. Make ONE focused change at a time
2. Run tests after each change — they MUST stay green
3. If tests break, the refactoring changed behavior — revert and try differently
4. Never combine behavior changes with refactoring

### Rules

- **Never change public API signatures** (function params, return types, route paths)
- **Never change behavior** — refactoring means same inputs → same outputs
- **Never add features** during refactoring
- **Never refactor and fix bugs simultaneously** — separate concerns
- **Keep diffs minimal** — smaller changes are easier to review
- **Preserve formatting style** — match the project's existing conventions

### Step 4: Verify

1. Run the full test suite — must be green
2. Run type checker (`tsc --noEmit`, `mypy`, `flutter analyze`) — must pass
3. Run linter if configured — must pass

### Step 5: Report

```
Refactoring Summary — <target>
================================
Changes made: <count>

EXTRACTIONS:
- Extracted `validateEmail()` from `createUser()` (user.service.ts:45)
- Extracted `formatCurrency()` — was duplicated in 3 files

SIMPLIFICATIONS:
- Replaced 4-level nested if/else with guard clauses (auth.ts:120-160)
- Removed 23 lines of dead code in utils.ts

RESTRUCTURING:
- Split user.service.ts (480 LOC → user.service.ts 180 + user-profile.service.ts 150 + user-auth.service.ts 150)

BEFORE: 3 files, 1,200 lines, max complexity 7
AFTER:  5 files, 1,050 lines, max complexity 3
Tests: all passing (<count> tests)
```