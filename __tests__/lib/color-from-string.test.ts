// __tests__/lib/color-from-string.test.ts
import { colorFromString } from "@/lib/color";

describe("colorFromString", () => {
  it("is deterministic — same input always returns same color", () => {
    expect(colorFromString("alice@example.com")).toBe(
      colorFromString("alice@example.com"),
    );
    expect(colorFromString("bob@example.com")).toBe(
      colorFromString("bob@example.com"),
    );
    expect(colorFromString("test")).toBe(colorFromString("test"));
  });

  it("returns different colors for different inputs", () => {
    const a = colorFromString("alice@example.com");
    const b = colorFromString("bob@example.com");
    const c = colorFromString("carol@example.com");
    // 3件すべてが同じになる確率は極めて低い（AVATAR_COLORSは8色）
    expect([a, b, c].every((v) => v === a)).toBe(false);
  });

  it("returns a fallback color for null", () => {
    const result = colorFromString(null);
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("returns a fallback color for undefined", () => {
    const result = colorFromString(undefined);
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("null and undefined return the same color (both map to empty string)", () => {
    expect(colorFromString(null)).toBe(colorFromString(undefined));
  });

  it("returns a #RRGGBB formatted string", () => {
    const cases = [
      "alice@example.com",
      "bob@example.com",
      "short",
      "",
      "あいうえお",
    ];
    for (const input of cases) {
      expect(colorFromString(input)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
