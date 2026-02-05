import { taskRepo } from '../../infrastructure/db/repositories/taskRepo'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { NotFoundError } from '../../domain/errors'

export interface GetTaskResult {
  task: {
    task_id: string
    tenant_id: string
    workspace_id: string
    title: string
    priority: string
    state: string
    assignee_id: string | null
    version: number
  }
  timeline: {
    type: string
    payload: unknown
    created_at: Date
  }[]
}

export async function getTaskWithTimeline(
  taskId: string,
  workspaceId: string
): Promise<GetTaskResult> {
  const task = await taskRepo.findById(taskId, workspaceId)

  if (!task) {
    throw new NotFoundError()
  }

  const events = await eventRepo.findLastByTaskId(task.task_id, 20)

  return {
    task: {
      task_id: task.task_id,
      tenant_id: task.tenant_id,
      workspace_id: task.workspace_id,
      title: task.title,
      priority: task.priority,
      state: task.state,
      assignee_id: task.assignee_id,
      version: task.version
    },
    timeline: events.map(e => ({
      type: e.type,
      payload: e.payload,
      created_at: e.created_at!
    }))
  }
}
