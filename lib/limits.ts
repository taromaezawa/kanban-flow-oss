// lib/limits.ts
// 入力長の上限（サーバー側で検証し、DB肥大・UI破壊・DoS的な巨大ペイロードを防ぐ）。

export const LIMITS = {
  title: 200,
  description: 5000,
  comment: 5000,
  labelName: 40,
} as const

/** 文字列が上限を超えていれば true（文字列以外は false 扱い＝別途必須チェックに委ねる）。 */
export function tooLong(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.length > max
}
