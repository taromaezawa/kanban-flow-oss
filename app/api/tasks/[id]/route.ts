// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/db/database'
import { requireAuth } from '@/lib/auth'
import { setTaskLabels } from '@/db/queries'
import { isAllowedSlackUrl } from '@/lib/url'
import { VALID_STATUSES, VALID_ASSIGNEES, DONE_STATUS } from '@/lib/columns'
import { LIMITS, tooLong } from '@/lib/limits'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const taskRows = (await sql`SELECT * FROM tasks WHERE id = ${id}`) as any[]
  const task = taskRows[0]
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const labels = await sql`
    SELECT l.id, l.name, l.color
    FROM task_labels tl JOIN labels l ON l.id = tl.label_id
    WHERE tl.task_id = ${id}
  `
  const comments = await sql`
    SELECT * FROM comments WHERE task_id = ${id} ORDER BY created_at ASC
  `

  return NextResponse.json({ ...task, labels, comments })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const existing = (await sql`SELECT id FROM tasks WHERE id = ${id}`) as any[]
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // 値の検証（任意文字列によるボード破壊・XSS 経路を防ぐ）
  if ('status' in body && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'status が不正です' }, { status: 400 })
  }
  if ('assignee' in body && body.assignee != null && !VALID_ASSIGNEES.has(body.assignee)) {
    return NextResponse.json({ error: 'assignee が不正です' }, { status: 400 })
  }
  if ('slack_url' in body && !isAllowedSlackUrl(body.slack_url)) {
    return NextResponse.json({ error: 'Slack URL は http(s) のみ指定できます' }, { status: 400 })
  }
  if (
    'slack_channel_id' in body &&
    body.slack_channel_id != null &&
    body.slack_channel_id !== '' &&
    !/^[A-Z0-9]+$/.test(body.slack_channel_id)
  ) {
    return NextResponse.json({ error: 'slack_channel_id が不正です' }, { status: 400 })
  }
  if (tooLong(body.title, LIMITS.title)) {
    return NextResponse.json({ error: `タイトルは${LIMITS.title}文字以内です` }, { status: 400 })
  }
  if (tooLong(body.description, LIMITS.description)) {
    return NextResponse.json({ error: `説明は${LIMITS.description}文字以内です` }, { status: 400 })
  }

  const allowed = ['title', 'description', 'status', 'assignee', 'start_date', 'end_date', 'slack_url', 'slack_channel_id', 'done']
  const updates: string[] = []
  const values: any[] = []
  let i = 1

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = $${i++}`)
      values.push(key === 'assignee' ? body[key] || null : body[key])
    }
  }

  // status 変更時は done を自動同期（完了リスト → 1、それ以外 → 0）
  if ('status' in body && !('done' in body)) {
    updates.push(`done = $${i++}`)
    values.push(body.status === DONE_STATUS ? 1 : 0)
  }

  if (updates.length > 0) {
    updates.push('updated_at = now()')
    values.push(id)
    await sql(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${i}`, values)
  }

  if ('label_ids' in body && Array.isArray(body.label_ids)) {
    await setTaskLabels(id, body.label_ids)
  }

  const updated = (await sql`SELECT * FROM tasks WHERE id = ${id}`) as any[]
  return NextResponse.json(updated[0])
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const rows = (await sql`SELECT creator FROM tasks WHERE id = ${id}`) as any[]
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // 削除は作成者のみ（連番 ID による無差別削除を防止）
  if (rows[0].creator !== email) {
    return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })
  }

  await sql`DELETE FROM tasks WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
