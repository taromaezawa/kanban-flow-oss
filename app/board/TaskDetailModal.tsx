// app/board/TaskDetailModal.tsx
'use client'
import { useEffect } from 'react'
import TaskDetail from '@/app/tasks/[id]/TaskDetail'

interface Label { id: number; name: string; color: string }
interface Comment { id: number; author: string; content: string; created_at: string }
interface DetailTask {
  id: number; title: string; description: string; status: string
  assignee: string | null; start_date: string | null; end_date: string | null
  slack_url: string; slack_channel_id: string | null; creator: string; created_at: string
  labels: Label[]; comments: Comment[]
}
interface User { name: string; email: string }

interface Props {
  task: DetailTask | null
  loading: boolean
  allLabels: Label[]
  users: User[]
  currentUser: User
  onClose: () => void
  onSaved: (updated: any) => void
  onDeleted: (id: number) => void
}

export default function TaskDetailModal({
  task, loading, allLabels, users, currentUser,
  onClose, onSaved, onDeleted,
}: Props) {
  // ESC でモーダルを閉じる
  useEffect(() => {
    if (!task && !loading) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [task, loading, onClose])

  // ローディング中のオーバーレイ
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg px-6 py-4 text-sm text-gray-600 shadow-lg">
          読み込み中...
        </div>
      </div>
    )
  }

  if (!task) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <TaskDetail
          initialTask={task}
          allLabels={allLabels}
          users={users}
          currentUser={currentUser}
          onClose={onClose}
          onDeleted={onDeleted}
          onSaved={onSaved}
        />
      </div>
    </div>
  )
}
