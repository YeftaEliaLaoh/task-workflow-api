import Fastify from 'fastify'
import { routes } from './infrastructure/http/routes'

export const app = Fastify()
app.register(routes)

app.listen({ port: 3000 })
