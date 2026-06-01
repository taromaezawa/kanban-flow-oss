// app/tasks/[id]/TaskDetail.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { COLUMN_ORDER } from '@/lib/columns'
import { safeHttpUrl } from '@/lib/url'
import { getContrastColor } from '@/lib/color'
import { useToast } from '@/app/components/Toast'

interface Label { id: number; name: string; color: string }
interface Comment { id: number; author: string; content: string; created_at: string }
interface Task {
  id: number; title: string; description: string; status: string
  assignee: string | null; start_date: string | null; end_date: string | null
  slack_url: string; slack_channel_id: string | null; creator: string; created_at: string
  labels: Label[]; comments: Comment[]
}
interface User { name: string; email: string }

// 日時を決定的に整形（SSR/CSRで同一になるよう Date/Intl のタイムゾーン変換を避ける）。
// Neon の timestamptz は "YYYY-MM-DD HH:MM:SS+00" 形式の文字列で返る。
function formatDateTime(v: string): string {
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}` : s.slice(0, 16)
}

export default function TaskDetail({
  initialTask,
  allLabels,
  users,
  currentUser,
  onClose,
  onDeleted,
  onSaved,
}: {
  initialTask: Task
  allLabels: Label[]
  users: User[]
  currentUser: User
  onClose?: () => void
  onDeleted?: (id: number) => void
  onSaved?: (task: any) => void
}) {
  const router = useRouter()
  const [task, setTask] = useState<Task>(initialTask)
  const [comments, setComments] = useState<Comment[]>(initialTask.comments)
  const [newComment, setNewComment] = useState('')
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [showNewLabelForm, setShowNewLabelForm] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#6B7280')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [addingLabel, setAddingLabel] = useState(false)
  const [localAllLabels, setLocalAllLabels] = useState<Label[]>(allLabels)
  // Slack チャンネル選択
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([])
  const [channelName, setChannelName] = useState('')
  const { toast, notify } = useToast()
  const pickerRef = useRef<HTMLDivElement>(null)

  const taskId = `#${String(task.id).padStart(4, '0')}`
  const slackHref = safeHttpUrl(task.slack_url)
  const canDelete = currentUser.email === task.creator

  // Slack チャンネル一覧をマウント時に取得（トークン未設定・失敗時は空配列で degrade）
  useEffect(() => {
    let aborted = false
    fetch('/api/slack/channels')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; name: string }[]) => {
        if (aborted) return
        setChannels(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
    return () => { aborted = true }
  }, [])

  // チャンネル一覧が揃ったら現在の slack_channel_id から表示名を設定
  useEffect(() => {
    if (task.slack_channel_id && channels.length > 0) {
      const ch = channels.find(c => c.id === task.slack_channel_id)
      if (ch) setChannelName(ch.name)
    }
  }, [channels, task.slack_channel_id])

  // ラベルピッカーは外側クリック / ESC で閉じる
  useEffect(() => {
    if (!showLabelPicker) return
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowLabelPicker(false)
        setShowNewLabelForm(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLabelPicker(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [showLabelPicker])

  function userName(email: string | null): string {
    if (!email) return '未設定'
    return users.find(u => u.email === email)?.name ?? email
  }

  async function updateField(fields: Partial<Task>): Promise<boolean> {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error(String(res.status))
      const updated = await res.json()
      setTask(prev => ({ ...prev, ...updated }))
      onSaved?.({ ...task, ...updated })
      notify('保存しました')
      return true
    } catch {
      notify('保存に失敗しました', 'error')
      return false
    }
  }

  async function handleStatusChange(status: string) {
    await updateField({ status })
  }

  async function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (e.target.value !== task.title) await updateField({ title: e.target.value })
  }

  async function handleDescriptionBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    if (e.target.value !== task.description) await updateField({ description: e.target.value })
  }

  function handleChannelChange(name: string) {
    setChannelName(name)
    const ch = channels.find(c => c.name === name.trim())
    if (ch) updateField({ slack_channel_id: ch.id } as any)
    else if (name.trim() === '') updateField({ slack_channel_id: null } as any)
  }

  async function handleLabelToggle(label: Label) {
    const has = task.labels.some(l => l.id === label.id)
    let newLabels: Label[]
    if (has) {
      newLabels = task.labels.filter(l => l.id !== label.id)
    } else {
      if (task.labels.length >= 4) { notify('ラベルは最大4件までです', 'error'); return }
      newLabels = [...task.labels, label]
    }
    const prevLabels = task.labels
    setTask(prev => ({ ...prev, labels: newLabels }))
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_ids: newLabels.map(l => l.id) }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setTask(prev => ({ ...prev, labels: prevLabels }))
      notify('ラベルを保存できませんでした', 'error')
    }
  }

  async function handleAddLabel(e: React.FormEvent) {
    e.preventDefault()
    setAddingLabel(true)
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName, color: newLabelColor }),
      })
      if (res.ok) {
        const newLabel = await res.json()
        setLocalAllLabels(prev => [...prev, newLabel])
        setNewLabelName('')
        setShowNewLabelForm(false)
        // モーダルでない場合はページキャッシュを更新
        if (!onClose) router.refresh()
      } else {
        const msg = res.status === 409 ? 'そのラベル名は既に存在します' : 'ラベルを作成できませんでした'
        notify(msg, 'error')
      }
    } catch {
      notify('通信に失敗しました', 'error')
    } finally {
      setAddingLabel(false)
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [...prev, comment])
        setNewComment('')
      } else {
        notify('コメントを投稿できませんでした', 'error')
      }
    } catch {
      notify('通信に失敗しました', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleDelete() {
    if (!confirm('このタスクを削除しますか？')) return
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (res.ok) {
        if (onDeleted) {
          onDeleted(task.id)
        } else {
          router.push('/board')
        }
      } else {
        notify(res.status === 403 ? '削除権限がありません（作成者のみ）' : '削除に失敗しました', 'error')
      }
    } catch {
      notify('通信に失敗しました', 'error')
    }
  }

  function handleClose() {
    if (onClose) onClose()
    else router.push('/board')
  }

  const content = (
    <div className={onClose ? 'p-6 overflow-y-auto max-h-[85vh]' : 'p-6'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-mono text-gray-500">{taskId} {userName(task.assignee)}</span>
        <div className="flex items-center gap-2">
          <select
            value={task.status}
            onChange={e => handleStatusChange(e.target.value)}
            className="text-sm border rounded px-2 py-1 focus:outline-none"
          >
            {COLUMN_ORDER.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {slackHref && (
            <a href={slackHref} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-700 text-sm">
              Slack
            </a>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label={onClose ? 'モーダルを閉じる' : 'ボードに戻る'}
            title={onClose ? '閉じる' : 'ボードに戻る'}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        defaultValue={task.title}
        onBlur={handleTitleBlur}
        className="w-full text-xl font-bold text-gray-800 border-b border-transparent focus:border-blue-400 focus:outline-none pb-1 mb-4"
      />

      {/* Slack チャンネル */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 shrink-0">
            <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
          </span>
          <input
            type="text"
            list="detail-slack-channels"
            value={channelName}
            onChange={e => setChannelName(e.target.value)}
            onBlur={e => handleChannelChange(e.target.value)}
            placeholder={channels.length ? 'Slackチャンネル（任意・検索可）' : 'Slackチャンネル（取得中...）'}
            disabled={channels.length === 0}
            className="flex-1 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <datalist id="detail-slack-channels">
            {channels.map(c => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Period */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm text-gray-500">📅</span>
        <input
          type="date"
          defaultValue={task.start_date ?? ''}
          onBlur={e => updateField({ start_date: e.target.value || null } as any)}
          className="text-sm border rounded px-2 py-1 focus:outline-none"
        />
        <span className="text-gray-400">〜</span>
        <input
          type="date"
          defaultValue={task.end_date ?? ''}
          onBlur={e => updateField({ end_date: e.target.value || null } as any)}
          className="text-sm border rounded px-2 py-1 focus:outline-none"
        />
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-500">👤</span>
        <select
          value={task.assignee ?? ''}
          onChange={e => updateField({ assignee: e.target.value || null } as any)}
          className="text-sm border rounded px-2 py-1 focus:outline-none"
        >
          <option value="">未設定</option>
          {users.map(u => (
            <option key={u.email} value={u.email}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Labels */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm text-gray-500">🔖 ラベル</span>
          {task.labels.length < 4 && (
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className="text-xs text-blue-500 hover:text-blue-700 ml-2"
            >
              + 追加
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span
              key={l.id}
              className="text-xs px-2 py-0.5 rounded inline-flex items-center gap-1"
              style={{ backgroundColor: l.color, color: getContrastColor(l.color) }}
            >
              {l.name}
              <button
                type="button"
                onClick={() => handleLabelToggle(l)}
                aria-label={`ラベル「${l.name}」を削除`}
                className="leading-none font-bold hover:opacity-70"
                style={{ color: getContrastColor(l.color) }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {showLabelPicker && (
          <div ref={pickerRef} className="mt-2 border rounded p-3 bg-gray-50">
            <div className="flex flex-wrap gap-1 mb-2">
              {localAllLabels.map(l => {
                const selected = task.labels.some(tl => tl.id === l.id)
                return (
                  <span
                    key={l.id}
                    onClick={() => handleLabelToggle(l)}
                    className={`text-xs px-2 py-0.5 rounded cursor-pointer border-2 ${selected ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: l.color, color: getContrastColor(l.color) }}
                  >
                    {l.name}
                  </span>
                )
              })}
            </div>
            {!showNewLabelForm ? (
              <button
                onClick={() => setShowNewLabelForm(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                + 新規ラベル追加
              </button>
            ) : (
              <form onSubmit={handleAddLabel} className="flex items-center gap-2">
                <input
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                  placeholder="ラベル名"
                  required
                  className="text-xs border rounded px-2 py-1 flex-1"
                />
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={e => setNewLabelColor(e.target.value)}
                  className="w-8 h-7 border rounded cursor-pointer"
                />
                <button type="submit" disabled={addingLabel} className="text-xs bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50">
                  {addingLabel ? '追加中...' : '追加'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">≡ 説明</div>
        <textarea
          defaultValue={task.description}
          onBlur={handleDescriptionBlur}
          rows={4}
          placeholder="説明を入力..."
          className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
        />
      </div>

      {/* Comments */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">コメント</div>
        <div className="space-y-3 mb-3">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400">まだコメントはありません</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-700">{userName(c.author)}</span>
                <span className="text-xs text-gray-400">{formatDateTime(c.created_at)}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleCommentSubmit} className="border rounded p-3">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            rows={2}
            placeholder="コメントを入力..."
            className="w-full text-sm focus:outline-none resize-none mb-2"
          />
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || submittingComment}
              className="text-sm bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingComment ? '送信中...' : 'コメント'}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
        <span>作成: {userName(task.creator)} / {formatDateTime(task.created_at)}</span>
        <div className="flex items-center gap-3">
          {canDelete && (
            <button onClick={handleDelete} className="text-red-400 hover:text-red-600">
              削除
            </button>
          )}
          <button
            onClick={handleClose}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700"
          >
            登録
          </button>
        </div>
      </div>
      {toast}
    </div>
  )

  if (onClose) return content

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow">
        {content}
      </div>
    </div>
  )
}
