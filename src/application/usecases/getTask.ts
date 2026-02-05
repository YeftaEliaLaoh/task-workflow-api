import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { NotFoundError } from '../../domain/errors'

export async function getTaskWithTimeline(
  taskId: string,
  workspaceId: string
) {
  const task = await taskRepo.findById(taskId, workspaceId)

  if (!task) {
    throw new NotFoundError()
  }

  const events = await eventRepo.findLastByTaskId(taskId, 20)

  return {
    task: {
      task_id: task.task_id,
      workspace_id: task.workspace_id,
      title: task.title,
      priority: task.priority,
      state: task.state,
      assignee_id: task.assignee_id,
      version: task.version,
      created_at: task.created_at,
      updated_at: task.updated_at
    },
    timeline: events.map(e => ({
      event_id: e.event_id,
      type: e.type,
      role: e.role,
      payload: e.payload,
      created_at: e.created_at
    }))
  }
}
