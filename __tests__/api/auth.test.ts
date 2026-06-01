// __tests__/api/auth.test.ts
// 結合テスト: POST /api/auth/login と POST /api/auth/logout。
// lib/users.ts の getSettings() をモックし、既知パスワードのユーザーを差し込む。
// 実 Neon に接続し、作成したセッションのみ後始末する。
import { NextRequest } from "next/server";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { getSession } from "@/lib/auth";
import { sql } from "@/db/database";
import bcrypt from "bcryptjs";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

// テスト用の平文パスワード
const TEST_PASSWORD = "testpassword123";
// bcrypt ハッシュは beforeAll で生成
let TEST_HASH: string;

const TEST_EMAIL = "test-auth@example.com";

// lib/users.ts の getSettings をモック
jest.mock("@/lib/users", () => {
  const original = jest.requireActual("@/lib/users");
  return {
    ...original,
    getSettings: jest.fn(),
    findUserByEmail: jest.fn(),
  };
});

import { getSettings, findUserByEmail } from "@/lib/users";

const createdTokens: string[] = [];

function makeLoginReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeLogoutReq(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers["cookie"] = `session=${token}`;
  return new NextRequest("http://localhost/api/auth/logout", {
    method: "POST",
    headers,
  });
}

beforeAll(async () => {
  TEST_HASH = await bcrypt.hash(TEST_PASSWORD, 10);

  const mockUser = {
    name: "テストユーザー",
    email: TEST_EMAIL,
    password: TEST_HASH,
  };
  (getSettings as jest.Mock).mockReturnValue({ users: [mockUser] });
  (findUserByEmail as jest.Mock).mockImplementation((email: string) =>
    email === TEST_EMAIL ? mockUser : null,
  );
});

afterAll(async () => {
  if (!HAS_DB) return;
  for (const token of createdTokens) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
});

describeOrSkip("POST /api/auth/login", () => {
  it("正しいメール＋パスワードで200とSet-Cookieが返る", async () => {
    const res = await loginPOST(
      makeLoginReq({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("session=");

    // クッキーからトークンを取り出して後始末リストへ追加
    const match = setCookie?.match(/session=([^;]+)/);
    if (match) createdTokens.push(match[1]);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.email).toBe(TEST_EMAIL);
  });

  it("不正なパスワードで401が返る", async () => {
    const res = await loginPOST(
      makeLoginReq({ email: TEST_EMAIL, password: "wrongpassword" }),
    );
    expect(res.status).toBe(401);
  });

  it("存在しないメールで401が返る", async () => {
    const res = await loginPOST(
      makeLoginReq({ email: "notexist@example.com", password: TEST_PASSWORD }),
    );
    expect(res.status).toBe(401);
  });

  it("bodyなしで400が返る", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(400);
  });
});

describeOrSkip("POST /api/auth/logout", () => {
  it("セッションが削除される（その後 getSession で null になる）", async () => {
    // まずログインしてセッションを作成
    const loginRes = await loginPOST(
      makeLoginReq({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    );
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get("set-cookie");
    const match = setCookie?.match(/session=([^;]+)/);
    const token = match?.[1];
    expect(token).toBeTruthy();

    // ログアウト
    const logoutRes = await logoutPOST(makeLogoutReq(token!));
    expect(logoutRes.status).toBe(200);

    // セッションが消えていることを確認
    const email = await getSession(token!);
    expect(email).toBeNull();
  });
});
