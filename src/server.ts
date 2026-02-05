import Fastify, { FastifyInstance } from 'fastify'
import { routes } from './infrastructure/http/routes'

export default function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false
  })

  app.register(routes)

  return app
}
