// app/board/KanbanBoard.tsx
'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import KanbanColumn from './KanbanColumn'
import TaskDetailModal from './TaskDetailModal'
import { COLUMN_ORDER } from '@/lib/columns'
import { useToast } from '@/app/components/Toast'

interface Label { id: number; name: string; color: string }
interface Task {
  id: number; title: string; assignee: string | null
  start_date: string | null; end_date: string | null
  slack_url: string | null; status: string; labels: Label[]
}
interface Comment { id: number; author: string; content: string; created_at: string }
interface DetailTask {
  id: number; title: string; description: string; status: string
  assignee: string | null; start_date: string | null; end_date: string | null
  slack_url: string; slack_channel_id: string | null; creator: string; created_at: string
  labels: Label[]; comments: Comment[]
}
interface User { name: string; email: string }
interface SlackChannelOption { id: string; name: string }

export default function KanbanBoard({
  initialTasks,
  initialCounts,
  perPage,
  users,
  currentUser,
  allLabels,
}: {
  initialTasks: Task[]
  initialCounts: Record<string, number>
  perPage: number
  users: User[]
  currentUser: User
  allLabels: Label[]
}) {
  // ─── 表示タスク管理 ───────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts)
  const [loadingCol, setLoadingCol] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [today, setToday] = useState<string | null>(null)

  // ─── タスク詳細モーダル ───────────────────────────────────────────
  const [detailTask, setDetailTask] = useState<DetailTask | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ─── 新規タスク作成モーダル ───────────────────────────────────────
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [channels, setChannels] = useState<SlackChannelOption[]>([])
  const [creating, setCreating] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const { toast, notify } = useToast()
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // 今日の日付はマウント後にのみ確定（SSR hydration 不整合を避ける）
  useEffect(() => {
    const d = new Date()
    setToday(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }, [])

  const closeModal = useCallback(() => {
    setShowNewTaskModal(false)
    addBtnRef.current?.focus()
  }, [])

  // 新規作成モーダル ESC
  useEffect(() => {
    if (!showNewTaskModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showNewTaskModal, closeModal])

  // 新規作成モーダルを開いた時に Slack チャンネル一覧を取得
  useEffect(() => {
    if (!showNewTaskModal) return
    let aborted = false
    fetch('/api/slack/channels')
      .then(res => (res.ok ? res.json() : []))
      .then((data: SlackChannelOption[]) => { if (!aborted) setChannels(Array.isArray(data) ? data : []) })
      .catch(() => { if (!aborted) setChannels([]) })
    return () => { aborted = true }
  }, [showNewTaskModal])

  // ─── タスク一覧の列別マップ ───────────────────────────────────────
  const colMap = useCallback(() => {
    const q = query.trim().toLowerCase()
    const map: Record<string, Task[]> = {}
    COLUMN_ORDER.forEach(c => { map[c.id] = [] })
    tasks.forEach(t => {
      if (q && !t.title.toLowerCase().includes(q)) return
      if (map[t.status]) map[t.status].push(t)
      else map['作業一覧'].push(t)
    })
    return map
  }, [tasks, query])

  // ─── タスク詳細モーダル ───────────────────────────────────────────
  async function openTaskDetail(id: number) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/tasks/${id}`)
      if (!res.ok) throw new Error()
      setDetailTask(await res.json())
    } catch {
      notify('タスクの読み込みに失敗しました', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeTaskDetail() { setDetailTask(null) }

  function handleTaskSaved(updated: any) {
    setDetailTask(prev => prev ? { ...prev, ...updated } : prev)
    setTasks(prev => prev.map(t => {
      if (t.id !== updated.id) return t
      if (t.status !== (updated.status ?? t.status)) {
        const from = t.status
        const to = updated.status
        setCounts(c => ({
          ...c,
          [from]: Math.max(0, (c[from] ?? 0) - 1),
          [to]: (c[to] ?? 0) + 1,
        }))
      }
      return { ...t, ...updated }
    }))
  }

  function handleTaskDeleted(id: number) {
    if (detailTask) {
      setTasks(prev => prev.filter(t => t.id !== id))
      setCounts(c => ({ ...c, [detailTask.status]: Math.max(0, (c[detailTask.status] ?? 0) - 1) }))
    }
    setDetailTask(null)
  }

  // ─── D&D ─────────────────────────────────────────────────────────
  async function onDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const taskId = Number(draggableId)
    const newStatus = destination.droppableId
    const fromStatus = source.droppableId
    const prevTasks = tasks
    const prevCounts = counts

    setTasks(p => p.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)))
    setCounts(c => ({
      ...c,
      [fromStatus]: Math.max(0, (c[fromStatus] ?? 0) - 1),
      [newStatus]: (c[newStatus] ?? 0) + 1,
    }))

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setTasks(prevTasks)
      setCounts(prevCounts)
      notify('移動を保存できませんでした。元に戻しました', 'error')
    }
  }

  // ─── もっと見る ───────────────────────────────────────────────────
  async function loadMore(colId: string) {
    const loaded = tasks.filter(t => t.status === colId).length
    setLoadingCol(colId)
    try {
      const res = await fetch(`/api/tasks?status=${encodeURIComponent(colId)}&offset=${loaded}&limit=${perPage}`)
      if (!res.ok) throw new Error(String(res.status))
      const more: Task[] = await res.json()
      setTasks(prev => {
        const have = new Set(prev.map(t => t.id))
        return [...prev, ...more.filter(m => !have.has(m.id))]
      })
    } catch {
      notify('追加の読み込みに失敗しました', 'error')
    } finally {
      setLoadingCol(null)
    }
  }

  // ─── タスク作成 ───────────────────────────────────────────────────
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setCreating(true)
    const channelId = channels.find(c => c.name === newChannelName.trim())?.id
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          assignee: newAssignee || null,
          end_date: newEndDate || null,
          slack_channel_id: channelId,
        }),
      })
      if (res.ok) {
        const task = await res.json()
        setTasks(prev => [{ ...task, labels: task.labels ?? [] }, ...prev])
        setCounts(c => ({ ...c, '作業一覧': (c['作業一覧'] ?? 0) + 1 }))
        setNewTaskTitle(''); setNewAssignee(''); setNewEndDate(''); setNewChannelName('')
        closeModal()
        if (task.slack_error) notify(`タスクは作成しましたが ${task.slack_error}`, 'error')
      } else {
        notify('タスクを作成できませんでした', 'error')
      }
    } catch {
      notify('通信に失敗しました', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    window.location.href = '/login'
  }

  // ─── render ───────────────────────────────────────────────────────
  const tasksByStatus = colMap()
  const searching = query.trim().length > 0
  const loadedByStatus: Record<string, number> = {}
  tasks.forEach(t => { loadedByStatus[t.status] = (loadedByStatus[t.status] ?? 0) + 1 })

  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* ヘッダー */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">タスク管理</h1>
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="タイトルで検索"
            aria-label="タスクをタイトルで検索"
            className="text-sm border rounded px-3 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">{currentUser.name}</span>
          <button
            ref={addBtnRef}
            onClick={() => setShowNewTaskModal(true)}
            className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700"
          >
            + タスク追加
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {loggingOut ? 'ログアウト中...' : 'ログアウト'}
          </button>
        </div>
      </header>

      {/* カンバン本体 */}
      <div className="flex-1 overflow-x-auto relative">
        {tasks.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <p className="text-gray-500">まだタスクがありません</p>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="pointer-events-auto bg-blue-600 text-white text-sm px-5 py-2 rounded hover:bg-blue-700"
            >
              + 最初のタスクを作成
            </button>
          </div>
        )}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 p-4 min-w-max h-full">
            {COLUMN_ORDER.map(col => (
              <KanbanColumn
                key={col.id}
                colId={col.id}
                colLabel={col.label}
                tasks={tasksByStatus[col.id] ?? []}
                count={counts[col.id] ?? 0}
                loadedCount={loadedByStatus[col.id] ?? 0}
                searching={searching}
                today={today}
                users={users}
                loadingMore={loadingCol === col.id}
                onCardClick={openTaskDetail}
                onAddTask={() => setShowNewTaskModal(true)}
                onLoadMore={loadMore}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* タスク詳細モーダル */}
      <TaskDetailModal
        task={detailTask}
        loading={detailLoading}
        allLabels={allLabels}
        users={users}
        currentUser={currentUser}
        onClose={closeTaskDetail}
        onSaved={handleTaskSaved}
        onDeleted={handleTaskDeleted}
      />

      {/* 新規タスク作成モーダル */}
      {showNewTaskModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="new-task-title" className="text-lg font-bold mb-4">新規タスク作成</h2>
            <form onSubmit={handleCreateTask}>
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="タスクタイトル"
                required
                autoFocus
                className="w-full border rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="担当者"
              >
                <option value="">担当者（任意）</option>
                {users.map(u => (
                  <option key={u.email} value={u.email}>{u.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={newEndDate}
                onChange={e => setNewEndDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="期限"
              />
              <input
                type="text"
                list="slack-channels"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder={channels.length ? 'Slackチャンネル（任意・検索可）' : 'Slackチャンネル（なし）'}
                disabled={channels.length === 0}
                className="w-full border rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                aria-label="Slack投稿チャンネル"
              />
              <datalist id="slack-channels">
                {channels.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast}
    </div>
  )
}
