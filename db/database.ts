// db/database.ts
// Neon serverless ドライバの SQL クライアント。
// スキーマ (db/schema.sql) は Neon コンソールで手動実行する前提のため、
// ここでは初期化は行わず sql クライアントを export するだけ。
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// 環境変数のコピペ起因で前後に空白/タブが混入すると neon() が URL を解析できず
// ビルド時に throw する（Vercel で実際に発生）。防御的に trim する。
// DATABASE_URL が未設定の場合（テスト環境など）は遅延エラーになるよう proxy を返す。
function createSql(): NeonQueryFunction<false, false> {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) {
    // DATABASE_URL が未設定のときはクエリ実行時にエラーにする（import 時ではなく）
    const handler: NeonQueryFunction<false, false> = (() => {
      throw new Error("DATABASE_URL is not set");
    }) as unknown as NeonQueryFunction<false, false>;
    return new Proxy(handler, {
      apply() {
        throw new Error("DATABASE_URL is not set");
      },
    });
  }
  return neon(url);
}

export const sql = createSql();
