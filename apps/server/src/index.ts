import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { getAllTools } from './registry'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/tools', (c) => {
  const tools = getAllTools()
  return c.json({
    count: tools.length,
    tools: tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      provider: t.provider,
      authType: t.authType,
    }))
  })
})

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 OpenTool server running on port ${port}`)
})