import { Hono } from 'hono'
import { apiKeyMiddleware } from '../middleware'
import { generateAuthUrl, exchangeCode, revokeOAuthToken } from '../../auth/oauth'

export const authRoutes = new Hono()

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