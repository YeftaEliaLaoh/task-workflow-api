import { v4 as uuid } from 'uuid'
import { db } from '../knex'

export const eventRepo = {
  insert: (type, payload, trx = db) =>
    trx('task_events').insert({
      event_id: uuid(),
      type,
      payload
    })
}
