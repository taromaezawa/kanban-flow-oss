// lib/color.ts

/**
 * 背景色(hex)に対して読みやすい文字色（黒 or 白）を返す。
 * ラベルは任意色を取りうるため、固定の白文字だと薄い色(黄など)で判読不能になる。
 * WCAG の相対輝度に近い簡易式で前景色を決める。
 */
export function getContrastColor(bgHex: string | null | undefined): string {
  const hex = (bgHex || '').replace('#', '')
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return '#111111'
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  // sRGB -> relative luminance
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  // 明るい背景 → 黒文字 / 暗い背景 → 白文字
  return L > 0.45 ? '#111111' : '#FFFFFF'
}

const AVATAR_COLORS = [
  '#0E8A8A', '#6A1B9A', '#B85042', '#1D4ED8',
  '#0F766E', '#9D174D', '#3F6212', '#7C3AED',
]

/** 文字列（email等）から決定的にアバター背景色を選ぶ。人ごとに色を変えて識別性を上げる。 */
export function colorFromString(s: string | null | undefined): string {
  const str = s || ''
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
