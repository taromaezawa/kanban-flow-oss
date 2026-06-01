// __tests__/lib/auth.test.ts
// 結合テスト: 実 Neon DB の sessions テーブルを使う。作成したトークンのみ後始末する。
import { createSession, getSession, deleteSession } from "@/lib/auth";
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const TEST_EMAIL = "test-auth@example.com";
const createdTokens: string[] = [];

async function track(token: string) {
  createdTokens.push(token);
  return token;
}

afterAll(async () => {
  if (!HAS_DB) return;
  for (const token of createdTokens) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
});

describeOrSkip("auth (integration)", () => {
  it("createSession inserts a session and returns token", async () => {
    const token = await track(await createSession(TEST_EMAIL));
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);
    const rows =
      (await sql`SELECT token FROM sessions WHERE token = ${token}`) as any[];
    expect(rows.length).toBe(1);
  });

  it("getSession returns email for valid token", async () => {
    const token = await track(await createSession(TEST_EMAIL));
    const email = await getSession(token);
    expect(email).toBe(TEST_EMAIL);
  });

  it("getSession returns null for invalid token", async () => {
    const email = await getSession("invalid-token");
    expect(email).toBeNull();
  });

  it("getSession returns null for expired token", async () => {
    const token =
      "expiredtoken1234567890abcdef1234567890abcdef1234567890abcdef12";
    await track(token);
    const pastDate = new Date(Date.now() - 1000).toISOString();
    await sql`INSERT INTO sessions (token, email, expires_at) VALUES (${token}, ${TEST_EMAIL}, ${pastDate})`;
    const email = await getSession(token);
    expect(email).toBeNull();
  });

  it("deleteSession removes the session", async () => {
    const token = await track(await createSession(TEST_EMAIL));
    await deleteSession(token);
    const email = await getSession(token);
    expect(email).toBeNull();
  });
});
