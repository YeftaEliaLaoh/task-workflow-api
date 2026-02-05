import {
  UnauthorizedError,
  InvalidTransitionError,
  VersionConflictError
} from '../../domain/errors'
import { FastifyReply } from 'fastify'

export function mapError(err: unknown, reply: FastifyReply) {
  if (err instanceof UnauthorizedError) {
    return reply.code(403).send({ message: 'Forbidden' })
  }

  if (err instanceof InvalidTransitionError) {
    return reply.code(409).send({ message: 'Invalid transition' })
  }

  if (err instanceof VersionConflictError) {
    return reply.code(409).send({ message: 'Version conflict' })
  }

  console.error(err)
  return reply.code(500).send({ message: 'Internal Server Error' })
}
