// __tests__/slack.test.ts
import { buildSlackBlocks } from "@/lib/slack";

describe("buildSlackBlocks", () => {
  const task = {
    id: 42,
    title: "テスト <タスク> & 確認",
    start_date: "2025-01-01",
    end_date: "2025-01-31",
    assignee: "creator@example.com",
  };

  it("カードURL・期間・担当(メンション)・作成者を含む Block Kit を返す", () => {
    const payload = buildSlackBlocks(
      task as any,
      "<@U123>",
      "Alice",
      "https://example.com",
    );
    const text = payload.blocks[0].text.text;
    expect(text).toContain("https://example.com/tasks/42");
    expect(text).toContain("#0042");
    expect(text).toContain("テスト &lt;タスク&gt; &amp; 確認"); // エスケープ
    expect(text).toContain("担当: <@U123>");
    expect(text).toContain("作成者: Alice");
  });

  it("start/end 両方あるとき期間は「開始 〜 終了」になる", () => {
    const payload = buildSlackBlocks(
      task as any,
      "Bob",
      "Alice",
      "https://example.com",
    );
    expect(payload.blocks[0].text.text).toContain("2025-01-01 〜 2025-01-31");
  });

  it("end_date のみのときは期間が end_date 単独になる", () => {
    const t = { ...task, start_date: null };
    const payload = buildSlackBlocks(
      t as any,
      "Bob",
      "Alice",
      "https://example.com",
    );
    expect(payload.blocks[0].text.text).toContain("作業期間: 2025-01-31");
  });

  it("mention が空文字なら「未設定」と表示する", () => {
    const payload = buildSlackBlocks(
      task as any,
      "",
      "Alice",
      "https://example.com",
    );
    expect(payload.blocks[0].text.text).toContain("担当: 未設定");
  });
});
