// __tests__/lib/users.test.ts
// SETTINGS_JSON 環境変数を使ってモックデータでテスト（settei.json 不要）
const MOCK_SETTINGS = {
  slack: { webhook_url: "https://hooks.slack.com/test", channel: "#test" },
  users: [
    { name: "Test Admin", email: "admin@example.com", password: "hash1" },
    { name: "Test Member", email: "member@example.com", password: "hash2" },
    { name: "Test User3", email: "test3@example.com", password: "hash3" },
  ],
};

describe("users (with SETTINGS_JSON mock)", () => {
  const ORIG = process.env.SETTINGS_JSON;

  beforeAll(() => {
    process.env.SETTINGS_JSON = JSON.stringify(MOCK_SETTINGS);
    jest.resetModules();
  });

  afterAll(() => {
    if (ORIG === undefined) delete process.env.SETTINGS_JSON;
    else process.env.SETTINGS_JSON = ORIG;
    jest.resetModules();
  });

  it("getSettings returns object with users array", () => {
    const { getSettings } = require("@/lib/users");
    const settings = getSettings();
    expect(Array.isArray(settings.users)).toBe(true);
    expect(settings.users.length).toBe(3);
  });

  it("findUserByEmail returns user for valid email", () => {
    const { findUserByEmail } = require("@/lib/users");
    const user = findUserByEmail("admin@example.com");
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Test Admin");
  });

  it("findUserByEmail returns null for invalid email", () => {
    const { findUserByEmail } = require("@/lib/users");
    const user = findUserByEmail("nobody@example.com");
    expect(user).toBeNull();
  });

  it("getAllUsers returns array of users without passwords", () => {
    const { getAllUsers } = require("@/lib/users");
    const users = getAllUsers();
    expect(users.length).toBe(3);
    users.forEach((u: any) => {
      expect(u).not.toHaveProperty("password");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("email");
    });
  });
});
