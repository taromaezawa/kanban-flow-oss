# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-06

### Added

- **Kanban Board**: 10-column layout (Backlog → 8 team-member columns → Completed) with drag-and-drop via `@hello-pangea/dnd`
- **Task Management**: Create, update, and delete tasks with title, description, assignee, due date, and up to 4 labels
- **Comments**: Add comments to any task; stored in PostgreSQL
- **Labels**: CRUD for custom labels, filterable on the board view
- **Slack Integration**: Optional auto-post of new tasks to a selected Slack channel; stores `slack_message_ts` for permalink
- **Authentication**: bcrypt password hashing, session tokens stored in Neon PostgreSQL, httpOnly cookie auth
- **Middleware**: Auth guard on all protected routes (`middleware.ts`)
- **Self-Hosted**: Runs on Vercel + Neon PostgreSQL — no proprietary SaaS dependency
- **Database**: PostgreSQL schema (`db/schema.sql`) for tasks, labels, task_labels, comments, and sessions tables
- **Testing**: Jest + ts-jest suite with unit tests (`lib/`) and integration tests (`__tests__/db/`) against real Neon database
- **Configuration**: `settei.json` for team user list (git-ignored); template provided as `settei.json.example`
- **OSS Documentation**: README, CONTRIBUTING, AGENTS (Codex navigation guide), LICENSE (MIT)

[Unreleased]: https://github.com/taromaezawa/kanban-flow-oss/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/taromaezawa/kanban-flow-oss/releases/tag/v0.1.0
