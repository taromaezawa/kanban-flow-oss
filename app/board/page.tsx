// app/board/page.tsx
import { requireUser } from '@/lib/page-auth'
import { getAllUsers } from '@/lib/users'
import { getColumnsInitial } from '@/db/queries'
import { PER_PAGE } from '@/lib/columns'
import { sql } from '@/db/database'
import KanbanBoard from './KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  const currentUser = await requireUser()

  const { tasks, counts } = await getColumnsInitial(PER_PAGE)
  const users = getAllUsers()
  const allLabels = (await sql`SELECT * FROM labels ORDER BY id ASC`) as any[]

  return (
    <KanbanBoard
      initialTasks={tasks as any}
      initialCounts={counts}
      perPage={PER_PAGE}
      users={users}
      currentUser={{ name: currentUser.name, email: currentUser.email }}
      allLabels={allLabels}
    />
  )
}
