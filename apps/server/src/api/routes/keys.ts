import { Hono } from 'hono'
import { prisma } from '../../db/client'
import { apiKeyMiddleware } from '../middleware'
import { generateApiKey } from '../../auth/encryption'

export const keyRoutes = new Hono()

keyRoutes.post('/', apiKeyMiddleware, async (c) => {
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { name } = body

    if (!name) {
      return c.json({ error: 'Key name is required' }, 400)
    }

    const { raw, hash, prefix } = generateApiKey()

    await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        keyHash: hash,
        keyPrefix: prefix,
      },
    })

    return c.json({ key: raw, prefix, name }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

keyRoutes.get('/', apiKeyMiddleware, async (c) => {
  const user = c.get('user')

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return c.json({ keys })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

keyRoutes.delete('/:id', apiKeyMiddleware, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  try {
    const key = await prisma.apiKey.findUnique({ where: { id } })

    if (!key || key.userId !== user.id) {
      return c.json({ error: 'Not found' }, 404)
    }

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    })

    return c.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})