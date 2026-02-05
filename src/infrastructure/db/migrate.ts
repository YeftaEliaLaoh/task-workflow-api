import { db } from './knex'

async function migrate() {

  const hasTasks = await db.schema.hasTable('tasks')
  if (!hasTasks) {
    await db.schema.createTable('tasks', t => {
      t.uuid('task_id').primary()

      t.text('workspace_id').notNullable()

      t.text('title').notNullable()
      t.text('priority').notNullable().defaultTo('MEDIUM')
      t.text('state').notNullable().defaultTo('NEW')

      t.text('assignee_id').nullable()

      t.integer('version').notNullable().defaultTo(1)

      t.timestamps(true, true)

      t.index(['workspace_id'])
      t.index(['workspace_id', 'state'])
      t.index(['workspace_id', 'assignee_id'])
    })

    await db.raw(`
      ALTER TABLE tasks
      ADD CONSTRAINT tasks_priority_check
      CHECK (priority IN ('LOW','MEDIUM','HIGH'));

      ALTER TABLE tasks
      ADD CONSTRAINT tasks_state_check
      CHECK (state IN ('NEW','IN_PROGRESS','DONE','CANCELLED'));
    `)
  }

  const hasEvents = await db.schema.hasTable('task_events')
  if (!hasEvents) {
    await db.schema.createTable('task_events', t => {
      t.uuid('event_id').primary()

      t.uuid('task_id')
        .notNullable()
        .references('task_id')
        .inTable('tasks')
        .onDelete('CASCADE')

      t.text('tenant_id').notNullable()
      t.text('role').notNullable()

      t.text('type').notNullable()
      t.jsonb('payload').notNullable()

      t.timestamp('created_at')
        .notNullable()
        .defaultTo(db.fn.now())

      t.index(['task_id'])
      t.index(['tenant_id'])
      t.index(['type'])
      t.index(['created_at'])
    })
  }

  const hasIdem = await db.schema.hasTable('idempotency_keys')
  if (!hasIdem) {
    await db.schema.createTable('idempotency_keys', t => {
      t.text('key').primary()
      t.uuid('task_id')
        .notNullable()
        .references('task_id')
        .inTable('tasks')
        .onDelete('CASCADE')
      t.timestamp('created_at')
        .notNullable()
        .defaultTo(db.fn.now())
    })
  }

  console.log('Migration complete')
  await db.destroy()
}

migrate().catch(err => {
  console.error('Migration failed', err)
  process.exit(1)
})
