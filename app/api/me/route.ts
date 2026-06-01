// app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { findUserByEmail } from '@/lib/users'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = await getSession(token)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = findUserByEmail(email)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ name: user.name, email: user.email })
}
