-- db/schema.sql
-- Neon (PostgreSQL) 用スキーマ。初回に Neon コンソールで手動実行する。

CREATE TABLE IF NOT EXISTS tasks (
  id           SERIAL       PRIMARY KEY,
  title        TEXT         NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  status       TEXT         NOT NULL DEFAULT '作業一覧',
  assignee     TEXT,
  start_date   TEXT,
  end_date     TEXT,
  slack_url    TEXT         NOT NULL DEFAULT '',
  done         INTEGER      NOT NULL DEFAULT 0,
  creator      TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 既存DBへの追加列（B案 Slack連携）。再実行しても安全なように IF NOT EXISTS。
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;  -- 投稿先チャンネル 例 C0XXXX（任意）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_message_ts TEXT;  -- 投稿メッセージの ts（記録/将来のスレッド返信用）

CREATE TABLE IF NOT EXISTS labels (
  id    SERIAL PRIMARY KEY,
  name  TEXT   NOT NULL UNIQUE,
  color TEXT   NOT NULL DEFAULT '#6B7280'
);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id  INTEGER NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL      PRIMARY KEY,
  task_id    INTEGER     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author     TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT        PRIMARY KEY,
  email      TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

INSERT INTO labels (name, color) VALUES
  ('作業中',           '#F97316'),
  ('校正中',           '#EC4899'),
  ('作業完了',         '#3B82F6'),
  ('お客様確認中',     '#22C55E'),
  ('校了',             '#8B5CF6'),
  ('指定日時更新待機', '#1D4ED8'),
  ('依頼前',           '#111827'),
  ('確認依頼中A',       '#7C3AED'),
  ('確認依頼中B',       '#EF4444')
ON CONFLICT (name) DO NOTHING;
