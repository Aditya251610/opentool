import { Context, Next } from 'hono'
import { resolveApiKey, ResolvedUser } from '../auth/broker'

declare module 'hono' {
  interface ContextVariableMap {
    user: ResolvedUser
  }
}

export async function apiKeyMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  const parts = authHeader.split(' ')

  if (parts[0] !== 'Bearer' || !parts[1]) {
    return c.json({ error: 'Invalid API key format' }, 401)
  }

  const rawKey = parts[1]
  const user = await resolveApiKey(rawKey)

  if (!user) {
    return c.json({ error: 'Invalid or expired API key' }, 401)
  }

  c.set('user', user)
  await next()
}
