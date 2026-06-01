// __tests__/api/tasks.test.ts
// 結合テスト: 実 Neon DB の tasks テーブルを使う。作成した行のみ後始末する（blanket DELETE はしない）。
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const CREATOR = "creator@example.com";
const createdIds: number[] = [];

async function insertTask(title: string, status = "作業一覧"): Promise<number> {
  const rows = (await sql`
    INSERT INTO tasks (title, creator, status) VALUES (${title}, ${CREATOR}, ${status})
    RETURNING id
  `) as { id: number }[];
  const id = rows[0].id;
  createdIds.push(id);
  return id;
}

afterAll(async () => {
  if (!HAS_DB) return;
  for (const id of createdIds) {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
  }
});

describeOrSkip("tasks DB operations (integration)", () => {
  it("can insert and retrieve a task", async () => {
    const id = await insertTask("テストタスク");
    expect(id).toBeGreaterThan(0);

    const rows = (await sql`SELECT * FROM tasks WHERE id = ${id}`) as any[];
    expect(rows[0].title).toBe("テストタスク");
    expect(rows[0].status).toBe("作業一覧");
  });

  it("can update task status", async () => {
    const id = await insertTask("テスト");
    await sql`UPDATE tasks SET status = ${"assignee@example.com"}, updated_at = now() WHERE id = ${id}`;
    const rows =
      (await sql`SELECT status FROM tasks WHERE id = ${id}`) as any[];
    expect(rows[0].status).toBe("assignee@example.com");
  });

  it("can delete a task", async () => {
    const id = await insertTask("テスト");
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    const rows = (await sql`SELECT * FROM tasks WHERE id = ${id}`) as any[];
    expect(rows.length).toBe(0);
  });
});
