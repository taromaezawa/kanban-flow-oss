// __tests__/api/task-detail.test.ts
// 結合テスト: GET/PUT/DELETE /api/tasks/[id] と GET/POST /api/tasks/[id]/comments。
// 実 Neon に接続し、作成した行のみ後始末する。
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "@/app/api/tasks/[id]/route";
import {
  GET as commentsGET,
  POST as commentsPOST,
} from "@/app/api/tasks/[id]/comments/route";
import { createSession, deleteSession } from "@/lib/auth";
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const CREATOR_EMAIL = "creator@example.com";
const OTHER_EMAIL = "other@example.com";

// ルートパラメータを模倣するヘルパー
function makeParams(id: number) {
  return { params: { id: String(id) } };
}

function makeReq(
  url: string,
  method: "GET" | "PUT" | "DELETE" | "POST",
  body?: unknown,
  token?: string,
): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers["cookie"] = `session=${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describeOrSkip(
  "GET/PUT/DELETE /api/tasks/[id] と GET/POST /api/tasks/[id]/comments (integration)",
  () => {
    let creatorToken: string;
    let otherToken: string;
    let taskId: number;
    const createdCommentIds: number[] = [];

    beforeAll(async () => {
      creatorToken = await createSession(CREATOR_EMAIL);
      otherToken = await createSession(OTHER_EMAIL);

      // テスト用タスクを直接 DB に作成
      const rows = (await sql`
      INSERT INTO tasks (title, creator, status)
      VALUES ('テストタスク-task-detail', ${CREATOR_EMAIL}, '作業一覧')
      RETURNING id
    `) as { id: number }[];
      taskId = rows[0].id;
    });

    afterAll(async () => {
      for (const id of createdCommentIds) {
        await sql`DELETE FROM comments WHERE id = ${id}`;
      }
      await sql`DELETE FROM tasks WHERE id = ${taskId}`;
      await deleteSession(creatorToken);
      await deleteSession(otherToken);
    });

    // ── GET ──────────────────────────────────────────────
    describe("GET /api/tasks/[id]", () => {
      it("存在するタスクのデータが返る", async () => {
        const req = makeReq(
          `http://localhost/api/tasks/${taskId}`,
          "GET",
          undefined,
          creatorToken,
        );
        const res = await GET(req, makeParams(taskId));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(taskId);
        expect(body.title).toBe("テストタスク-task-detail");
      });

      it("存在しないIDで404が返る", async () => {
        const fakeId = 999999999;
        const req = makeReq(
          `http://localhost/api/tasks/${fakeId}`,
          "GET",
          undefined,
          creatorToken,
        );
        const res = await GET(req, makeParams(fakeId));
        expect(res.status).toBe(404);
      });
    });

    // ── PUT ──────────────────────────────────────────────
    describe("PUT /api/tasks/[id]", () => {
      it("タイトルを更新できる", async () => {
        const newTitle = "更新済みタイトル";
        const req = makeReq(
          `http://localhost/api/tasks/${taskId}`,
          "PUT",
          { title: newTitle },
          creatorToken,
        );
        const res = await PUT(req, makeParams(taskId));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.title).toBe(newTitle);
      });

      it('status を "完了リスト" に更新すると done=1 になる', async () => {
        const req = makeReq(
          `http://localhost/api/tasks/${taskId}`,
          "PUT",
          { status: "完了リスト" },
          creatorToken,
        );
        const res = await PUT(req, makeParams(taskId));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe("完了リスト");
        expect(body.done).toBe(1);

        // テスト後に元の status に戻す
        await sql`UPDATE tasks SET status = '作業一覧', done = 0 WHERE id = ${taskId}`;
      });
    });

    // ── DELETE ───────────────────────────────────────────
    describe("DELETE /api/tasks/[id]", () => {
      it("作成者以外は削除できない（403）", async () => {
        const req = makeReq(
          `http://localhost/api/tasks/${taskId}`,
          "DELETE",
          undefined,
          otherToken,
        );
        const res = await DELETE(req, makeParams(taskId));
        expect(res.status).toBe(403);
      });

      it("作成者が削除できる（200）", async () => {
        // 削除専用のタスクを別途作成
        const rows = (await sql`
        INSERT INTO tasks (title, creator, status)
        VALUES ('削除テストタスク', ${CREATOR_EMAIL}, '作業一覧')
        RETURNING id
      `) as { id: number }[];
        const deleteTargetId = rows[0].id;

        const req = makeReq(
          `http://localhost/api/tasks/${deleteTargetId}`,
          "DELETE",
          undefined,
          creatorToken,
        );
        const res = await DELETE(req, makeParams(deleteTargetId));
        expect([200, 204]).toContain(res.status);

        // 削除されていることを確認
        const check =
          (await sql`SELECT id FROM tasks WHERE id = ${deleteTargetId}`) as any[];
        expect(check.length).toBe(0);
      });
    });

    // ── Comments ─────────────────────────────────────────
    describe("POST /api/tasks/[id]/comments", () => {
      it("コメントを追加できる", async () => {
        const req = makeReq(
          `http://localhost/api/tasks/${taskId}/comments`,
          "POST",
          { content: "テストコメント" },
          creatorToken,
        );
        const res = await commentsPOST(req, makeParams(taskId));
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).toBeGreaterThan(0);
        expect(body.content).toBe("テストコメント");
        expect(body.task_id).toBe(taskId);
        createdCommentIds.push(body.id);
      });
    });

    describe("GET /api/tasks/[id]/comments", () => {
      it("コメント一覧が返る", async () => {
        const req = makeReq(
          `http://localhost/api/tasks/${taskId}/comments`,
          "GET",
          undefined,
          creatorToken,
        );
        const res = await commentsGET(req, makeParams(taskId));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        // 直前のテストで追加したコメントが含まれること
        const found = body.find((c: any) => c.content === "テストコメント");
        expect(found).toBeTruthy();
      });
    });
  },
);
