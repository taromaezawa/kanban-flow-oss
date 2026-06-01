# Contributing to kanban-flow-oss

Thank you for your interest in contributing! This document outlines the process.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/kanban-flow-oss`
3. Create a branch: `git checkout -b feature/your-feature`
4. Follow the [Quick Start](README.md#quick-start) section in README.md

## Development Process

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: prettier (auto-format on save recommended)
- **Linting**: ESLint + TypeScript strict rules

### Before Opening a PR

1. **Test locally**
   ```bash
   npm run lint
   npm run build
   npm test
   ```

2. **Create a branch** from `main`
   ```bash
   git checkout -b fix/issue-name
   git checkout -b feature/new-feature
   ```

3. **Write clear commit messages**
   ```
   fix: resolve task drag-and-drop on Safari
   feat: add task filtering by label
   refactor: simplify database queries
   ```

## Pull Request Process

1. **Create a PR** with a description of changes
2. **Link issues**: Reference any related GitHub issues (#123)
3. **Include test coverage**: Add or update tests if behavior changes
4. **Wait for review**: A maintainer will review within a few days

### PR Checklist

- [ ] Code follows TypeScript strict mode
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in browser
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and atomic

## Reporting Issues

Before opening an issue, check:
- [Open issues](https://github.com/taromaezawa/kanban-flow-oss/issues)
- [GitHub Discussions](https://github.com/taromaezawa/kanban-flow-oss/discussions)

### Issue Template

```
## Description
Brief description of the bug or feature request.

## Steps to Reproduce
1. ...
2. ...

## Expected Behavior
What should happen.

## Actual Behavior
What is happening.

## Environment
- Node version: 
- Database: Neon
- Browser: Chrome 120
```

## Testing Guidelines

### Unit Tests

Pure logic tests (no DB dependency):

```typescript
// lib/__tests__/columns.test.ts
describe('getNextStatus', () => {
  it('should return next status in COLUMN_ORDER', () => {
    expect(getNextStatus('backlog')).toBe('assigned');
  });
});
```

### Integration Tests

Tests with real Neon database:

```typescript
// __tests__/tasks.test.ts
it('should create and retrieve a task', async () => {
  const task = await createTask({...});
  const fetched = await getTask(task.id);
  expect(fetched.title).toBe(task.title);
  
  await deleteTask(task.id);  // cleanup
});
```

**Important**: Clean up test data after each test. Do NOT do `DELETE FROM tasks;` — only delete rows you created.

## Architecture Notes

- **Server Components**: Initial data fetching (`app/board/page.tsx`)
- **Client Components**: Interactive state updates (`KanbanBoard.tsx`)
- **API Routes**: `/api/*` for REST endpoints (GET, POST, PUT, DELETE)
- **Middleware**: `middleware.ts` checks auth (cookie presence)
- **Single Source of Truth**: `lib/columns.ts` defines COLUMN_ORDER, VALID_STATUSES, VALID_ASSIGNEES

See [AGENTS.md](AGENTS.md) for detailed architecture.

## Slack Integration (Optional)

To test Slack posting locally:

1. Create a Slack App at [api.slack.com](https://api.slack.com)
2. Add OAuth Scope: `chat:write`, `channels:read`
3. Invite bot to a test channel
4. Set `SLACK_BOT_TOKEN` in `.env.local`
5. Create a task and select the channel

## Release Process

Maintainers only:

```bash
# Ensure main is clean and tests pass
npm run build && npm test

# Tag release
git tag v0.2.0
git push origin v0.2.0

# Deploy to Vercel
vercel --prod
```

## Questions?

- Open a [GitHub Discussion](https://github.com/taromaezawa/kanban-flow-oss/discussions)
- Check [README.md](README.md) and [AGENTS.md](AGENTS.md)

---

Thank you for contributing! 🙏
