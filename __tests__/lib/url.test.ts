// __tests__/lib/url.test.ts
import { safeHttpUrl, isAllowedSlackUrl } from '@/lib/url'

describe('safeHttpUrl', () => {
  it('allows http and https', () => {
    expect(safeHttpUrl('https://slack.com/x')).toBe('https://slack.com/x')
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com')
  })

  it('rejects javascript: and data: schemes', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,<script>1</script>')).toBeNull()
    expect(safeHttpUrl('JavaScript:alert(1)')).toBeNull()
  })

  it('returns null for empty / unparseable', () => {
    expect(safeHttpUrl('')).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
    expect(safeHttpUrl('not a url')).toBeNull()
  })
})

describe('isAllowedSlackUrl', () => {
  it('treats empty/undefined as allowed (optional field)', () => {
    expect(isAllowedSlackUrl('')).toBe(true)
    expect(isAllowedSlackUrl(undefined)).toBe(true)
    expect(isAllowedSlackUrl(null)).toBe(true)
  })

  it('allows http(s) and rejects dangerous schemes', () => {
    expect(isAllowedSlackUrl('https://slack.com')).toBe(true)
    expect(isAllowedSlackUrl('javascript:alert(1)')).toBe(false)
  })
})
