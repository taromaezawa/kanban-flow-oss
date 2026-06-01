// lib/auth.ts
import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { sql } from '@/db/database'

export async function createSession(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await sql`
    INSERT INTO sessions (token, email, expires_at)
    VALUES (${token}, ${email}, ${expiresAt})
  `
  return token
}

export async function getSession(token: string): Promise<string | null> {
  const rows = (await sql`
    SELECT email, expires_at FROM sessions WHERE token = ${token}
  `) as { email: string; expires_at: string }[]
  const row = rows[0]
  if (!row) return null
  if (new Date(row.expires_at) < new Date()) return null
  return row.email
}

export async function deleteSession(token: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE token = ${token}`
}

/** 期限切れセッションを物理削除する（テーブル肥大の抑制）。ログイン時に best-effort で呼ぶ。 */
export async function deleteExpiredSessions(): Promise<void> {
  await sql`DELETE FROM sessions WHERE expires_at < now()`
}

/** Cookie からセッションを検証し、認証済みユーザーの email を返す（未認証なら null）。 */
export async function requireAuth(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return getSession(token)
}
