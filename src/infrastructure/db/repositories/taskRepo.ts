import { Knex } from 'knex'
import { db } from '../knex'
import { TaskState } from '../../../domain/taskStateMachine'

export interface TaskRow {
  task_id: string
  tenant_id: string
  workspace_id: string
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  state: TaskState
  assignee_id: string | null
  version: number
  created_at?: Date
  updated_at?: Date
}

export type TaskUpdate = Partial<
  Pick<TaskRow, 'state' | 'assignee_id'>
>

export interface ListTaskQuery {
  workspaceId: string
  state?: TaskState
  assigneeId?: string
  limit: number
  cursor?: string
}

export const taskRepo = {
  insert(task: TaskRow, trx: Knex = db) {
    return trx<TaskRow>('tasks').insert(task)
  },

  findById(taskId: string, workspaceId: string) {
    return db<TaskRow>('tasks')
      .where({ task_id: taskId, workspace_id: workspaceId })
      .first()
  },

  updateWithVersion(
    taskId: string,
    version: number,
    changes: TaskUpdate,
    trx: Knex = db
  ) {
    return trx<TaskRow>('tasks')
      .where({ task_id: taskId, version })
      .update({
        ...changes,
        version: version + 1,
        updated_at: trx.fn.now()
      })
  },

  list(query: ListTaskQuery) {
    let q = db<TaskRow>('tasks')
      .where({ workspace_id: query.workspaceId })
      .orderBy('created_at', 'desc')
      .limit(query.limit)

    if (query.state) q.andWhere('state', query.state)
    if (query.assigneeId) q.andWhere('assignee_id', query.assigneeId)
    if (query.cursor) q.andWhere('task_id', '<', query.cursor)

    return q
  }
}
