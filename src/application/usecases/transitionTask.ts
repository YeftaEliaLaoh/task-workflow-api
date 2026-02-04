import { db } from '../../infrastructure/db/knex'
import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { assertValidTransition } from '../../domain/taskStateMachine'
import { UnauthorizedError, VersionConflictError } from '../../domain/errors'

export async function transitionTask(input) {
  const task = await taskRepo.findById(input.taskId)

  assertValidTransition(task.state, input.toState)

  if (input.role === 'agent') {
    if (task.assignee_id !== input.userId) {
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

    if (!updated) throw new VersionConflictError()

    await eventRepo.insert(
      'TaskStateChanged',
      { from: task.state, to: input.toState },
      trx
    )
  })
}
