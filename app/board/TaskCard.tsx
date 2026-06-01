// app/board/TaskCard.tsx
import { safeHttpUrl } from '@/lib/url'
import { getContrastColor, colorFromString } from '@/lib/color'

interface Label {
  id: number
  name: string
  color: string
}

interface Task {
  id: number
  title: string
  assignee: string | null
  start_date: string | null
  end_date: string | null
  slack_url: string | null
  labels: Label[]
}

interface Props {
  task: Task
  assigneeName: string
  today?: string | null
  done?: boolean
}

type DueState = 'overdue' | 'soon' | 'none'

function dueState(end: string | null, today: string | null | undefined, done: boolean): DueState {
  if (!end || !today || done) return 'none'
  if (end < today) return 'overdue'
  const soon = new Date(today + 'T00:00:00Z')
  soon.setUTCDate(soon.getUTCDate() + 3)
  const soonStr = soon.toISOString().slice(0, 10)
  if (end <= soonStr) return 'soon'
  return 'none'
}

function formatPeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  const s = start ? start.replace(/-/g, '/') : ''
  const e = end ? end.replace(/-/g, '/') : ''
  if (s && e) return `${s} 〜 ${e}`
  if (e) return `〜 ${e}`
  return `${s} 〜`
}

function getInitial(name: string): string {
  return name.slice(0, 1)
}

export default function TaskCard({ task, assigneeName, today, done }: Props) {
  const period = formatPeriod(task.start_date, task.end_date)
  const taskId = `#${String(task.id).padStart(4, '0')}`
  const slackHref = safeHttpUrl(task.slack_url)
  const due = dueState(task.end_date, today, !!done)
  const periodClass = due === 'overdue' ? 'text-red-600 font-semibold' : due === 'soon' ? 'text-amber-600 font-medium' : 'text-gray-500'
  const avatarColor = colorFromString(task.assignee)

  return (
    <div className="bg-white rounded shadow-sm p-3 mb-2 hover:shadow-md transition-shadow border border-gray-200 select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{taskId}</span>
        <div className="flex items-center gap-1">
          {slackHref && (
            <a
              href={slackHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-purple-500 hover:text-purple-700 relative z-[1]"
              title="Slackスレッド"
              aria-label="Slackスレッドを開く"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
            </a>
          )}
          {task.assignee && (
            <div
              className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ backgroundColor: avatarColor, color: getContrastColor(avatarColor) }}
              title={assigneeName}
            >
              {getInitial(assigneeName)}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">{task.title}</p>
      {period && (
        <p className={`text-xs mb-1 ${periodClass}`}>
          {period}
          {due === 'overdue' && <span className="ml-1 px-1 rounded bg-red-100 text-red-700">期限切れ</span>}
          {due === 'soon' && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-700">間近</span>}
        </p>
      )}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span
              key={l.id}
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: l.color, color: getContrastColor(l.color) }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
