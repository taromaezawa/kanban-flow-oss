// app/api/labels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/db/database'
import { requireAuth } from '@/lib/auth'
import { LIMITS, tooLong } from '@/lib/limits'

export async function GET(req: NextRequest) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const labels = await sql`SELECT * FROM labels ORDER BY id ASC`
  return NextResponse.json(labels)
}

export async function POST(req: NextRequest) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ラベル名は必須です' }, { status: 400 })
  if (tooLong(name, LIMITS.labelName)) {
    return NextResponse.json({ error: `ラベル名は${LIMITS.labelName}文字以内です` }, { status: 400 })
  }

  try {
    const inserted = (await sql`
      INSERT INTO labels (name, color) VALUES (${name}, ${color ?? '#6B7280'})
      RETURNING *
    `) as any[]
    return NextResponse.json(inserted[0], { status: 201 })
  } catch {
    return NextResponse.json({ error: 'ラベル名が重複しています' }, { status: 409 })
  }
}
