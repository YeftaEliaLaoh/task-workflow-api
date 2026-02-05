import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'

export interface ListTasksInput {
  workspaceId: string
  state?: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  assigneeId?: string
  limit?: number
  cursor?: string
}

export interface ListTasksResult {
  tasks: {
    task_id: string
    title: string
    state: string
    assignee_id: string | null
    version: number
  }[]
  next_cursor?: string
}

interface DecodedCursor {
  createdAt: string
  taskId: string
}

export async function listTasks(
  input: ListTasksInput
): Promise<ListTasksResult> {
  const limit = Math.min(input.limit ?? 20, 50)

  let decodedCursor: DecodedCursor | undefined

  if (input.cursor) {
    decodedCursor = JSON.parse(
      Buffer.from(input.cursor, 'base64').toString('utf8')
    )
  }

  const rows = await taskRepo.list({
    workspaceId: input.workspaceId,
    state: input.state,
    assigneeId: input.assigneeId,
    limit: limit + 1,
    cursor: decodedCursor
  })

  const hasNext = rows.length > limit
  const tasks = rows.slice(0, limit)

  return {
    tasks: tasks.map(t => ({
      task_id: t.task_id,
      title: t.title,
      state: t.state,
      assignee_id: t.assignee_id,
      version: t.version
    })),
    next_cursor: hasNext
      ? Buffer.from(
          JSON.stringify({
            createdAt: tasks[tasks.length - 1].created_at,
            taskId: tasks[tasks.length - 1].task_id
          })
        ).toString('base64')
      : undefined
  }
}
