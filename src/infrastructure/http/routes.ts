import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createTask } from '../../application/usecases/createTask'
import { assignTask } from '../../application/usecases/assignTask'
import { transitionTask } from '../../application/usecases/transitionTask'
import { getTaskWithTimeline } from '../../application/usecases/getTask'
import { listTasks } from '../../application/usecases/listTasks'
import { eventRepo } from '../../infrastructure/db/repositories/eventRepo'
import { mapError } from './errorMapper'

export async function routes(app: FastifyInstance) {

  app.post(
    '/v1/workspaces/:workspaceId/tasks',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-tenant-id', 'x-role'],
          properties: {
            'x-tenant-id': { type: 'string' },
            'x-role': { type: 'string', enum: ['agent', 'manager'] },
            'idempotency-key': { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH']
            }
          },
          additionalProperties: false
        }
      }
    },
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
          role: req.headers['x-role'] as 'agent' | 'manager',
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
    {
      schema: {
        headers: {
          type: 'object',
          required: ['if-match-version', 'x-role', 'x-tenant-id'],
          properties: {
            'if-match-version': { type: 'string', pattern: '^[0-9]+$' },
            'x-role': { type: 'string', enum: ['agent', 'manager'] },
            'x-tenant-id': { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['assignee_id'],
          properties: {
            assignee_id: { type: 'string', minLength: 1 }
          },
          additionalProperties: false
        }
      }
    },
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string; taskId: string }
        Body: { assignee_id: string }
      }>,
      reply
    ) => {
      try {
        await assignTask({
          taskId: req.params.taskId,
          workspaceId: req.params.workspaceId,
          assigneeId: req.body.assignee_id,
          version: Number(req.headers['if-match-version']),
          role: req.headers['x-role'] as 'agent' | 'manager',
          tenantId: req.headers['x-tenant-id'] as string
        })
        return { ok: true }
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )

  app.post(
    '/v1/workspaces/:workspaceId/tasks/:taskId/transition',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['if-match-version', 'x-role', 'x-tenant-id'],
          properties: {
            'if-match-version': { type: 'string', pattern: '^[0-9]+$' },
            'x-role': { type: 'string', enum: ['agent', 'manager'] },
            'x-user-id': { type: 'string' },
            'x-tenant-id': { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['to_state'],
          properties: {
            to_state: {
              type: 'string',
              enum: ['IN_PROGRESS', 'DONE', 'CANCELLED']
            }
          },
          additionalProperties: false
        }
      }
    },
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string; taskId: string }
        Body: { to_state: 'IN_PROGRESS' | 'DONE' | 'CANCELLED' }
      }>,
      reply
    ) => {
      try {
        await transitionTask({
          taskId: req.params.taskId,
          workspaceId: req.params.workspaceId,
          toState: req.body.to_state,
          version: Number(req.headers['if-match-version']),
          role: req.headers['x-role'] as 'agent' | 'manager',
          userId: req.headers['x-user-id'] as string | undefined,
          tenantId: req.headers['x-tenant-id'] as string
        })
        return { ok: true }
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )

  app.get(
    '/v1/workspaces/:workspaceId/tasks/:taskId',
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string; taskId: string }
      }>,
      reply
    ) => {
      try {
        return await getTaskWithTimeline(
          req.params.taskId,
          req.params.workspaceId
        )
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )

  app.get(
    '/v1/workspaces/:workspaceId/tasks',
    async (
      req: FastifyRequest<{
        Params: { workspaceId: string }
        Querystring: {
          state?: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
          assignee_id?: string
          limit?: string
          cursor?: string
        }
      }>,
      reply
    ) => {
      try {
        return await listTasks({
          workspaceId: req.params.workspaceId,
          state: req.query.state,
          assigneeId: req.query.assignee_id,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          cursor: req.query.cursor
        })
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )

  app.get(
    '/v1/events',
    async (
      req: FastifyRequest<{
        Querystring: { limit?: string }
      }>,
      reply
    ) => {
      try {
        const limit = Math.min(Number(req.query.limit) || 50, 100)
        const events = await eventRepo.findLatest(limit)

        return {
          events: events.map(e => ({
            event_id: e.event_id,
            task_id: e.task_id,
            tenant_id: e.tenant_id,
            role: e.role,
            type: e.type,
            payload: e.payload,
            created_at: e.created_at
          }))
        }
      } catch (e) {
        return mapError(e, reply)
      }
    }
  )
}
