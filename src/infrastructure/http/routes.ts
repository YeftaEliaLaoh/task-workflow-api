import { createTask } from '../../application/usecases/createTask'
import { assignTask } from '../../application/usecases/assignTask'
import { transitionTask } from '../../application/usecases/transitionTask'
import { mapError } from './errorMapper'

export async function routes(app) {
  app.post('/v1/workspaces/:workspaceId/tasks', async (req, reply) => {
    try {
      return await createTask({
        tenantId: req.headers['x-tenant-id'],
        workspaceId: req.params.workspaceId,
        title: req.body.title,
        priority: req.body.priority,
        idempotencyKey: req.headers['idempotency-key']
      })
    } catch (e) {
      mapError(e, reply)
    }
  })

  app.post('/v1/workspaces/:workspaceId/tasks/:taskId/assign', async (req, reply) => {
    try {
      await assignTask({
        taskId: req.params.taskId,
        assigneeId: req.body.assignee_id,
        version: Number(req.headers['if-match-version']),
        role: req.headers['x-role']
      })
      return { ok: true }
    } catch (e) {
      mapError(e, reply)
    }
  })

  app.post('/v1/workspaces/:workspaceId/tasks/:taskId/transition', async (req, reply) => {
    try {
      await transitionTask({
        taskId: req.params.taskId,
        toState: req.body.to_state,
        version: Number(req.headers['if-match-version']),
        role: req.headers['x-role'],
        userId: req.headers['x-user-id']
      })
      return { ok: true }
    } catch (e) {
      mapError(e, reply)
    }
  })
}
