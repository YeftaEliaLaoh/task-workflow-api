import { v4 as uuid } from 'uuid'
import { db } from '../../infrastructure/db/knex'
import { taskRepo, TaskRow } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'

export interface CreateTaskInput {
  tenantId: string
  role: 'agent' | 'manager'
  workspaceId: string
  title: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  idempotencyKey?: string
}

export interface CreateTaskResult {
  task_id: string
  state: string
  version: number
}

export async function createTask(
  input: CreateTaskInput
): Promise<CreateTaskResult> {

  return db.transaction(async trx => {

    if (input.idempotencyKey) {
      const existing = await trx('idempotency_keys')
        .where({ key: input.idempotencyKey })
        .first()

      if (existing) {
        const task = await trx('tasks')
          .where({ task_id: existing.task_id })
          .first()

        if (!task) {
          throw new Error('Idempotency key exists but task not found')
        }

        return {
          task_id: task.task_id,
          state: task.state,
          version: task.version
        }
      }
    } 

    const task: TaskRow = {
      task_id: uuid(),
      workspace_id: input.workspaceId,
      title: input.title,
      priority: input.priority ?? 'MEDIUM',
      state: 'NEW',
      assignee_id: null,
      version: 1
    }

    const response: CreateTaskResult = {
      task_id: task.task_id,
      state: task.state,
      version: task.version
    }

    await taskRepo.insert(task, trx)

    await eventRepo.insert(
      {
        taskId: task.task_id,
        tenantId: input.tenantId,
        role: input.role,
        type: 'TaskCreated',
        payload: {
          title: task.title,
          priority: task.priority,
          state: task.state
        }
      },
      trx
    )

    if (input.idempotencyKey) {
      await trx('idempotency_keys').insert({
        key: input.idempotencyKey,
        task_id: task.task_id
      })
    }

    return response
  })
}
