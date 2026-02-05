import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createTask } from '../../application/usecases/createTask'
import { assignTask } from '../../application/usecases/assignTask'
import { transitionTask } from '../../application/usecases/transitionTask'
import { mapError } from './errorMapper'

export async function routes(app: FastifyInstance) {
  app.post(
    '/v1/workspaces/:workspaceId/tasks',
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string }
        Body: { title: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
      }>,
      reply: FastifyReply
    ) => {
      try {
        return await createTask({
          tenantId: req.headers['x-tenant-id'] as string,
          workspaceId: req.params.workspaceId,
          title: req.body.title,
          priority: req.body.priority,
          idempotencyKey: req.headers['idempotency-key'] as string | undefined
        })
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )

  app.post(
    '/v1/workspaces/:workspaceId/tasks/:taskId/assign',
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string; taskId: string }
        Body: { assignee_id: string }
      }>,
      reply: FastifyReply
    ) => {
      try {
        await assignTask({
          taskId: req.params.taskId,
          assigneeId: req.body.assignee_id,
          version: Number(req.headers['if-match-version']),
          role: req.headers['x-role'] as 'agent' | 'manager'
        })
        return { ok: true }
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )

  app.post(
    '/v1/workspaces/:workspaceId/tasks/:taskId/transition',
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string; taskId: string }
        Body: { to_state: 'IN_PROGRESS' | 'DONE' | 'CANCELLED' }
      }>,
      reply: FastifyReply
    ) => {
      try {
        await transitionTask({
          taskId: req.params.taskId,
          toState: req.body.to_state,
          version: Number(req.headers['if-match-version']),
          role: req.headers['x-role'] as 'agent' | 'manager',
          userId: req.headers['x-user-id'] as string
        })
        return { ok: true }
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )
}
