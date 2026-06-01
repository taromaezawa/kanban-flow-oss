// app/api/tasks/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/db/database'
import { requireAuth } from '@/lib/auth'
import { LIMITS, tooLong } from '@/lib/limits'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const comments = await sql`
    SELECT * FROM comments WHERE task_id = ${id} ORDER BY created_at ASC
  `
  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'コメントは必須です' }, { status: 400 })
  if (tooLong(content, LIMITS.comment)) {
    return NextResponse.json({ error: `コメントは${LIMITS.comment}文字以内です` }, { status: 400 })
  }

  const task = (await sql`SELECT id FROM tasks WHERE id = ${id}`) as any[]
  if (!task[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const inserted = (await sql`
    INSERT INTO comments (task_id, author, content)
    VALUES (${id}, ${email}, ${content})
    RETURNING *
  `) as any[]
  return NextResponse.json(inserted[0], { status: 201 })
}
