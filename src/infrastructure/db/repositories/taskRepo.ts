import { db } from '../knex'

export const taskRepo = {
  insert: (task, trx = db) =>
    trx('tasks').insert(task),

  findById: (taskId) =>
    db('tasks').where({ task_id: taskId }).first(),

  updateWithVersion: (taskId, version, changes, trx = db) =>
    trx('tasks')
      .where({ task_id: taskId, version })
      .update({ ...changes, version: version + 1 })
}
