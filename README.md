# KanbanFlow OSS

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-Jest-green?logo=jest)](https://jestjs.io/)

A self-hosted Kanban task management tool as an open-source alternative to Jooto.

**日本語: Jooto の代替となるセルフホスト型カンバンタスク管理ツール**

## 🏆 Why This Project?

**The Problem**: Companies across industries depend on SaaS task management tools. But SaaS means:
- 📊 Your data lives on someone else's servers
- 💸 Monthly subscriptions that lock you in
- 🔒 Privacy concerns about vendor compliance
- 🚫 Risk of service discontinuation

**The Solution**: KanbanFlow brings task management in-house.
- **Full Control**: Your data on your infrastructure
- **No Vendor Lock-in**: Export anytime, own your workflow
- **Privacy-First**: No SaaS pricing surprises, no data harvesting
- **Already Battle-Tested**: Running in production with 10+ users

> Trusted by teams that value data privacy and operational simplicity.

## What is KanbanFlow?

KanbanFlow is a lightweight, team-friendly task management system built with Next.js 14. It eliminates dependency on proprietary SaaS platforms and runs on your own infrastructure.

- 📊 **Kanban Board**: 10-column layout with drag-and-drop task management
- 👥 **Team Integration**: Assign tasks to team members, add comments and labels
- 💬 **Slack Integration**: Auto-post task creation to Slack channels (optional)
- 🔐 **Self-Hosted**: Full control over data and infrastructure
- ⚡ **Serverless**: Runs on Vercel with Neon PostgreSQL backend

## Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn
- Neon PostgreSQL account (free tier available at [neon.tech](https://neon.tech))
- Vercel account (optional, for deployment)

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/taromaezawa/kanban-flow-oss
   cd kanban-flow-oss
   npm install
   ```

2. **Set up environment variables**

   ```bash
   # Copy the template
   cp .env.example .env.local
   
   # Add your Neon connection string
   # Get it from: https://console.neon.tech/
   DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/neondb
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   SLACK_BOT_TOKEN=xoxb-...  # Optional, for Slack integration
   ```

3. **Initialize the database**

   - Create a new branch/database in Neon
   - Run schema from `db/schema.sql` via Neon console
   - Update `DATABASE_URL` to point to it

4. **Set up team users** (`settei.json`)

   ```bash
   cp settei.json.example settei.json
   # Edit settei.json with your team member emails and hashed passwords
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Deployment to Vercel

```bash
vercel link
vercel env add DATABASE_URL         # Production Neon connection
vercel env add NEXT_PUBLIC_BASE_URL # https://your-domain.vercel.app
vercel env add SLACK_BOT_TOKEN      # Optional

# Apply schema to production Neon database
# Then deploy:
vercel --prod
```

## ⭐ Why Star This?

This project is a candidate for the **OpenAI Codex for OSS program**. Here's why your support matters:

### The Goal
We're aiming for **300+ stars** to qualify for OpenAI Codex for OSS support. With that partnership:
- 🤖 Enhanced code quality through AI-assisted development
- ✅ Improved testing coverage and automation
- 📚 Better documentation and onboarding
- 🚀 Faster feature delivery

### Your Impact
Every star directly supports:
1. **Adoption**: More teams discover privacy-first task management
2. **Trust**: Community validation of security and code quality
3. **Growth**: Resources for maintenance and feature development
4. **Sustainability**: Making OSS development viable long-term

**Your star helps open-source development thrive.** 🙏

---

## Scope

**スコープ**: 本ツールはSlack連携を中心としたカンバン型タスク管理に特化します。ガントチャートや工数管理等のプロジェクト管理機能は本ツールのスコープ外です。

## Features

### Kanban Board

- **10 Columns**: Workflow status → Team members (8 slots) → Completed
- **Drag & Drop**: Move tasks between columns with @hello-pangea/dnd
- **Task Labels**: Attach up to 4 labels per task for categorization

![Kanban Board Overview](/public/screenshots/kanban-board.png)

### Task Management

- Create tasks with title, description, assignee, due date
- Add comments to tasks
- Delete tasks (creator only)
- Tag tasks with custom labels

![Task Creation Modal](/public/screenshots/task-creation.png)

### Slack Integration

- Auto-post task creation to selected Slack channel
- Store task permalink in database
- Supports multiple channels per Neon database

![Slack Integration Notification](/public/screenshots/slack-integration.png)

### Security

- Password-based authentication with bcrypt
- Session-based cookie auth
- Input validation (XSS protection)
- Role-based access control (creator-only delete)

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript
- **Database**: Neon (Serverless PostgreSQL)
- **UI**: Tailwind CSS, @hello-pangea/dnd
- **Auth**: bcryptjs, httpOnly Cookies
- **Hosting**: Vercel
- **Testing**: Jest + ts-jest

## Project Structure

```
.
├── app/                  # Next.js App Router
│   ├── page.tsx         # Home/login
│   ├── board/
│   ├── tasks/
│   └── api/             # REST endpoints
├── lib/                 # Business logic
│   ├── auth.ts
│   ├── users.ts
│   ├── columns.ts       # Kanban column config
│   └── slack.ts
├── db/
│   ├── database.ts      # Neon connection
│   ├── queries.ts       # SQL helpers
│   └── schema.sql       # Database schema
├── __tests__/           # Jest tests
└── settei.json          # User config (git-ignored)
```

## Development

### Available Scripts

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm start          # Start prod server
npm test           # Run Jest tests
npm run lint       # Run TypeScript & ESLint
```

### Testing

Integration tests use a real Neon database. See `jest.setup.ts`.

```bash
npm test           # Run all tests
npm test -- --watch  # Watch mode
```

### Database

Schema changes:
1. Edit `db/schema.sql`
2. Apply via Neon console (or `neonctl` CLI)
3. Test with `npm test`

**No migrations framework** — manual schema management via Neon.

## Configuration

### settei.json

```json
{
  "users": [
    { "email": "user@example.com", "passwordHash": "bcrypt(...)" }
  ]
}
```

Generate password hash:

```bash
node -e "console.log(require('bcryptjs').hashSync('password', 10))"
```

### Slack Bot Token

1. Create a Slack App at [api.slack.com](https://api.slack.com)
2. Add OAuth Scope: `chat:write`, `channels:read`
3. Generate Bot Token → Set `SLACK_BOT_TOKEN` in `.env.local` / Vercel

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

To report a vulnerability, please see [SECURITY.md](SECURITY.md). Do **not** open a public issue for security bugs.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT © 2024 Taro Maezawa

## Screenshot

Kanban board with team member columns:

```
[Create Task] [Label Filter]

┌─────────┬──────────┬────────┬────────┐
│ Backlog │ Assigned │ In Dev │ Review │  ... [Done]
├─────────┼──────────┼────────┼────────┤
│ Task A  │ Task B   │        │        │
│ Task C  │          │ Task D │ Task E │
└─────────┴──────────┴────────┴────────┘
```

## Support

- **Issues**: [GitHub Issues](https://github.com/taromaezawa/kanban-flow-oss/issues)
- **Discussions**: [GitHub Discussions](https://github.com/taromaezawa/kanban-flow-oss/discussions)

---

Built with ❤️ for teams who value data ownership and simplicity.
