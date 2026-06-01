## Description

<!-- Briefly describe what this PR does and why. Link related issues with "Closes #NNN" if applicable. -->

Closes #

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] Tests only
- [ ] Other (describe):

## Checklist

### Code Quality
- [ ] TypeScript strict mode — no `any` without justification
- [ ] No unused imports or variables
- [ ] No `console.log` left in production code paths

### Tests
- [ ] `npm test` passes locally
- [ ] New behavior is covered by unit or integration tests
- [ ] Integration tests clean up their own DB rows (no `DELETE FROM tasks;`)

### Build
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` passes

### Security
- [ ] No credentials, tokens, or real emails committed
- [ ] Input validated / sanitized where applicable
- [ ] Auth checks in place for new API routes

### Documentation
- [ ] README updated if new setup steps are required
- [ ] AGENTS.md updated if project structure or key patterns changed
- [ ] CHANGELOG.md entry added under `[Unreleased]`

## Testing Notes

<!-- Describe how you tested this change (unit tests, manual browser test, etc.) -->

## Screenshots (if applicable)

<!-- Drag and drop images here -->
