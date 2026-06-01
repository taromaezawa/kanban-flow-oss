# OpenAI Codex for OSS — Application Document

**Project**: kanban-flow-oss  
**Author**: Taro Maezawa (taro@repeat.co.jp)  
**Repository**: https://github.com/taromaezawa/kanban-flow-oss  
**License**: MIT  
**Date**: 2026-06-01

---

## Project Overview

**kanban-flow-oss** is an open-source, self-hostable Kanban task management tool built as a practical alternative to Jooto, a popular Japanese project management SaaS. It provides a 10-column Kanban board with drag-and-drop support, team task assignment, Slack integration, and secure authentication — all deployable for free on Vercel and Neon PostgreSQL. The project targets small-to-medium teams in Japan who need structured task management without recurring subscription costs.

---

## Problem Statement

Jooto is widely used by Japanese teams for task and project management, but its pricing model creates friction for small teams, startups, and individual contributors. Organizations that need advanced features such as multi-member boards, label management, or Slack notifications are pushed toward paid tiers that may not be justified by their scale.

There is currently no well-maintained, Japanese-market-focused, open-source Kanban alternative that replicates Jooto's core workflow. Teams are left with either paying for SaaS subscriptions or adapting generic tools (Trello, Planner) that lack the specific UX patterns Japanese teams are accustomed to.

---

## Solution

kanban-flow-oss provides a self-hosted OSS replacement with feature parity for Jooto's most-used capabilities:

- **10-column Kanban board** (Backlog → In Progress → Done and custom columns in between) with drag-and-drop reordering
- **Team collaboration** — task assignment to members, comment threads, and label-based categorization
- **Slack integration** — automatic notifications posted to a configured channel on task creation or status change
- **Authentication** — bcrypt password hashing with secure session cookies; no OAuth dependency required
- **Serverless-first** — designed to run entirely on Vercel (frontend + API routes) and Neon (serverless PostgreSQL), making it zero-cost to host at small scale

Anyone can clone the repository, configure `settei.json`, and deploy a fully operational instance in under 30 minutes.

---

## Technical Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes (serverless functions) |
| Database | Neon PostgreSQL (serverless, connection pooling) |
| Authentication | bcrypt + HTTP-only session cookies |
| Notifications | Slack Incoming Webhooks |
| Hosting | Vercel (frontend + API), Neon (DB) |
| Language | TypeScript (strict mode) |

The architecture is intentionally simple: no microservices, no message queues, no separate backend process. A single Next.js application handles all rendering and API logic, making it approachable for contributors with standard web development backgrounds.

Database migrations are managed via plain SQL scripts. The schema is minimal and well-defined:

- **tasks**: id, title, description, status, assignee, start_date, end_date, slack_url, done, creator, slack_channel_id, slack_message_ts, created_at, updated_at
- **labels**: id, name (UNIQUE), color
- **task_labels**: task_id, label_id (FK, CASCADE delete)
- **comments**: id, task_id (FK), author, content, created_at
- **sessions**: token (PK), email, expires_at

This keeps onboarding friction low.

---

## AI Integration Plan

If accepted into the OpenAI Codex for OSS program, we plan to leverage AI assistance across three areas:

### 1. Lowering Contributor Barrier
Many potential contributors understand the product (they use Jooto daily) but are uncertain where to start in a new codebase. Codex can help them understand existing code patterns, suggest where to place new features, and generate boilerplate consistent with the project's conventions.

### 2. Code Quality and Consistency
The codebase currently lacks automated linting enforcement for some TypeScript patterns and Tailwind class ordering. Codex-assisted tooling can help enforce consistent patterns in PRs and flag deviations during review without requiring maintainer bandwidth for every trivial issue.

### 3. Feature Expansion via AI-Assisted Development
Priority features on the roadmap that would benefit from Codex acceleration:
- **Natural language task creation** — parse a Slack message or freeform text into a structured task (title, assignee, column, label)
- **Automated column suggestions** — recommend the appropriate Kanban column based on task description and historical movement patterns
- **Localization** — currently Japanese-only UI; Codex can assist generating accurate English translations for international OSS adoption

### 4. Documentation Generation
API route documentation and onboarding guides are currently thin. Codex can help generate accurate, up-to-date documentation from source code, reducing the documentation lag common in OSS projects.

---

## Community & Contribution

This repository follows an open contribution model:

- All issues are public and labeled (`good first issue`, `help wanted`, `bug`, `enhancement`)
- PRs from external contributors are actively welcomed — see [CONTRIBUTING.md](CONTRIBUTING.md)
- Agent-friendly contribution guidelines are documented in [AGENTS.md](AGENTS.md), making the repo compatible with AI-assisted development workflows
- The `main` branch is protected; changes require PR review before merge
- The codebase avoids proprietary dependencies — all libraries are MIT or Apache 2.0

We aim to respond to new issues within 48 hours and review PRs within one week.

---

## Impact

**For teams**: Small teams and startups can eliminate recurring SaaS costs for task management without sacrificing the structured Kanban workflow they rely on.

**For the Japanese OSS ecosystem**: Most Kanban OSS tools are designed for Western markets. kanban-flow-oss fills a gap for Japanese teams who want a familiar UX in their native language.

**For AI-assisted development**: By maintaining clear AGENTS.md guidelines and a modular Next.js architecture, the project serves as a practical example of a codebase designed to be navigated and extended by both humans and AI agents.

**Quantified potential**: Jooto's free tier is limited to 5 members per board. Any team exceeding this threshold — which is common even in small companies — is currently forced to pay or switch tools. kanban-flow-oss removes this ceiling entirely.

---

## Repository

**GitHub**: https://github.com/taromaezawa/kanban-flow-oss

**Demo**: Coming soon — will be deployed to Vercel after initial setup.

```
kanban-flow-oss/
├── app/                  # Next.js App Router pages and API routes
├── components/           # React UI components (Kanban board, cards, modals)
├── lib/                  # Shared utilities (DB client, auth, Slack)
├── public/               # Static assets
├── settei.json.example   # Configuration template (no secrets)
├── AGENTS.md             # AI agent contribution guidelines
├── CONTRIBUTING.md       # Human contributor guidelines
├── LICENSE               # MIT
└── README.md             # Setup and deployment instructions
```

---

## Japanese Summary / 日本語サマリー

### プロジェクト概要

**kanban-flow-oss** は、日本で広く使われているタスク管理SaaS「Jooto」のOSS代替ツールです。Next.js 14、TypeScript、Neon PostgreSQL を用いたサーバーレス構成で、Vercel に無料デプロイできます。

### 解決する課題

Jooto は5名超のチームになると有料プランが必要になります。小規模チームやスタートアップが高額なSaaSに依存せずカンバン運用できる環境を提供することが本プロジェクトの目的です。

### 主要機能

- ドラッグ&ドロップ対応の10列カンバンボード（Backlog → Done）
- チームメンバーへのタスク割り当て・コメント・ラベル管理
- Slack統合（タスク作成・更新時の自動通知）
- bcrypt認証 + セッションクッキー（外部OAuth不要）
- Vercel + Neon による完全サーバーレス運用

### AI活用計画

OpenAI Codex を活用して、コントリビューターの参入障壁低下・コード品質維持・自然言語によるタスク作成機能・多言語対応を推進します。

### コントリビューション

PR歓迎。`CONTRIBUTING.md` および `AGENTS.md` を参照してください。

---

*This document was prepared for the OpenAI Codex for OSS program application.*
