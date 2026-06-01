// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/db/database'
import { requireAuth } from '@/lib/auth'
import { findUserByEmail } from '@/lib/users'
import { postTaskToChannel } from '@/lib/slack'
import { getTasksWithLabels, getColumnPage, setTaskLabels } from '@/db/queries'
import { isAllowedSlackUrl } from '@/lib/url'
import { VALID_ASSIGNEES, VALID_STATUSES } from '@/lib/columns'
import { LIMITS, tooLong } from '@/lib/limits'

export async function GET(req: NextRequest) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ?status=<列> 指定時は、その列の offset/limit ページを返す（「もっと見る」用）。
  // 無指定時は全件（後方互換）。
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  if (status) {
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'status が不正です' }, { status: 400 })
    }
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    return NextResponse.json(await getColumnPage(status, offset, limit))
  }

  return NextResponse.json(await getTasksWithLabels())
}

export async function POST(req: NextRequest) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, assignee, start_date, end_date, slack_url, label_ids, slack_channel_id } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  }
  if (tooLong(title, LIMITS.title)) {
    return NextResponse.json({ error: `タイトルは${LIMITS.title}文字以内です` }, { status: 400 })
  }
  if (tooLong(description, LIMITS.description)) {
    return NextResponse.json({ error: `説明は${LIMITS.description}文字以内です` }, { status: 400 })
  }
  if (!isAllowedSlackUrl(slack_url)) {
    return NextResponse.json({ error: 'Slack URL は http(s) のみ指定できます' }, { status: 400 })
  }
  if (
    slack_channel_id != null &&
    slack_channel_id !== '' &&
    !/^[A-Z0-9]+$/.test(slack_channel_id)
  ) {
    return NextResponse.json({ error: 'slack_channel_id が不正です' }, { status: 400 })
  }
  if (assignee != null && assignee !== '' && !VALID_ASSIGNEES.has(assignee)) {
    return NextResponse.json({ error: '担当者が不正です' }, { status: 400 })
  }

  const inserted = (await sql`
    INSERT INTO tasks (title, description, assignee, start_date, end_date, slack_url, status, creator)
    VALUES (
      ${title},
      ${description ?? ''},
      ${assignee || null},
      ${start_date ?? null},
      ${end_date ?? null},
      ${slack_url ?? ''},
      '作業一覧',
      ${email}
    )
    RETURNING *
  `) as any[]
  const task = inserted[0]

  if (Array.isArray(label_ids) && label_ids.length > 0) {
    await setTaskLabels(task.id, label_ids)
  }

  const creator = findUserByEmail(email)

  // Slack 投稿（任意）。チャンネル未選択なら何もしない。
  // 失敗してもタスク作成は成功扱いとし、レスポンスに slack_error を載せて UI で警告する。
  if (slack_channel_id) {
    try {
      const { ts, permalink } = await postTaskToChannel(
        task,
        slack_channel_id,
        creator?.name ?? email
      )
      const updated = (await sql`
        UPDATE tasks
        SET slack_channel_id = ${slack_channel_id},
            slack_message_ts = ${ts},
            slack_url        = ${permalink}
        WHERE id = ${task.id}
        RETURNING *
      `) as any[]
      return NextResponse.json({ ...updated[0], labels: [] }, { status: 201 })
    } catch (e) {
      console.error('postTaskToChannel failed', e)
      const reason =
        e instanceof Error && /not_in_channel/.test(e.message)
          ? 'Botをチャンネルに招待してください'
          : 'Slack 投稿に失敗しました'
      return NextResponse.json({ ...task, labels: [], slack_error: reason }, { status: 201 })
    }
  }

  return NextResponse.json({ ...task, labels: [] }, { status: 201 })
}
