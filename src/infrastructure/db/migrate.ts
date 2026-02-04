import { db } from './knex'

async function migrate() {
  await db.schema.createTable('tasks', t => {
    t.uuid('task_id').primary()
    t.text('tenant_id').notNullable()
    t.text('workspace_id').notNullable()
    t.text('title').notNullable()
    t.text('priority').notNullable()
    t.text('state').notNullable()
    t.text('assignee_id')
    t.integer('version').notNullable()
    t.timestamps(true, true)
  })

  await db.schema.createTable('task_events', t => {
    t.uuid('event_id').primary()
    t.uuid('task_id').notNullable()
    t.text('type').notNullable()
    t.jsonb('payload').notNullable()
    t.timestamp('created_at').defaultTo(db.fn.now())
  })

  await db.schema.createTable('idempotency_keys', t => {
    t.text('key').primary()
    t.jsonb('response').notNullable()
    t.timestamp('created_at').defaultTo(db.fn.now())
  })

  console.log('Migration complete')
  process.exit(0)
}

migrate()
