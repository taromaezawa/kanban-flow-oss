// app/tasks/[id]/page.tsx
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/page-auth'
import { getAllUsers } from '@/lib/users'
import { sql } from '@/db/database'
import TaskDetail from './TaskDetail'

export const dynamic = 'force-dynamic'

export default async function TaskPage({ params }: { params: { id: string } }) {
  const currentUser = await requireUser()

  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()

  const taskRows = (await sql`SELECT * FROM tasks WHERE id = ${id}`) as any[]
  const task = taskRows[0]
  if (!task) notFound()

  const labels = (await sql`
    SELECT l.id, l.name, l.color
    FROM task_labels tl JOIN labels l ON l.id = tl.label_id
    WHERE tl.task_id = ${id}
  `) as any[]
  const comments = (await sql`
    SELECT * FROM comments WHERE task_id = ${id} ORDER BY created_at ASC
  `) as any[]
  const allLabels = (await sql`SELECT * FROM labels ORDER BY id ASC`) as any[]
  const users = getAllUsers()

  return (
    <TaskDetail
      initialTask={{ ...task, labels, comments }}
      allLabels={allLabels}
      users={users}
      currentUser={{ name: currentUser.name, email: currentUser.email }}
    />
  )
}
