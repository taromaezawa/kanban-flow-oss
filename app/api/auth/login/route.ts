// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findUserByEmail } from '@/lib/users'
import { createSession, deleteExpiredSessions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
  }

  const user = findUserByEmail(email)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 })
  }

  const token = await createSession(email)
  // 期限切れセッションを掃除（best-effort、失敗してもログインは継続）
  deleteExpiredSessions().catch(() => {})
  const res = NextResponse.json({ ok: true, name: user.name, email: user.email })
  res.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
