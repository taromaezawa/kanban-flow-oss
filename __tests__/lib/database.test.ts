// __tests__/lib/database.test.ts
// 結合テスト: 実 Neon DB へ接続する。db/schema.sql を Neon コンソールで実行済みであること。
import { sql } from "@/db/database";

const HAS_DB = !!process.env.DATABASE_URL;

const describeOrSkip = HAS_DB ? describe : describe.skip;

describeOrSkip("database (integration)", () => {
  it("seeded labels are present", async () => {
    const labels = (await sql`SELECT name FROM labels ORDER BY id ASC`) as {
      name: string;
    }[];
    const names = labels.map((l) => l.name);
    expect(names.length).toBeGreaterThanOrEqual(9);
    expect(names).toContain("作業中");
  });
});
