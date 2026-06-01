// __tests__/db/queries.test.ts
// 結合テスト: 実 Neon DB の tasks / labels / task_labels テーブルを使う。
// 作成した行のみ後始末する（blanket DELETE はしない）。
import { sql } from "@/db/database";
import { setTaskLabels, getTasksWithLabels, attachLabels } from "@/db/queries";

const HAS_DB = !!process.env.DATABASE_URL;
const describeOrSkip = HAS_DB ? describe : describe.skip;

const CREATOR = "test-queries@example.com";
const createdTaskIds: number[] = [];
const createdLabelIds: number[] = [];

async function insertTask(title: string): Promise<number> {
  const rows = (await sql`
    INSERT INTO tasks (title, creator) VALUES (${title}, ${CREATOR})
    RETURNING id
  `) as { id: number }[];
  const id = rows[0].id;
  createdTaskIds.push(id);
  return id;
}

async function insertLabel(name: string, color = "#000000"): Promise<number> {
  const rows = (await sql`
    INSERT INTO labels (name, color) VALUES (${name}, ${color})
    RETURNING id
  `) as { id: number }[];
  const id = rows[0].id;
  createdLabelIds.push(id);
  return id;
}

afterAll(async () => {
  if (!HAS_DB) return;
  // task_labels は CASCADE DELETE されるので task 削除で自動削除
  for (const id of createdTaskIds) {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
  }
  for (const id of createdLabelIds) {
    await sql`DELETE FROM labels WHERE id = ${id}`;
  }
});

describeOrSkip("setTaskLabels", () => {
  it("タスクにラベルを紐付けられる", async () => {
    const taskId = await insertTask("setTaskLabels: 紐付けテスト");
    const labelId = await insertLabel("test-label-attach");

    await setTaskLabels(taskId, [labelId]);

    const rows = (await sql`
      SELECT label_id FROM task_labels WHERE task_id = ${taskId}
    `) as { label_id: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].label_id).toBe(labelId);
  });

  it("同じタスクに再度呼ぶと上書きされる（前のラベルが消えて新しいラベルになる）", async () => {
    const taskId = await insertTask("setTaskLabels: 上書きテスト");
    const labelId1 = await insertLabel("test-label-overwrite-1");
    const labelId2 = await insertLabel("test-label-overwrite-2");

    await setTaskLabels(taskId, [labelId1]);
    await setTaskLabels(taskId, [labelId2]);

    const rows = (await sql`
      SELECT label_id FROM task_labels WHERE task_id = ${taskId}
    `) as { label_id: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].label_id).toBe(labelId2);
  });

  it("5件以上のラベルIDを渡した場合、最初の4件のみ設定される（上限4件）", async () => {
    const taskId = await insertTask("setTaskLabels: 上限テスト");
    const ids = await Promise.all([
      insertLabel("test-label-limit-1"),
      insertLabel("test-label-limit-2"),
      insertLabel("test-label-limit-3"),
      insertLabel("test-label-limit-4"),
      insertLabel("test-label-limit-5"),
    ]);

    await setTaskLabels(taskId, ids);

    const rows = (await sql`
      SELECT label_id FROM task_labels WHERE task_id = ${taskId}
    `) as { label_id: number }[];
    expect(rows).toHaveLength(4);
    const storedIds = rows.map((r) => r.label_id).sort((a, b) => a - b);
    const expectedIds = ids.slice(0, 4).sort((a, b) => a - b);
    expect(storedIds).toEqual(expectedIds);
  });

  it("空配列を渡すとラベルが全て削除される", async () => {
    const taskId = await insertTask("setTaskLabels: 全削除テスト");
    const labelId = await insertLabel("test-label-delete-all");

    await setTaskLabels(taskId, [labelId]);
    await setTaskLabels(taskId, []);

    const rows = (await sql`
      SELECT label_id FROM task_labels WHERE task_id = ${taskId}
    `) as { label_id: number }[];
    expect(rows).toHaveLength(0);
  });
});

describeOrSkip("getTasksWithLabels", () => {
  it("タスク一覧を取得できる", async () => {
    const taskId = await insertTask("getTasksWithLabels: 取得テスト");

    const tasks = await getTasksWithLabels();

    const found = tasks.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.title).toBe("getTasksWithLabels: 取得テスト");
  });

  it("ラベルが付いているタスクは labels 配列にラベル情報が含まれる", async () => {
    const taskId = await insertTask("getTasksWithLabels: ラベルありテスト");
    const labelId = await insertLabel("test-label-with-task", "#FF0000");

    await setTaskLabels(taskId, [labelId]);

    const tasks = await getTasksWithLabels();
    const found = tasks.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.labels).toHaveLength(1);
    expect(found!.labels[0].id).toBe(labelId);
    expect(found!.labels[0].name).toBe("test-label-with-task");
    expect(found!.labels[0].color).toBe("#FF0000");
  });

  it("ラベルなしのタスクは labels が空配列", async () => {
    const taskId = await insertTask("getTasksWithLabels: ラベルなしテスト");

    const tasks = await getTasksWithLabels();
    const found = tasks.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.labels).toEqual([]);
  });
});

describe("attachLabels", () => {
  it("空配列を渡すと空配列が返る", async () => {
    // attachLabels は export されていないため getTasksWithLabels 経由でなく
    // 直接テストするために queries.ts から export する必要がある。
    // ここでは queries.ts の export に attachLabels が含まれていることを前提とする。
    const result = await attachLabels([]);
    expect(result).toEqual([]);
  });
});
