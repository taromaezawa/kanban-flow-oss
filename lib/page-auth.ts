// lib/page-auth.ts
// Server Component 用の認証ガード。未認証なら /login へリダイレクトし、
// 認証済みなら User を返す。各ページで重複していた cookie→getSession→redirect を集約。
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { findUserByEmail, type User } from '@/lib/users'

export async function requireUser(): Promise<User> {
  const token = cookies().get('session')?.value
  if (!token) redirect('/login')

  const email = await getSession(token)
  if (!email) redirect('/login')

  const user = findUserByEmail(email)
  if (!user) redirect('/login')

  return user
}
