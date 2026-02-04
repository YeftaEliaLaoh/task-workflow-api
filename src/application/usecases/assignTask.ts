import { db } from '../../infrastructure/db/knex'
import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { UnauthorizedError, VersionConflictError } from '../../domain/errors'

export async function assignTask(input) {
  if (input.role !== 'manager') {
    throw new UnauthorizedError()
  }

  const task = await taskRepo.findById(input.taskId)
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

    if (!updated) throw new VersionConflictError()

    await eventRepo.insert(
      'TaskAssigned',
      { assignee_id: input.assigneeId },
      trx
    )
  })
}
