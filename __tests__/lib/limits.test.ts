// __tests__/lib/limits.test.ts
import { tooLong, LIMITS } from "@/lib/limits";

describe("tooLong", () => {
  it("returns false when string length equals max", () => {
    expect(tooLong("a".repeat(10), 10)).toBe(false);
  });

  it("returns false when string length is below max", () => {
    expect(tooLong("hello", 10)).toBe(false);
    expect(tooLong("", 10)).toBe(false);
  });

  it("returns true when string length exceeds max", () => {
    expect(tooLong("a".repeat(11), 10)).toBe(true);
    expect(tooLong("a".repeat(201), 200)).toBe(true);
  });

  it("returns false for null", () => {
    expect(tooLong(null, 10)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(tooLong(undefined, 10)).toBe(false);
  });

  it("returns false for number", () => {
    expect(tooLong(12345, 3)).toBe(false);
  });

  it("returns false for array", () => {
    expect(tooLong(["a", "b", "c", "d"], 2)).toBe(false);
  });

  it("returns false for object", () => {
    expect(tooLong({ length: 999 }, 1)).toBe(false);
  });
});

describe("LIMITS constants", () => {
  it("LIMITS.title is 200", () => {
    expect(LIMITS.title).toBe(200);
  });

  it("LIMITS.description is 5000", () => {
    expect(LIMITS.description).toBe(5000);
  });

  it("LIMITS.comment is 5000", () => {
    expect(LIMITS.comment).toBe(5000);
  });

  it("LIMITS.labelName is 40", () => {
    expect(LIMITS.labelName).toBe(40);
  });
});
