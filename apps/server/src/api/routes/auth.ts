import { Hono } from 'hono'
import { apiKeyMiddleware } from '../middleware'
import { generateAuthUrl, exchangeCode, revokeOAuthToken } from '../../auth/oauth'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db/client'
import { generateApiKey } from '../../auth/encryption'

export const authRoutes = new Hono()

// ─── Password Auth ────────────────────────

authRoutes.post('/signup', async (c) => {
  try {
    const { email, name, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return c.json({ error: 'User already exists' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash },
    })

    // Auto-generate first API key
    const { raw, hash, prefix } = generateApiKey()
    await prisma.apiKey.create({
      data: { userId: user.id, name: 'Default Key', keyHash: hash, keyPrefix: prefix },
    })

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: raw,
    }, 201)
  } catch (error) {
    console.error('Signup error:', error)
    if (error instanceof Error && error.message.includes("Can't reach database")) {
      return c.json({ error: 'Unable to connect to database. Please check your DATABASE_URL.' }, 503)
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})

authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    // Revoke old dashboard session keys, create a fresh one
    await prisma.apiKey.updateMany({
      where: { userId: user.id, name: 'Dashboard Session', revokedAt: null },
      data: { revokedAt: new Date() },
    })

    const { raw, hash, prefix } = generateApiKey()
    await prisma.apiKey.create({
      data: { userId: user.id, name: 'Dashboard Session', keyHash: hash, keyPrefix: prefix },
    })

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: raw,
    })
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Error && error.message.includes("Can't reach database")) {
      return c.json({ error: 'Unable to connect to database. Please check your DATABASE_URL.' }, 503)
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})

// ─── OAuth Tool Connection ────────────────

authRoutes.get('/connect-url/:provider', apiKeyMiddleware, async (c) => {
  const provider = c.req.param('provider')!
  const user = c.get('user')

  try {
    const url = await generateAuthUrl(provider, user.id)
    return c.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('not configured') || message.includes('not enabled') ? 501 : 400
    return c.json({ error: message }, status)
  }
})

authRoutes.get('/connect/:provider', apiKeyMiddleware, async (c) => {
  const provider = c.req.param('provider')!
  const user = c.get('user')

  try {
    const url = await generateAuthUrl(provider, user.id)
    return c.redirect(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 400)
  }
})

authRoutes.get('/callback/:provider', async (c) => {
  const provider = c.req.param('provider')!
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400)
  }

  try {
    await exchangeCode(provider, code, state)
    return c.redirect(
      `${process.env['DASHBOARD_URL']}/dashboard/tools?connected=${provider}`
    )
  } catch (error) {
    return c.redirect(
      `${process.env['DASHBOARD_URL']}/dashboard/tools?error=${provider}`
    )
  }
})

authRoutes.delete('/revoke/:provider', apiKeyMiddleware, async (c) => {
  const provider = c.req.param('provider')!
  const user = c.get('user')

  try {
    await revokeOAuthToken(provider, user.id)
    return c.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 400)
  }
})