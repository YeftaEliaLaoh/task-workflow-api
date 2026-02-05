import { FastifyReply } from 'fastify'
import {
  UnauthorizedError,
  VersionConflictError,
  NotFoundError,
  InvalidTransitionError
} from '../../domain/errors'

export function mapError(error: unknown, reply: FastifyReply) {
  if (error instanceof NotFoundError) {
    return reply.status(404).send({
      message: 'Not found'
    })
  }

  if (error instanceof UnauthorizedError) {
    return reply.status(403).send({
      message: 'Forbidden'
    })
  }

  if (error instanceof VersionConflictError) {
    return reply.status(409).send({
      message: 'Version conflict'
    })
  }

  if (error instanceof InvalidTransitionError) {
    return reply.status(409).send({
      message: error.message
    })
  }

  console.error(error)

  return reply.status(500).send({
    message: 'Internal Server Error'
  })
}
