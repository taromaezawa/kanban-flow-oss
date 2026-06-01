// __tests__/api/tasks.slack.test.ts
// 結合テスト: POST /api/tasks の Slack 連携部分（slack_channel_id 検証 / トークン無し degrade）。
// 実 Neon に接続し、作成した行とセッションのみ後始末する（blanket DELETE はしない）。
import { NextRequest } from "next/server";
import { POST } from "@/app/api/tasks/route";
import { createSession, deleteSession } from "@/lib/auth";
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const EMAIL = "creator@example.com";

function makeReq(body: unknown, token: string): NextRequest {
  return new NextRequest("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: `session=${token}` },
    body: JSON.stringify(body),
  });
}

describeOrSkip("POST /api/tasks Slack 連携 (integration)", () => {
  let token: string;
  const created: number[] = [];

  beforeAll(async () => {
    token = await createSession(EMAIL);
  });
  afterAll(async () => {
    for (const id of created) await sql`DELETE FROM tasks WHERE id = ${id}`;
    await deleteSession(token);
  });

  it("slack_channel_id が不正な形式なら 400 を返す", async () => {
    const res = await POST(
      makeReq({ title: "x", slack_channel_id: "not lowercase!" }, token),
    );
    expect(res.status).toBe(400);
  });

  it("SLACK_BOT_TOKEN 未設定なら slack_channel_id 付きでも投稿せずタスクは作成される", async () => {
    const prev = process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    try {
      const res = await POST(
        makeReq({ title: "slack none", slack_channel_id: "C123ABC" }, token),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeGreaterThan(0);
      // トークン無しで postTaskToChannel が throw → slack_error 経路。タスク自体は作成済み。
      expect(body.slack_error).toBeTruthy();
      expect(body.slack_message_ts ?? null).toBeNull();
      created.push(body.id);
    } finally {
      if (prev !== undefined) process.env.SLACK_BOT_TOKEN = prev;
    }
  });
});
