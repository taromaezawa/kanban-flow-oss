// lib/slack.ts
import { getSettings } from '@/lib/users'

const SLACK_API = 'https://slack.com/api'

export interface TaskForSlack {
  id: number
  title: string
  start_date: string | null
  end_date: string | null
  assignee: string | null
}

export interface SlackChannel {
  id: string
  name: string
}

/** Slack mrkdwn のメタ文字をエスケープ（リンク/マークアップ偽装を防ぐ）。 */
function escapeMrkdwn(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function botToken(): string | null {
  const t = process.env.SLACK_BOT_TOKEN
  return t && t.trim() ? t : null
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

/** GET 形式の Slack Web API 呼び出し（クエリは x-www-form-urlencoded）。 */
async function slackGet(method: string, params: Record<string, string>, token: string): Promise<any> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${SLACK_API}/${method}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`slack ${method} failed: ${json.error}`)
  return json
}

/** POST(JSON) 形式の Slack Web API 呼び出し。 */
async function slackPost(method: string, body: Record<string, unknown>, token: string): Promise<any> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`slack ${method} failed: ${json.error}`)
  return json
}

/**
 * タスク作成通知の Block Kit を組み立てる純関数。
 * mention は呼び出し側で解決済みの `<@U…>` か氏名のどちらか（空なら「未設定」）。
 */
export function buildSlackBlocks(
  task: TaskForSlack,
  mention: string,
  creatorName: string,
  baseUrlArg: string
) {
  const taskUrl = `${baseUrlArg}/tasks/${task.id}`
  const period =
    task.start_date && task.end_date
      ? `${task.start_date} 〜 ${task.end_date}`
      : task.end_date ?? '期限未設定'
  const taskId = `#${String(task.id).padStart(4, '0')}`
  const title = escapeMrkdwn(task.title)
  // mention は解決済みの `<@U…>`（メンション構文）かもしれないためエスケープしない。
  const who = mention && mention.trim() ? mention : '未設定'
  const creator = escapeMrkdwn(creatorName)
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📌 *新しいタスクが作成されました*\n*<${taskUrl}|${taskId} ${title}>*\n担当: ${who}\n作業期間: ${period}\n作成者: ${creator}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'タスクを開く 🔗' },
            url: taskUrl,
            style: 'primary',
          },
        ],
      },
    ],
  }
}

/**
 * Bot が参加中の公開チャンネルを返す（投稿可能なものだけ＝is_member）。
 * トークン未設定なら空配列で degrade。private も対象にするなら types に groups を足し scope を付与。
 */
export async function listChannels(): Promise<SlackChannel[]> {
  const token = botToken()
  if (!token) return []
  const out: SlackChannel[] = []
  let cursor = ''
  do {
    const params: Record<string, string> = {
      types: 'public_channel',
      exclude_archived: 'true',
      limit: '200',
    }
    if (cursor) params.cursor = cursor
    const json = await slackGet('conversations.list', params, token)
    for (const c of json.channels ?? []) {
      if (c.is_member && !c.is_archived) out.push({ id: c.id, name: c.name })
    }
    cursor = json.response_metadata?.next_cursor ?? ''
  } while (cursor)
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

/** メール→Slackユーザ ID。失敗/未登録は null。 */
export async function lookupUserIdByEmail(email: string): Promise<string | null> {
  const token = botToken()
  if (!token) return null
  try {
    const json = await slackGet('users.lookupByEmail', { email }, token)
    return json.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * タスクをチャンネルへ投稿し、{ts, permalink} を返す。
 * 担当メールを Slack ID へ解決（失敗時は氏名にフォールバック）。エラーは throw（呼び出し側で握る）。
 */
export async function postTaskToChannel(
  task: TaskForSlack,
  channelId: string,
  creatorName: string
): Promise<{ ts: string; permalink: string }> {
  const token = botToken()
  if (!token) throw new Error('SLACK_BOT_TOKEN is not set')

  // メンション解決: メール→ID。だめなら settei.json の氏名、それも無ければメール。
  let mention = ''
  if (task.assignee) {
    const id = await lookupUserIdByEmail(task.assignee)
    if (id) {
      mention = `<@${id}>`
    } else {
      const user = getSettings().users.find(u => u.email === task.assignee)
      mention = user?.name ?? task.assignee
    }
  }

  const { blocks } = buildSlackBlocks(task, mention, creatorName, baseUrl())
  const posted = await slackPost(
    'chat.postMessage',
    { channel: channelId, blocks, text: `新しいタスク #${task.id} ${task.title}` },
    token
  )
  const ts: string = posted.ts
  const link = await slackGet('chat.getPermalink', { channel: channelId, message_ts: ts }, token)
  return { ts, permalink: link.permalink as string }
}
