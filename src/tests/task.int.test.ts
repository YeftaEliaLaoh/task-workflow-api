import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../src/server'

describe('Task Workflow', () => {
  it('idempotent create', async () => {
    const r1 = await request(app.server)
      .post('/v1/workspaces/w1/tasks')
      .set('X-Tenant-Id', 't1')
      .set('Idempotency-Key', 'k1')
      .send({ title: 'Task A' })

    const r2 = await request(app.server)
      .post('/v1/workspaces/w1/tasks')
      .set('X-Tenant-Id', 't1')
      .set('Idempotency-Key', 'k1')
      .send({ title: 'Task A' })

    expect(r1.body.task_id).toBe(r2.body.task_id)
  })
})
