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

export type TaskUpdate = Partial<Pick<
  TaskRow,
  'state' | 'assignee_id'
>>

export const taskRepo = {
  insert(
    task: TaskRow,
    trx: Knex = db
  ): Promise<number[]> {
    return trx<TaskRow>('tasks').insert(task)
  },

  findById(
    taskId: string
  ): Promise<TaskRow | undefined> {
    return db<TaskRow>('tasks')
      .where({ task_id: taskId })
      .first()
  },

  updateWithVersion(
    taskId: string,
    version: number,
    changes: TaskUpdate,
    trx: Knex = db
  ): Promise<number> {
    return trx<TaskRow>('tasks')
      .where({ task_id: taskId, version })
      .update({
        ...changes,
        version: version + 1,
        updated_at: trx.fn.now()
      })
  }
}
