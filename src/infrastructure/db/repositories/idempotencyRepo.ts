import { Knex } from 'knex'
import { db } from '../knex'

export interface IdempotencyRow<T = unknown> {
  key: string
  response: T
  created_at?: Date
}

export const idempotencyRepo = {
  find<T = unknown>(
    key: string
  ): Promise<IdempotencyRow<T> | undefined> {
    return db<IdempotencyRow<T>>('idempotency_keys')
      .where({ key })
      .first()
  },

  save<T = unknown>(
    key: string,
    response: T,
    trx: Knex = db
  ): Promise<number[]> {
    return trx<IdempotencyRow<T>>('idempotency_keys').insert({
      key,
      response
    })
  }
}
