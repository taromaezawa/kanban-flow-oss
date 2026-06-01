// app/board/KanbanColumn.tsx
'use client'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import TaskCard from './TaskCard'
import { DONE_STATUS } from '@/lib/columns'

interface Label { id: number; name: string; color: string }
interface Task {
  id: number; title: string; assignee: string | null
  start_date: string | null; end_date: string | null
  slack_url: string | null; status: string; labels: Label[]
}
interface User { name: string; email: string }

interface Props {
  colId: string
  colLabel: string
  tasks: Task[]
  count: number
  loadedCount: number
  searching: boolean
  today: string | null
  users: User[]
  loadingMore: boolean
  onCardClick: (id: number) => void
  onAddTask: () => void
  onLoadMore: (colId: string) => void
}

function userNameByEmail(users: User[], email: string | null): string {
  if (!email) return ''
  return users.find(u => u.email === email)?.name ?? email
}

export default function KanbanColumn({
  colId, colLabel, tasks, count, loadedCount, searching, today, users,
  loadingMore, onCardClick, onAddTask, onLoadMore,
}: Props) {
  return (
    <div className="w-56 flex flex-col">
      {/* 列ヘッダー */}
      <div className="bg-gray-200 rounded-t px-3 py-2 font-medium text-sm text-gray-700">
        {colLabel}
        <span className="ml-2 text-xs text-gray-500">
          {searching ? tasks.length : count}
        </span>
      </div>

      <Droppable droppableId={colId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            onClick={colId === '作業一覧' ? onAddTask : undefined}
            className={`flex-1 min-h-16 p-2 rounded-b ${
              snapshot.isDraggingOver
                ? 'bg-blue-50'
                : colId === '作業一覧'
                ? 'bg-gray-100 hover:bg-blue-50/30 cursor-pointer'
                : 'bg-gray-100'
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              colId === '作業一覧' ? (
                <div className="flex flex-col items-center justify-center py-4 text-gray-400 pointer-events-none select-none">
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-xs">クリックして追加</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3 select-none">タスクなし</p>
              )
            )}
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={(e) => {
                      // 列背景のクリック（作業一覧の新規作成）が発火しないよう伝播を止める。
                      // ドラッグ後のクリックは @hello-pangea/dnd が window capture で自動抑制するため、
                      // ここは純粋なクリック（非ドラッグ）時のみ呼ばれる。
                      e.stopPropagation()
                      onCardClick(task.id)
                    }}
                    aria-label={`${task.title}（${colLabel}）。スペースキーで持ち上げ、矢印キーで移動`}
                    className="cursor-pointer"
                  >
                    <TaskCard
                      task={task}
                      assigneeName={userNameByEmail(users, task.assignee)}
                      today={today}
                      done={task.status === DONE_STATUS}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* 作業一覧は既存タスクがある場合も + ボタンを表示 */}
      {colId === '作業一覧' && tasks.length > 0 && (
        <button
          onClick={onAddTask}
          className="mt-1 w-full py-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-dashed border-gray-300 hover:border-blue-400 transition-colors"
        >
          + タスクを追加
        </button>
      )}

      {/* もっと見る */}
      {!searching && loadedCount < count && (
        <button
          onClick={() => onLoadMore(colId)}
          disabled={loadingMore}
          className="mt-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 py-1"
        >
          {loadingMore ? '読み込み中...' : `もっと見る (+${count - loadedCount})`}
        </button>
      )}
    </div>
  )
}
