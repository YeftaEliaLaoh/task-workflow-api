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
  }
}
