import { v4 as uuid } from 'uuid'
import { db } from '../../infrastructure/db/knex'
import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { idempotencyRepo } from '../../infrastructure/db/repositories/idempotencyRepo'

export interface CreateTaskInput {
  tenantId: string
  workspaceId: string
  title: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  idempotencyKey?: string
}

export interface CreateTaskResult {
  task_id: string
  state: 'NEW'
  version: number
}

export async function createTask(
  input: CreateTaskInput
): Promise<CreateTaskResult> {
  // 1️⃣ Idempotency check
  if (input.idempotencyKey) {
    const existing = await idempotencyRepo.find<CreateTaskResult>(
      input.idempotencyKey
    )
    if (existing) {
      return existing.response
    }
  }

  // 2️⃣ Build task aggregate
  const task = {
    task_id: uuid(),
    tenant_id: input.tenantId,
    workspace_id: input.workspaceId,
    title: input.title,
    priority: input.priority ?? 'MEDIUM',
    state: 'NEW' as const,
    assignee_id: null,
    version: 1
  }

  const response: CreateTaskResult = {
    task_id: task.task_id,
    state: task.state,
    version: task.version
  }

  // 3️⃣ Atomic write: task + outbox + idempotency
  await db.transaction(async trx => {
    await taskRepo.insert(task, trx)

    await eventRepo.insert(
      task.task_id,
      'TaskCreated',
      {
        title: task.title,
        priority: task.priority,
        state: task.state
      },
      trx
    )

    if (input.idempotencyKey) {
      await idempotencyRepo.save(input.idempotencyKey, response, trx)
    }
  })

  return response
}
