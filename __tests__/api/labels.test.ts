// __tests__/api/labels.test.ts
// 結合テスト: GET /api/labels と POST /api/labels。
// 実 Neon に接続し、作成したラベルのみ後始末する。
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/labels/route";
import { createSession, deleteSession } from "@/lib/auth";
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const EMAIL = "admin@example.com";

function makeReq(
  method: "GET" | "POST",
  body?: unknown,
  token?: string,
): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers["cookie"] = `session=${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  return new NextRequest("http://localhost/api/labels", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/labels (no auth)", () => {
  it("認証なしで401が返る", async () => {
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });
});

describeOrSkip("GET /api/labels と POST /api/labels (integration)", () => {
  let token: string;
  const createdLabelIds: number[] = [];

  beforeAll(async () => {
    token = await createSession(EMAIL);
  });

  afterAll(async () => {
    for (const id of createdLabelIds) {
      await sql`DELETE FROM labels WHERE id = ${id}`;
    }
    await deleteSession(token);
  });

  it("認証ありでラベル一覧が返る（JSON配列）", async () => {
    const res = await GET(makeReq("GET", undefined, token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("POST /api/labels: 認証なしで401が返る", async () => {
    const res = await POST(
      makeReq("POST", { name: "テストラベル", color: "#ff0000" }),
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/labels: 名前と色を渡して201とラベルオブジェクトが返る", async () => {
    const uniqueName = `テストラベル-${Date.now()}`;
    const res = await POST(
      makeReq("POST", { name: uniqueName, color: "#ff0000" }, token),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeGreaterThan(0);
    expect(body.name).toBe(uniqueName);
    expect(body.color).toBe("#ff0000");
    createdLabelIds.push(body.id);
  });

  it("POST /api/labels: 同じ名前で重複作成しようとすると409が返る", async () => {
    const uniqueName = `重複ラベル-${Date.now()}`;
    // 1回目: 成功
    const first = await POST(
      makeReq("POST", { name: uniqueName, color: "#aabbcc" }, token),
    );
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    createdLabelIds.push(firstBody.id);

    // 2回目: 重複で409
    const second = await POST(
      makeReq("POST", { name: uniqueName, color: "#aabbcc" }, token),
    );
    expect(second.status).toBe(409);
  });

  it("POST /api/labels: 名前なしで400が返る", async () => {
    const res = await POST(
      makeReq("POST", { name: "", color: "#ff0000" }, token),
    );
    expect(res.status).toBe(400);
  });
});
