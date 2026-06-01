# AGENTS.md — Codex Navigation Guide

This document helps AI agents (like OpenAI Codex) understand the codebase structure and how to navigate it efficiently.

## Repository Overview

**kanban-flow-oss** is a Next.js 14 serverless Kanban task manager with Neon PostgreSQL and Slack integration.

- **Language**: TypeScript
- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL (HTTP driver)
- **Key File**: `app/`, `lib/`, `db/`

## Codebase Structure

### `app/` — Next.js App Router

**Routing**: Directory structure = URL routes

```
app/
├── page.tsx              # / (redirect to /login or /board)
├── layout.tsx            # Root layout (nav, styles)
├── login/
│   └── page.tsx          # /login (login form)
├── board/
│   └── page.tsx          # /board (Kanban board, SSR)
├── tasks/
│   └── [id]/
│       ├── page.tsx      # /tasks/[id] (task detail)
│       └── TaskDetail.tsx # Task detail client component
└── api/
    ├── auth/
    │   ├── login/route.ts  # POST /api/auth/login
    │   └── logout/route.ts # POST /api/auth/logout
    ├── me/route.ts         # GET /api/me (current user)
    ├── tasks/
    │   ├── route.ts        # POST /api/tasks (create task)
    │   └── [id]/
    │       ├── route.ts    # PUT/DELETE /api/tasks/[id]
    │       └── comments/route.ts # POST /api/tasks/[id]/comments
    ├── labels/route.ts     # CRUD /api/labels
    └── slack/
        └── channels/route.ts # GET /api/slack/channels
```

**Key Files**:
- **page.tsx**: Server Component with `export const dynamic = 'force-dynamic'`
- **route.ts**: Route Handler (POST/GET/PUT/DELETE)
- **middleware.ts**: Auth guard (checks httpOnly cookie)

### `lib/` — Business Logic & Utilities

```
lib/
├── auth.ts         # login(), requireAuth(), getSession()
├── users.ts        # User list from settei.json
├── columns.ts      # COLUMN_ORDER, VALID_STATUSES, VALID_ASSIGNEES
├── slack.ts        # postToSlack(), getChannels()
├── url.ts          # safeHttpUrl(), isAllowedSlackUrl()
├── color.ts        # colorFromString() — deterministic label colors
├── limits.ts       # MAX_LABELS_PER_TASK and other constants
└── page-auth.ts    # requireUser() for Server Components
```

**Usage Pattern**:
```typescript
// Server Component
import { requireUser } from '@/lib/page-auth'
export default async function BoardPage() {
  const user = await requireUser()  // Throws if not auth
  // ...
}

// Route Handler
import { requireAuth } from '@/lib/auth'
export async function PUT(req: Request) {
  const session = await requireAuth(req)  // 401 if missing
  // ...
}
```

### `db/` — Database

```
db/
├── database.ts     # Neon connection, sql template, export db
├── queries.ts      # Pre-built DB queries (getTask, createTask, etc.)
└── schema.sql      # PostgreSQL DDL (apply manually to Neon)
```

**Neon HTTP Driver** (`@neondatabase/serverless`):
- No connection pooling needed
- Each query = 1 HTTP request
- Use `sql\`...\`` template literals or `sql(text, params)`

```typescript
import { sql } from '@/db/database'

// Tagged template (recommended for static queries)
const task = await sql`SELECT * FROM tasks WHERE id = ${taskId}`

// Function form (for dynamic queries)
const tasks = await sql('SELECT * FROM tasks WHERE status = $1', [status])
```

### `__tests__/` — Jest Tests

```
__tests__/
├── lib/
│   ├── auth.test.ts            # Auth helpers
│   ├── auth-expired.test.ts    # Expired session handling
│   ├── color.test.ts           # colorFromString()
│   ├── color-from-string.test.ts
│   ├── database.test.ts        # DB connection helpers
│   ├── limits.test.ts          # Limit constants
│   ├── slack.test.ts           # Slack integration
│   ├── url.test.ts             # URL validation
│   ├── users.test.ts           # User list loading
│   └── users-env.test.ts       # Users from env
└── db/
    └── queries.test.ts         # Real Neon integration tests
```

**Test Guidelines**:
- **Unit tests**: Pure functions, no DB required
- **Integration tests**: Use real Neon, clean up after

```typescript
// .test.ts cleanup pattern
afterEach(async () => {
  await sql`DELETE FROM task_labels WHERE task_id = ${createdTaskId}`
  await sql`DELETE FROM tasks WHERE id = ${createdTaskId}`
})
```

## Key Patterns

### Authentication Flow

```
Browser                              Server
   |                                   |
   | POST /api/auth/login              |
   |----(email, password)------------->|
   |                                   | bcrypt.compare()
   |                                   | INSERT INTO sessions
   |<------ Set-Cookie (httpOnly)------|
   |                                   |
   | GET /board                        |
   |------ (Cookie) ----------------->|
   |                                   | middleware.ts checks Cookie
   |                                   | getSession() verifies token
   |<------ HTML (force-dynamic)-------|
```

### Data Flow (Create Task)

