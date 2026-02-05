import buildApp from '../src/server'
import { db } from '../src/infrastructure/db/knex'

let app: ReturnType<typeof buildApp>

beforeAll(async () => {
  app = buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await db.destroy()
})

beforeEach(async () => {
  await db('task_events').del()
  await db('tasks').del()
  await db('idempotency_keys').del()
})

async function createNewTask() {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/w1/tasks',
    headers: {
      'x-tenant-id': 't1'
    },
    payload: { title: 'Test task' }
  })

  return res.json()
}

async function assignTaskAsManager(taskId: string, version: number) {
  await app.inject({
    method: 'POST',
    url: `/v1/workspaces/w1/tasks/${taskId}/assign`,
    headers: {
      'x-role': 'manager',
      'if-match-version': version
    },
    payload: { assignee_id: 'u1' }
  })
}

async function createAssignedTask() {
  const task = await createNewTask()

  await assignTaskAsManager(task.task_id, task.version)

  // ✅ ambil versi REAL dari DB
  const updated = await db('tasks')
    .where({ task_id: task.task_id })
    .first()

  return updated
}

test('idempotent create returns same task', async () => {
  const payload = { title: 'Follow up customer' }

  const res1 = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/w1/tasks',
    headers: {
      'x-tenant-id': 't1',
      'idempotency-key': 'abc-123'
    },
    payload
  })

  const res2 = await app.inject({
    method: 'POST',
    url: '/v1/workspaces/w1/tasks',
    headers: {
      'x-tenant-id': 't1',
      'idempotency-key': 'abc-123'
    },
    payload
  })

  expect(res1.json().task_id).toBe(res2.json().task_id)
})

test('invalid transition returns 409', async () => {
  const task = await createNewTask()

  const res = await app.inject({
    method: 'POST',
    url: `/v1/workspaces/w1/tasks/${task.task_id}/transition`,
    headers: {
      'x-role': 'agent',
      'x-user-id': 'u1',
      'if-match-version': task.version
    },
    payload: { to_state: 'DONE' }
  })

  expect(res.statusCode).toBe(409)
})

test('agent cannot complete unassigned task', async () => {
  const task = await createNewTask()

  const res = await app.inject({
    method: 'POST',
    url: `/v1/workspaces/w1/tasks/${task.task_id}/transition`,
    headers: {
      'x-role': 'agent',
      'x-user-id': 'u1',
      'if-match-version': task.version
    },
    payload: { to_state: 'IN_PROGRESS' }
  })

  expect(res.statusCode).toBe(403)
})

test('version conflict returns 409', async () => {
  const task = await createNewTask()

  await assignTaskAsManager(task.task_id, task.version)

  const res = await app.inject({
    method: 'POST',
    url: `/v1/workspaces/w1/tasks/${task.task_id}/assign`,
    headers: {
      'x-role': 'manager',
      'if-match-version': task.version // stale
    },
    payload: { assignee_id: 'u2' }
  })

  expect(res.statusCode).toBe(409)
})

test('transition creates outbox event', async () => {
  const task = await createAssignedTask()

  await app.inject({
    method: 'POST',
    url: `/v1/workspaces/w1/tasks/${task.task_id}/transition`,
    headers: {
      'x-role': 'agent',
      'x-user-id': task.assignee_id,
      'if-match-version': task.version
    },
    payload: { to_state: 'IN_PROGRESS' }
  })

  // ambil version terbaru
  const inProgress = await db('tasks')
    .where({ task_id: task.task_id })
    .first()

  await app.inject({
    method: 'POST',
    url: `/v1/workspaces/w1/tasks/${task.task_id}/transition`,
    headers: {
      'x-role': 'agent',
      'x-user-id': task.assignee_id,
      'if-match-version': inProgress.version
    },
    payload: { to_state: 'DONE' }
  })

  const events = await db('task_events')
    .where({ task_id: task.task_id })

  expect(
    events.some(e => e.type === 'TaskStateChanged')
  ).toBe(true)
})
