import { Knex } from 'knex'
import { v4 as uuid } from 'uuid'
import { db } from '../knex'

export type TaskEventType =
  | 'TaskCreated'
  | 'TaskAssigned'
  | 'TaskStateChanged'

export interface TaskEventRow {
  event_id: string
  task_id: string
  tenant_id: string
  role: 'agent' | 'manager'
  type: TaskEventType
  payload: unknown
  created_at?: Date
}

export interface TaskEventInsert {
  taskId: string
  tenantId: string
  role: 'agent' | 'manager'
  type: TaskEventType
  payload: unknown
}

export const eventRepo = {
  insert(
    input: TaskEventInsert,
    trx: Knex = db
  ): Promise<number[]> {
    return trx<TaskEventRow>('task_events').insert({
      event_id: uuid(),
      task_id: input.taskId,
      tenant_id: input.tenantId,
      role: input.role,
      type: input.type,
      payload: input.payload
    })
  },

  findLastByTaskId(
    taskId: string,
    limit = 20
  ): Promise<TaskEventRow[]> {
    return db<TaskEventRow>('task_events')
      .where({ task_id: taskId })
      .orderBy('created_at', 'desc')
      .limit(limit)
  },

  findLatest(limit = 50): Promise<TaskEventRow[]> {
    return db<TaskEventRow>('task_events')
      .orderBy('created_at', 'desc')
      .limit(limit)
  }
}
