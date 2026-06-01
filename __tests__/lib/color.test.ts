// __tests__/lib/color.test.ts
import { getContrastColor } from '@/lib/color'

describe('getContrastColor', () => {
  it('returns dark text on light backgrounds', () => {
    expect(getContrastColor('#F9E795')).toBe('#111111') // 薄い黄
    expect(getContrastColor('#FFFFFF')).toBe('#111111')
    expect(getContrastColor('#E7E8D1')).toBe('#111111')
  })

  it('returns white text on dark backgrounds', () => {
    expect(getContrastColor('#111827')).toBe('#FFFFFF')
    expect(getContrastColor('#6A1B9A')).toBe('#FFFFFF')
    expect(getContrastColor('#0E2A33')).toBe('#FFFFFF')
  })

  it('handles 3-digit hex and missing #', () => {
    expect(getContrastColor('fff')).toBe('#111111')
    expect(getContrastColor('000')).toBe('#FFFFFF')
  })

  it('falls back to dark text for invalid input', () => {
    expect(getContrastColor('')).toBe('#111111')
    expect(getContrastColor(null)).toBe('#111111')
    expect(getContrastColor('not-a-color')).toBe('#111111')
  })
})