```
KanbanBoard.tsx (Client)
  |
  | onClick → fetch('/api/tasks', {method: 'POST', body: {...}})
  |
  | (Server) → app/api/tasks/route.ts
  |   ├─ requireAuth()
  |   ├─ validateInput()
  |   ├─ createTask() in db/queries.ts
  |   ├─ postToSlack() (optional, non-blocking)
  |   └─ return 201 {task}
  |
  | (Client) → setTasks([...tasks, newTask])
```

### Column Definitions

**Single source of truth**: `lib/columns.ts`

```typescript
export const COLUMN_ORDER = [
  'backlog',
  'alice@example.com',
  'bob@example.com',
  // ... 8 team members total
  'completed'
]

export const VALID_STATUSES = ['backlog', 'in-progress', 'completed']
export const VALID_ASSIGNEES = ['alice@example.com', 'bob@example.com']
```

Used by:
- `app/board/page.tsx` — render columns
- `app/api/tasks/route.ts` — validate PUT status/assignee
- Components — map status to column

## Common Tasks for Agents

### Add a New Feature

**Example**: Add task priority field

1. **Schema**: `db/schema.sql`
   ```sql
   ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium';
   ```
   Apply to Neon via console.

2. **DB queries**: `db/queries.ts`
   ```typescript
   export async function createTask(title: string, priority: string) {
     return sql`INSERT INTO tasks (title, priority) VALUES (${title}, ${priority})`
   }
   ```

3. **API**: `app/api/tasks/route.ts`
   ```typescript
   const { priority } = await req.json()
   validatePriority(priority)  // Add validation
   ```

4. **UI**: `components/KanbanBoard.tsx`
   ```typescript
   <TaskDetail priority={task.priority} onPriorityChange={...} />
   ```

5. **Tests**: `__tests__/db/tasks.integration.test.ts`
   ```typescript
   it('should create task with priority', async () => {
     const task = await createTask('Fix bug', 'high')
     expect(task.priority).toBe('high')
   })
   ```

### Debug Auth Issues

1. **Check session**: `lib/auth.ts` → `getSession()`
2. **Check middleware**: `middleware.ts` → cookie validation logic
3. **Check cookies**: Browser DevTools → Application → Cookies
4. **Check database**: `SELECT * FROM sessions WHERE token = ?`

### Add Slack Channel

1. **Get channels**: `lib/slack.ts` → `getChannels()` (called by `GET /api/slack/channels`)
2. **Validate channel**: `lib/slack.ts` → validate `channel_id` format
3. **Post task**: `lib/slack.ts` → `postToSlack()` → stores `slack_message_ts`
4. **Error handling**: Log error, return `{ slack_error }` in response (non-blocking)

## Development Workflow with Codex

### Typical Session

1. **Explore**: Read `AGENTS.md` (this file) + `CLAUDE.md`
2. **Locate**: Find relevant files using `grep` or file pattern matching
3. **Understand**: Read key files (schemas, types, handlers)
4. **Plan**: Design changes (DB, API, UI layers)
5. **Implement**: Edit files, test locally
6. **Test**: Run `npm test`, check browser
7. **Commit**: Write clear commit message

### Useful Grep Patterns

```bash
# Find all SQL queries
grep -r "SELECT\|INSERT\|UPDATE" db/ lib/ app/

# Find error handling
grep -r "throw\|catch\|error" app/api/

# Find Slack integration points
grep -r "postToSlack\|getChannels" --include="*.ts"

# Find validation rules
grep -r "VALID_" lib/

# Find test files
find __tests__ -name "*.test.ts"
```

### Fast Local Testing

```bash
# Unit test (instant)
npm test -- lib/columns.test.ts

# Integration test (uses real Neon, takes ~2-5s)
npm test -- tasks.integration.test.ts

# Type check only
npx tsc --noEmit

# Build check
npm run build
```

## Database Schema Overview

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT (references COLUMN_ORDER),
  assignee TEXT (references VALID_ASSIGNEES),
  creator TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  slack_url TEXT,
  slack_channel_id TEXT,
  slack_message_ts TEXT
);

CREATE TABLE labels (
  id UUID PRIMARY KEY,
  label TEXT UNIQUE NOT NULL
);

CREATE TABLE task_labels (
  task_id UUID REFERENCES tasks ON DELETE CASCADE,
  label_id UUID REFERENCES labels ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP NOT NULL
);
```

## Performance Notes

- **Server Components**: Initial SSR fetch (force-dynamic)
- **Drag & Drop**: Client-side with instant UI update, then DB sync
- **Comments/Labels**: Lazy-loaded or inline updates
- **Slack**: Non-blocking (fire-and-forget, store result asynchronously)

## Security Checklist

- ✅ XSS: URL validation in `lib/url.ts`, Slack URL whitelist
- ✅ SQL Injection: Parameterized queries (neon driver)
- ✅ CSRF: httpOnly cookies (no JS access)
- ✅ AuthN: bcrypt password, session token
- ✅ AuthZ: creator-only DELETE, API validates status/assignee against lib/columns.ts

---

**Last updated**: 2024-06  
**Maintainer**: Taro Maezawa  
For questions, see [CONTRIBUTING.md](CONTRIBUTING.md) or GitHub Discussions.
