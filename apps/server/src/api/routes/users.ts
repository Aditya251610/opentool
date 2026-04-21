import { Hono } from 'hono'
import { z } from 'zod'
import { apiKeyMiddleware } from '../middleware'
import { prisma } from '../../db/client'
import { logger } from '../../logger'

const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
})

const updateUserSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email('Valid email is required').optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'At least one field (name or email) must be provided',
  })

export const userRoutes = new Hono()

userRoutes.post('/', apiKeyMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
    }

    const { email, name } = parsed.data
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return c.json({ error: 'User already exists' }, 409)
    }

    const user = await prisma.user.create({ data: { email, name } })

    return c.json({ id: user.id, email: user.email, name: user.name }, 201)
  } catch (error) {
    logger.error('Failed to create user', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

userRoutes.get('/me', apiKeyMiddleware, async (c) => {
  try {
    const user = c.get('user')

    const fetchedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { _count: { select: { toolConnections: true } } },
    })

    if (!fetchedUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      id: fetchedUser.id,
      email: fetchedUser.email,
      name: fetchedUser.name,
      createdAt: fetchedUser.createdAt,
      connectedToolsCount: fetchedUser._count.toolConnections,
    })
  } catch (error) {
    logger.error('Failed to fetch user profile', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

userRoutes.patch('/me', apiKeyMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
    }

    const { name, email } = parsed.data
    const data: Record<string, string> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== user.id) {
        return c.json({ error: 'Email already in use' }, 409)
      }
      data.email = email
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    })

    return c.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
    })
  } catch (error) {
    logger.error('Failed to update user', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})
