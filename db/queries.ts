// db/queries.ts
// タスク取得・ラベル設定の共通クエリ。API ルートと Server Component で共有する。
import { sql } from "@/db/database";

export interface TaskWithLabels {
  id: number;
  labels: { id: number; name: string; color: string }[];
  [key: string]: any;
}

/** 与えられたタスク行にラベル配列を付与する（1クエリでまとめて取得）。 */
export async function attachLabels(taskRows: any[]): Promise<TaskWithLabels[]> {
  if (taskRows.length === 0) return [];
  const ids = taskRows.map((t) => t.id);
  const labels = (await sql`
    SELECT tl.task_id, l.id, l.name, l.color
    FROM task_labels tl JOIN labels l ON l.id = tl.label_id
    WHERE tl.task_id = ANY(${ids}::int[])
  `) as any[];
  const map: Record<number, any[]> = {};
  labels.forEach((l) => {
    (map[l.task_id] ??= []).push({ id: l.id, name: l.name, color: l.color });
  });
  return taskRows.map((t) => {
    const { rn, ...rest } = t; // window関数の補助列があれば落とす
    return { ...rest, labels: map[t.id] ?? [] };
  });
}

/** 全タスクをラベル付きで取得（作成日時の降順）。小規模向け / 後方互換。 */
export async function getTasksWithLabels(): Promise<TaskWithLabels[]> {
  const tasks =
    (await sql`SELECT * FROM tasks ORDER BY created_at DESC, id DESC`) as any[];
  return attachLabels(tasks);
}

export interface ColumnsInitial {
  tasks: TaskWithLabels[];
  counts: Record<string, number>;
}

/**
 * 各 status（カンバン列）の先頭 perColumn 件だけを取得する（初期表示の転送量・描画コストを抑制）。
 * window 関数で列ごとに番号付けし、上位のみ抽出。あわせて列ごとの総件数を返し、
 * クライアントの「もっと見る」表示判定に使う。
 */
export async function getColumnsInitial(
  perColumn: number,
): Promise<ColumnsInitial> {
  const rows = (await sql`
    SELECT * FROM (
      SELECT t.*, row_number() OVER (PARTITION BY status ORDER BY created_at DESC, id DESC) AS rn
      FROM tasks t
    ) s
    WHERE rn <= ${perColumn}
  `) as any[];
  const countRows =
    (await sql`SELECT status, count(*)::int AS c FROM tasks GROUP BY status`) as any[];
  const counts: Record<string, number> = {};
  countRows.forEach((r) => {
    counts[r.status] = r.c;
  });
  return { tasks: await attachLabels(rows), counts };
}

/** 単一 status の追加ページを取得（「もっと見る」用）。 */
export async function getColumnPage(
  status: string,
  offset: number,
  limit: number,
): Promise<TaskWithLabels[]> {
  const rows = (await sql`
    SELECT * FROM tasks
    WHERE status = ${status}
    ORDER BY created_at DESC, id DESC
    OFFSET ${offset} LIMIT ${limit}
  `) as any[];
  return attachLabels(rows);
}

/**
 * タスクのラベルを与えられた集合に置き換える（最大4件）。
 * 1 ステートメントの複数行 INSERT（unnest）でラウンドトリップを 1 回に抑える。
 */
export async function setTaskLabels(
  taskId: number,
  labelIds: number[],
): Promise<void> {
  const ids = labelIds.slice(0, 4).filter((n) => Number.isInteger(n));
  await sql`DELETE FROM task_labels WHERE task_id = ${taskId}`;
  if (ids.length === 0) return;
  await sql`
    INSERT INTO task_labels (task_id, label_id)
    SELECT ${taskId}, x FROM unnest(${ids}::int[]) AS x
    ON CONFLICT DO NOTHING
  `;
}
