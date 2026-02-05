import { db } from '../../infrastructure/db/knex'
import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { assertValidTransition } from '../../domain/taskStateMachine'
import {
  UnauthorizedError,
  VersionConflictError,
  NotFoundError
} from '../../domain/errors'

export interface TransitionTaskInput {
  taskId: string
  workspaceId: string
  toState: 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  version: number
  role: 'agent' | 'manager'
  userId?: string
  tenantId: string
}

export async function transitionTask(
  input: TransitionTaskInput
): Promise<void> {
  const task = await taskRepo.findById(input.taskId, input.workspaceId)

  if (!task) {
    throw new NotFoundError()
  }

  assertValidTransition(task.state, input.toState)

  if (input.role === 'agent') {
    if (!input.userId || task.assignee_id !== input.userId) {
      throw new UnauthorizedError()
    }
  }

  if (input.role === 'manager' && input.toState !== 'CANCELLED') {
    throw new UnauthorizedError()
  }

  await db.transaction(async trx => {
    const updated = await taskRepo.updateWithVersion(
      task.task_id,
      input.version,
      { state: input.toState },
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
        type: 'TaskStateChanged',
        payload: {
          from: task.state,
          to: input.toState
        }
      },
      trx
    )
  })
}
