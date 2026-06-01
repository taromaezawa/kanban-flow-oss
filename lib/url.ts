// lib/url.ts

/**
 * http(s) スキームの URL のみ許可して返す。それ以外（javascript:, data: など）や
 * パース不能な値は null を返す。リンク描画前と保存前のサニタイズに使う。
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol === 'http:' || u.protocol === 'https:') return url
  } catch {
    // パース不能
  }
  return null
}

/** 入力値が安全な http(s) URL、または空文字のときに true。保存時のバリデーションに使う。 */
export function isAllowedSlackUrl(url: unknown): boolean {
  if (url === undefined || url === null || url === '') return true
  return typeof url === 'string' && safeHttpUrl(url) !== null
}
