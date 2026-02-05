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
  type: TaskEventType
  payload: unknown
  created_at?: Date
}

export const eventRepo = {
  // INSERT (outbox write)
  insert(
    taskId: string,
    type: TaskEventType,
    payload: unknown,
    trx: Knex = db
  ): Promise<number[]> {
    return trx<TaskEventRow>('task_events').insert({
      event_id: uuid(),
      task_id: taskId,
      type,
      payload
    })
  },

  // QUERY (audit timeline)
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
