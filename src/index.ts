import buildApp from './server'

const app = buildApp()

app.listen({ port: 3000 }, err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('🚀 Server running on http://localhost:3000')
})
