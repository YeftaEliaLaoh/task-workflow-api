import { v4 as uuid } from 'uuid'
import { db } from '../../infrastructure/db/knex'
import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { idempotencyRepo } from '../../infrastructure/db/repositories/idempotencyRepo'

export async function createTask(input) {
  if (input.idempotencyKey) {
    const existing = await idempotencyRepo.find(input.idempotencyKey)
    if (existing) return existing.response
  }

  const task = {
    task_id: uuid(),
    tenant_id: input.tenantId,
    workspace_id: input.workspaceId,
    title: input.title,
    priority: input.priority ?? 'MEDIUM',
    state: 'NEW',
    assignee_id: null,
    version: 1
  }

  const response = {
    task_id: task.task_id,
    state: task.state,
    version: task.version
  }

  await db.transaction(async trx => {
    await taskRepo.insert(task, trx)
    await eventRepo.insert('TaskCreated', task, trx)

    if (input.idempotencyKey) {
      await idempotencyRepo.save(input.idempotencyKey, response, trx)
    }
  })

  return response
}
