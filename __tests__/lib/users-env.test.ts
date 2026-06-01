// __tests__/lib/users-env.test.ts
// getSettings は SETTINGS_JSON 環境変数を優先する（Vercel本番でsettei.jsonが無いため）。
describe("getSettings with SETTINGS_JSON", () => {
  const ORIG = process.env.SETTINGS_JSON;

  afterEach(() => {
    if (ORIG === undefined) delete process.env.SETTINGS_JSON;
    else process.env.SETTINGS_JSON = ORIG;
    jest.resetModules();
  });

  it("prefers SETTINGS_JSON env over the file", () => {
    process.env.SETTINGS_JSON = JSON.stringify({
      slack: { webhook_url: "", channel: "#x" },
      users: [{ name: "Env太郎", email: "env@example.com", password: "h" }],
    });
    jest.resetModules(); // モジュールキャッシュ(getSettingsのcached)をリセット
    const { getSettings, findUserByEmail } = require("@/lib/users");
    expect(getSettings().users).toHaveLength(1);
    expect(findUserByEmail("env@example.com")?.name).toBe("Env太郎");
  });

  it("falls back to settei.json when env is unset (or throws if file not found)", () => {
    delete process.env.SETTINGS_JSON;
    jest.resetModules();
    const { getSettings } = require("@/lib/users");
    // settei.json が存在しない場合はエラーになることを確認
    // settei.json が存在する場合は users 配列が返ることを確認
    try {
      const settings = getSettings();
      expect(Array.isArray(settings.users)).toBe(true);
    } catch (e: any) {
      // settei.json が存在しない場合は ENOENT エラーが発生することを確認
      expect(e.code).toBe("ENOENT");
    }
  });
});
