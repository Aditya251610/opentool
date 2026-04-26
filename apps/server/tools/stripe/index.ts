import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const STRIPE_BASE = 'https://api.stripe.com/v1'

function stripeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
}

export const stripeCreatePaymentLink = defineTool({
  id: 'stripe_create_payment_link',
  name: 'Create Stripe Payment Link',
  description:
    'Creates a Stripe Payment Link for a given Price ID. The link is reusable and can be shared with customers.\n\nReturns: { id, url, active, livemode }',
  provider: 'stripe',
  authType: 'oauth2',
  requiredScopes: ['read_write'],
  category: 'payments',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    price_id: z.string().describe('Stripe Price ID (e.g. "price_1234...")'),
    quantity: z
      .number()
      .int()
      .positive()
      .max(99999)
      .optional()
      .describe('Quantity (default 1, max 99999)'),
    after_completion_url: z
      .string()
      .url()
      .refine((url) => url.startsWith('https://'), { message: 'URL must use HTTPS' })
      .optional()
      .describe('URL to redirect to after payment (must be HTTPS)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    params.set('line_items[0][price]', input.price_id)
    params.set('line_items[0][quantity]', String(input.quantity ?? 1))
    if (input.after_completion_url) {
      params.set('after_completion[type]', 'redirect')
      params.set('after_completion[redirect][url]', input.after_completion_url)
    }

    const res = await fetch(`${STRIPE_BASE}/payment_links`, {
      method: 'POST',
      headers: stripeHeaders(auth.accessToken!),
      body: params.toString(),
    })

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Stripe', 'execute')
    }

    const link = (await res.json()) as {
      id: string
      url: string
      active: boolean
      livemode: boolean
    }

    return { id: link.id, url: link.url, active: link.active, livemode: link.livemode }
  },
})

export const stripeListCustomers = defineTool({
  id: 'stripe_list_customers',
  name: 'List Stripe Customers',
  description:
    'Lists Stripe customers with optional email filter and cursor pagination.\n\nReturns: { customers: [{ id, email, name, createdAt, currency, description }], hasMore }',
  provider: 'stripe',
  authType: 'oauth2',
  requiredScopes: ['read_write'],
  category: 'payments',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    email: z.string().email().optional().describe('Filter by customer email'),
    limit: z
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .describe('Number of customers to return (default 10, max 100)'),
    starting_after: z.string().optional().describe('Cursor for pagination (customer ID)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      limit: String(input.limit ?? 10),
    })
    if (input.email) params.set('email', input.email)
    if (input.starting_after) params.set('starting_after', input.starting_after)

    const res = await fetch(`${STRIPE_BASE}/customers?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Stripe', 'execute')
    }

    const data = (await res.json()) as {
      data: Array<{
        id: string
        email: string | null
        name: string | null
        created: number
        currency: string | null
        description: string | null
      }>
      has_more: boolean
    }

    return {
      customers: data.data.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name,
        createdAt: new Date(c.created * 1000).toISOString(),
        currency: c.currency,
        description: c.description,
      })),
      hasMore: data.has_more,
    }
  },
})

export const stripeTools = [stripeCreatePaymentLink, stripeListCustomers]
