import { Hono } from 'hono'
import { authRoutes } from './routes/auth'
import { keyRoutes } from './routes/keys'
import { toolRoutes } from './routes/tools'
import { userRoutes } from './routes/users'
import { orgRoutes } from './routes/orgs'
import { analyticsRoutes } from './routes/analytics'

export const api = new Hono()

// mount all route groups here
api.route('/auth', authRoutes)
api.route('/keys', keyRoutes)
api.route('/tools', toolRoutes)
api.route('/users', userRoutes)
api.route('/orgs', orgRoutes)
api.route('/analytics', analyticsRoutes)
