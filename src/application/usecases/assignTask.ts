import { db } from '../../infrastructure/db/knex'
import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import {
  UnauthorizedError,
  VersionConflictError,
  NotFoundError
} from '../../domain/errors'

export interface AssignTaskInput {
  taskId: string
  workspaceId: string
  assigneeId: string
  version: number
  role: 'agent' | 'manager'
  tenantId: string
}

export async function assignTask(input: AssignTaskInput): Promise<void> {
  if (input.role !== 'manager') {
    throw new UnauthorizedError()
  }

  const task = await taskRepo.findById(
    input.taskId,
    input.workspaceId
  )
  if (!task) {
    throw new NotFoundError()
  }

  if (!['NEW', 'IN_PROGRESS'].includes(task.state)) {
    throw new UnauthorizedError()
  }

  await db.transaction(async trx => {
    const updated = await taskRepo.updateWithVersion(
      task.task_id,
      input.version,
      { assignee_id: input.assigneeId },
      trx
    )

    if (!updated) {
      throw new VersionConflictError()
    }

    await eventRepo.insert(
  {
    taskId: task.task_id,
    tenantId: input.tenantId,
    role: input.role,
    type: 'TaskAssigned',
    payload: {
      assignee_id: input.assigneeId
    }
  },
  trx
  )

  })
}
