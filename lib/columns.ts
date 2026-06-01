// lib/columns.ts
// カンバン列の定義（単一の真実源）。クライアント/サーバー双方から参照する。
// 並び順固定: 作業一覧 → 各担当者(email) → 完了リスト。
export const COLUMN_ORDER = [
  { id: "作業一覧", label: "作業一覧" },
  { id: "member1@example.com", label: "Member 1" },
  { id: "member2@example.com", label: "Member 2" },
  { id: "member3@example.com", label: "Member 3" },
  { id: "member4@example.com", label: "Member 4" },
  { id: "member5@example.com", label: "Member 5" },
  { id: "member6@example.com", label: "Member 6" },
  { id: "member7@example.com", label: "Member 7" },
  { id: "member8@example.com", label: "Member 8" },
  { id: "完了リスト", label: "完了リスト" },
] as const;

/** PUT で受理してよい status 値（カンバン列の id）。 */
export const VALID_STATUSES: Set<string> = new Set(
  COLUMN_ORDER.map((c) => c.id),
);

/** assignee に設定してよい email（= ユーザー列の id）。null は別途許可。 */
export const VALID_ASSIGNEES: Set<string> = new Set(
  COLUMN_ORDER.map((c) => c.id).filter((id) => id.includes("@")),
);

export const DONE_STATUS = "完了リスト";

/** カンバン各列の初期表示件数（これを超える分は「もっと見る」で追加ロード）。 */
export const PER_PAGE = 50;
