import { Hono } from 'hono'
import { z } from 'zod'
import { apiKeyMiddleware } from '../middleware'
import { generateAuthUrl, exchangeCode, revokeOAuthToken } from '../../auth/oauth'
import { storeToken } from '../../auth/broker'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db/client'
import { redis } from '../../db/redis'
import { generateApiKey } from '../../auth/encryption'
import { config } from '../../config'
import { logger } from '../../logger'
import { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH, PROVIDERS } from '../../constants'
import { authEvents } from '../../metrics'
import crypto from 'crypto'

// Account lockout: 5 failed attempts → 15 min lock
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_SECONDS = 15 * 60
const LOGIN_ATTEMPT_PREFIX = 'ot:login:attempts'

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

    // Check account lockout
    const attemptKey = `${LOGIN_ATTEMPT_PREFIX}:${email}`
    const attempts = await redis.get(attemptKey)
    if (attempts && parseInt(attempts, 10) >= MAX_LOGIN_ATTEMPTS) {
      const ttl = await redis.ttl(attemptKey)
      logger.warn('Account locked due to too many failed attempts', { email })
      return c.json(
        { error: `Account temporarily locked. Try again in ${Math.ceil(ttl / 60)} minutes.` },
        429,
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      // Increment failed attempts
      await redis.incr(attemptKey)
      await redis.expire(attemptKey, LOCKOUT_DURATION_SECONDS)
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      // Increment failed attempts
      await redis.incr(attemptKey)
      await redis.expire(attemptKey, LOCKOUT_DURATION_SECONDS)
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    // Successful login — clear lockout counter
    await redis.del(attemptKey)

    // Revoke old dashboard session keys, create a fresh one
    await prisma.apiKey.updateMany({
      where: { userId: user.id, name: 'Dashboard Session', revokedAt: null },
      data: { revokedAt: new Date() },
    })

    const { hash, prefix, fullKey } = generateApiKey()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: 'Dashboard Session',
        keyHash: hash,
        keyPrefix: prefix,
        expiresAt,
      },
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

// ─── Google OAuth Login (user authentication) ───

authRoutes.get('/google', (c) => {
  const clientId = process.env['GOOGLE_CLIENT_ID']
  if (!clientId) return c.json({ error: 'Google login not configured' }, 501)

  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${config.serverUrl}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.redirect(`${config.dashboardUrl}/login?error=google_no_code`)

  const clientId = process.env['GOOGLE_CLIENT_ID']
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET']
  if (!clientId || !clientSecret) {
    return c.redirect(`${config.dashboardUrl}/login?error=google_not_configured`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${config.serverUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      logger.error('Google token exchange failed', await tokenRes.text())
      return c.redirect(`${config.dashboardUrl}/login?error=google_token_failed`)
    }

    const tokens = (await tokenRes.json()) as { access_token: string; id_token: string }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userRes.ok) {
      return c.redirect(`${config.dashboardUrl}/login?error=google_userinfo_failed`)
    }

    const googleUser = (await userRes.json()) as {
      id: string
      email: string
      name?: string
      picture?: string
      verified_email?: boolean
    }

    if (!googleUser.email) {
      return c.redirect(`${config.dashboardUrl}/login?error=google_no_email`)
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: googleUser.email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name || null,
          // No password — Google-only account
        },
      })
      authEvents.inc({ event: 'signup', provider: 'google' })
    }

    // Create session API key
    await prisma.apiKey.updateMany({
      where: { userId: user.id, name: 'Dashboard Session', revokedAt: null },
      data: { revokedAt: new Date() },
    })

    const { hash, prefix, fullKey } = generateApiKey()
    await prisma.apiKey.create({
      data: { userId: user.id, name: 'Dashboard Session', keyHash: hash, keyPrefix: prefix },
    })

    authEvents.inc({ event: 'login', provider: 'google' })

    // Redirect to dashboard with the API key as a URL param (dashboard picks it up and stores it)
    return c.redirect(
      `${config.dashboardUrl}/auth/callback?apiKey=${encodeURIComponent(fullKey)}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`,
    )
  } catch (error) {
    logger.error('Google OAuth error', error)
    return c.redirect(`${config.dashboardUrl}/login?error=google_failed`)
  }
})
