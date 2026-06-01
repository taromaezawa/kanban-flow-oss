// __tests__/lib/auth-expired.test.ts
// 結合テスト: 実 Neon DB の sessions テーブルを使う。作成したトークンのみ後始末する。
import { createSession, deleteExpiredSessions } from "@/lib/auth";
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const TEST_EMAIL = "test-auth@example.com";
const createdTokens: string[] = [];

afterAll(async () => {
  if (!HAS_DB) return;
  for (const token of createdTokens) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
});

describeOrSkip("deleteExpiredSessions (integration)", () => {
  it("deletes sessions whose expires_at is in the past", async () => {
    const token = "expired-test-" + Date.now().toString(16).padStart(48, "0");
    createdTokens.push(token);
    const pastDate = new Date(Date.now() - 1000).toISOString();
    await sql`INSERT INTO sessions (token, email, expires_at) VALUES (${token}, ${TEST_EMAIL}, ${pastDate})`;

    await deleteExpiredSessions();

    const rows =
      (await sql`SELECT token FROM sessions WHERE token = ${token}`) as any[];
    expect(rows.length).toBe(0);
  });

  it("does not delete sessions whose expires_at is in the future", async () => {
    const token = await createSession(TEST_EMAIL);
    createdTokens.push(token);

    await deleteExpiredSessions();

    const rows =
      (await sql`SELECT token FROM sessions WHERE token = ${token}`) as any[];
    expect(rows.length).toBe(1);
  });
});
