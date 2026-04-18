import { Hono } from 'hono'
import { z } from 'zod'
import { apiKeyMiddleware } from '../middleware'
import { generateAuthUrl, exchangeCode, revokeOAuthToken } from '../../auth/oauth'
import { storeToken } from '../../auth/broker'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db/client'
import { generateApiKey } from '../../auth/encryption'
import { config } from '../../config'
import { logger } from '../../logger'
import { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH, PROVIDERS } from '../../constants'
import { authEvents } from '../../metrics'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  name: z.string().max(100).optional(),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const providerParamSchema = z.enum(PROVIDERS as unknown as [string, ...string[]])

export const authRoutes = new Hono()

// ─── Password Auth ────────────────────────

authRoutes.post('/signup', async (c) => {
  try {
    const parsed = signupSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400)
    }
    const { email, password, name } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return c.json({ error: 'User already exists' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash },
    })

    // Auto-generate first API key
    const { hash, prefix, fullKey } = generateApiKey()
    await prisma.apiKey.create({
      data: { userId: user.id, name: 'Default Key', keyHash: hash, keyPrefix: prefix },
    })

    // Record signup event
    authEvents.inc({ event: 'signup' })

    return c.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        apiKey: fullKey,
      },
      201,
    )
  } catch (error) {
    logger.error('Signup error', error)
    if (error instanceof Error && error.message.includes("Can't reach database")) {
      return c.json(
        { error: 'Unable to connect to database. Please check your DATABASE_URL.' },
        503,
      )
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})

authRoutes.post('/login', async (c) => {
  try {
    const parsed = loginSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400)
    }
    const { email, password } = parsed.data

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

    const { hash, prefix, fullKey } = generateApiKey()
    await prisma.apiKey.create({
      data: { userId: user.id, name: 'Dashboard Session', keyHash: hash, keyPrefix: prefix },
    })

    // Record login event
    authEvents.inc({ event: 'login' })

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: fullKey,
    })
  } catch (error) {
    logger.error('Login error', error)
    if (error instanceof Error && error.message.includes("Can't reach database")) {
      return c.json(
        { error: 'Unable to connect to database. Please check your DATABASE_URL.' },
        503,
      )
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})

// ─── OAuth Tool Connection ────────────────

authRoutes.get('/connect-url/:provider', apiKeyMiddleware, async (c) => {
  const providerResult = providerParamSchema.safeParse(c.req.param('provider'))
  if (!providerResult.success) {
    return c.json({ error: `Unknown provider: ${c.req.param('provider')}` }, 404)
  }
  const provider = providerResult.data
  const user = c.get('user')

  // Check if this is an API_KEY provider
  const oauthProvider = await prisma.oAuthProvider.findUnique({ where: { provider } })
  if (oauthProvider?.authType === 'API_KEY') {
    return c.json({ authType: 'API_KEY', provider })
  }

  try {
    const url = await generateAuthUrl(provider, user.id)
    return c.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('not configured') || message.includes('not enabled') ? 501 : 400
    return c.json({ error: message }, status)
  }
})

authRoutes.post('/connect-api-key/:provider', apiKeyMiddleware, async (c) => {
  const providerResult = providerParamSchema.safeParse(c.req.param('provider'))
  if (!providerResult.success) {
    return c.json({ error: `Unknown provider: ${c.req.param('provider')}` }, 404)
  }
  const provider = providerResult.data
  const user = c.get('user')

  const oauthProvider = await prisma.oAuthProvider.findUnique({ where: { provider } })
  if (!oauthProvider || oauthProvider.authType !== 'API_KEY') {
    return c.json({ error: `Provider "${provider}" does not support API key auth` }, 400)
  }

  // Accept user-provided API key from request body
  let userApiKey: string | undefined
  try {
    const body = await c.req.json<{ apiKey?: string }>()
    userApiKey = body.apiKey
  } catch {
    // No body or invalid JSON — fall through
  }

  // User MUST provide their own API key — never fall back to server env vars
  const apiKey = userApiKey
  if (!apiKey) {
    return c.json({ error: `Please provide your own API key for ${provider}` }, 400)
  }

  await storeToken({
    userId: user.id,
    provider,
    accessToken: apiKey,
    scopes: oauthProvider.defaultScopes,
  })

  return c.json({ success: true, provider })
})

authRoutes.get('/connect/:provider', apiKeyMiddleware, async (c) => {
  const providerResult = providerParamSchema.safeParse(c.req.param('provider'))
  if (!providerResult.success) {
    return c.json({ error: `Unknown provider: ${c.req.param('provider')}` }, 404)
  }
  const provider = providerResult.data
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
  const providerResult = providerParamSchema.safeParse(c.req.param('provider'))
  if (!providerResult.success) {
    return c.json({ error: `Unknown provider: ${c.req.param('provider')}` }, 404)
  }
  const provider = providerResult.data
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400)
  }

  // Verify the state's provider matches the URL param to prevent cross-provider injection
  try {
    const parsedState = JSON.parse(Buffer.from(state, 'base64').toString())
    if (parsedState.provider && parsedState.provider !== provider) {
      logger.error('Provider mismatch in OAuth callback', undefined, {
        urlProvider: provider,
        stateProvider: parsedState.provider,
      })
      return c.json({ error: 'Provider mismatch in OAuth state' }, 400)
    }
  } catch {
    // State parsing is best-effort; exchangeCode will validate further
  }

  try {
    await exchangeCode(provider, code, state)
    // Record OAuth connection event
    authEvents.inc({ event: 'connect', provider })
    return c.redirect(`${config.dashboardUrl}/dashboard/tools?connected=${provider}`)
  } catch (error) {
    logger.error('OAuth callback error', error, { provider })
    return c.redirect(`${config.dashboardUrl}/dashboard/tools?error=${provider}`)
  }
})

authRoutes.delete('/revoke/:provider', apiKeyMiddleware, async (c) => {
  const providerResult = providerParamSchema.safeParse(c.req.param('provider'))
  if (!providerResult.success) {
    return c.json({ error: `Unknown provider: ${c.req.param('provider')}` }, 404)
  }
  const provider = providerResult.data
  const user = c.get('user')

  try {
    await revokeOAuthToken(provider, user.id)
    return c.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 400)
  }
})
