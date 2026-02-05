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
  toState: 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  version: number
  role: 'agent' | 'manager'
  userId?: string
}

export async function transitionTask(
  input: TransitionTaskInput
): Promise<void> {
  const task = await taskRepo.findById(input.taskId)

  if (!task) {
    throw new NotFoundError()
  }

  assertValidTransition(task.state, input.toState)

  // Role rules
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
      task.task_id,
      'TaskStateChanged',
      {
        from: task.state,
        to: input.toState
      },
      trx
    )
  })
}
