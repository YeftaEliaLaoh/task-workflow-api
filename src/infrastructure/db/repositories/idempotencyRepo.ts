import { db } from '../knex'

export const idempotencyRepo = {
  find: (key) =>
    db('idempotency_keys').where({ key }).first(),

  save: (key, response, trx = db) =>
    trx('idempotency_keys').insert({ key, response })
}
