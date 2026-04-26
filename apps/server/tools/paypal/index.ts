import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

function getBase(): string {
  const env = process.env.PAYPAL_ENVIRONMENT?.toUpperCase()
  return env === 'PRODUCTION' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

function ppHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. Create Invoice ───────────────────

export const paypalCreateInvoice = defineTool({
  id: 'paypal_create_invoice',
  name: 'Create PayPal Invoice',
  description:
    'Creates a draft invoice via PayPal Invoicing API v2. Uses sandbox by default; set PAYPAL_ENVIRONMENT=PRODUCTION for live.\n\nReturns: { id, status, invoiceNumber, selfLink }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    recipient_email: z.string().email().describe('Recipient email address'),
    items: z
      .array(
        z.object({
          name: z.string().describe('Item name'),
          quantity: z.number().positive().describe('Item quantity'),
          unit_price: z.number().positive().describe('Price per unit'),
        }),
      )
      .min(1)
      .describe('Line items for the invoice'),
    currency: z.string().length(3).optional().describe('Currency code (default: USD)'),
    note: z.string().optional().describe('Note to recipient'),
  }),
  execute: async ({ input, auth }) => {
    const currency = input.currency ?? 'USD'

    const body = {
      detail: {
        currency_code: currency,
        note: input.note,
      },
      primary_recipients: [
        {
          billing_info: {
            email_address: input.recipient_email,
          },
        },
      ],
      items: input.items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        unit_amount: {
          currency_code: currency,
          value: String(item.unit_price),
        },
      })),
    }

    const res = await fetchWithRetry(
      `${getBase()}/v2/invoicing/invoices`,
      {
        method: 'POST',
        headers: ppHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'PayPal',
      'create_invoice',
    )

    const invoice = (await res.json()) as {
      id: string
      status: string
      detail: { invoice_number: string }
      links: { href: string; rel: string }[]
    }

    return {
      id: invoice.id,
      status: invoice.status,
      invoiceNumber: invoice.detail?.invoice_number,
      selfLink: invoice.links?.find((l) => l.rel === 'self')?.href,
    }
  },
})

// ─── 2. List Invoices ────────────────────

export const paypalListInvoices = defineTool({
  id: 'paypal_list_invoices',
  name: 'List PayPal Invoices',
  description:
    'Lists PayPal invoices with optional status filter and pagination. Client-side filtering by status.\n\nReturns: { invoices: [{ id, status, invoiceNumber, date, amount, currency }], totalItems, totalPages }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    page: z.number().min(1).optional().describe('Page number (default 1)'),
    page_size: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
    status: z
      .enum(['DRAFT', 'SENT', 'PAID', 'MARKED_AS_PAID', 'CANCELLED', 'REFUNDED'])
      .optional()
      .describe('Filter by invoice status'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.page) params.set('page', String(input.page))
    if (input.page_size) params.set('page_size', String(input.page_size))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${getBase()}/v2/invoicing/invoices${qs}`,
      { headers: ppHeaders(auth.accessToken!) },
      'PayPal',
      'list_invoices',
    )

    const data = (await res.json()) as {
      items: {
        id: string
        status: string
        detail: {
          invoice_number: string
          currency_code: string
          invoice_date: string
        }
        amount: { value: string; currency_code: string }
      }[]
      total_items: number
      total_pages: number
    }

    const items = (data.items ?? [])
      .filter((inv) => !input.status || inv.status === input.status)
      .map((inv) => ({
        id: inv.id,
        status: inv.status,
        invoiceNumber: inv.detail?.invoice_number,
        date: inv.detail?.invoice_date,
        amount: inv.amount?.value,
        currency: inv.amount?.currency_code,
      }))

    return {
      invoices: items,
      totalItems: data.total_items,
      totalPages: data.total_pages,
    }
  },
})

// ─── 3. Send Invoice ─────────────────────

export const paypalSendInvoice = defineTool({
  id: 'paypal_send_invoice',
  name: 'Send PayPal Invoice',
  description:
    'Sends a draft invoice to the recipient. The invoice must be in DRAFT status. Idempotent.\n\nReturns: { success, invoiceId }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    invoice_id: z.string().describe('PayPal invoice ID'),
    note: z.string().optional().describe('Additional note to include when sending'),
    send_to_recipient: z.boolean().optional().describe('Send to recipient email (default true)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {}
    if (input.note) body.note = input.note
    if (input.send_to_recipient !== undefined) {
      body.send_to_recipient = input.send_to_recipient
    }

    const res = await fetchWithRetry(
      `${getBase()}/v2/invoicing/invoices/${encodeURIComponent(input.invoice_id)}/send`,
      {
        method: 'POST',
        headers: ppHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'PayPal',
      'send_invoice',
    )

    // 202 Accepted with empty body on success
    if (res.status === 202 || res.status === 200) {
      return { success: true, invoiceId: input.invoice_id }
    }

    const data = await res.json()
    return data
  },
})

// ─── 4. Create Order ─────────────────────

export const paypalCreateOrder = defineTool({
  id: 'paypal_create_order',
  name: 'Create PayPal Order',
  description:
    'Creates a PayPal checkout order. Returns an approve link for the buyer to complete payment.\n\nReturns: { id, status, approveLink, selfLink }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    items: z
      .array(
        z.object({
          name: z.string().describe('Item name'),
          quantity: z.number().int().positive().describe('Quantity'),
          unit_price: z.number().positive().describe('Price per unit'),
        }),
      )
      .min(1)
      .describe('Order items'),
    currency: z.string().length(3).optional().describe('Currency code (default: USD)'),
    intent: z
      .enum(['CAPTURE', 'AUTHORIZE'])
      .optional()
      .describe('Payment intent (default: CAPTURE)'),
  }),
  execute: async ({ input, auth }) => {
    const currency = input.currency ?? 'USD'
    const totalValue = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toFixed(2)

    const body = {
      intent: input.intent ?? 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: totalValue,
            breakdown: {
              item_total: { currency_code: currency, value: totalValue },
            },
          },
          items: input.items.map((item) => ({
            name: item.name,
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: currency,
              value: item.unit_price.toFixed(2),
            },
          })),
        },
      ],
    }

    const res = await fetchWithRetry(
      `${getBase()}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: ppHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'PayPal',
      'create_order',
    )

    const order = (await res.json()) as {
      id: string
      status: string
      links: { href: string; rel: string }[]
    }

    return {
      id: order.id,
      status: order.status,
      approveLink: order.links?.find((l) => l.rel === 'approve')?.href,
      selfLink: order.links?.find((l) => l.rel === 'self')?.href,
    }
  },
})

// ─── 5. Get Order ─────────────────────────

export const paypalGetOrder = defineTool({
  id: 'paypal_get_order',
  name: 'Get PayPal Order',
  description:
    'Fetches a PayPal order by ID with purchase unit and payment details.\n\nReturns: { id, status, createdAt, updatedAt, purchaseUnits: [{ amount, currency, payeeEmail }] }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    order_id: z.string().describe('PayPal order ID'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/v2/checkout/orders/${encodeURIComponent(input.order_id)}`,
      { headers: ppHeaders(auth.accessToken!) },
      'PayPal',
      'get_order',
    )

    const order = (await res.json()) as {
      id: string
      status: string
      create_time: string
      update_time: string
      purchase_units: {
        amount: { value: string; currency_code: string }
        payee: { email_address: string }
      }[]
    }

    return {
      id: order.id,
      status: order.status,
      createdAt: order.create_time,
      updatedAt: order.update_time,
      purchaseUnits: order.purchase_units?.map((pu) => ({
        amount: pu.amount?.value,
        currency: pu.amount?.currency_code,
        payeeEmail: pu.payee?.email_address,
      })),
    }
  },
})

// ─── 6. Create Refund ─────────────────────

export const paypalCreateRefund = defineTool({
  id: 'paypal_create_refund',
  name: 'Create PayPal Refund',
  description:
    'Refunds a captured payment. Omit amount for full refund. Destructive — cannot be reversed.\n\nReturns: { id, status, amount, currency }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    capture_id: z.string().describe('Captured payment ID to refund'),
    amount: z.number().positive().optional().describe('Refund amount (omit for full refund)'),
    currency: z.string().length(3).optional().describe('Currency code (default: USD)'),
    note: z.string().optional().describe('Reason for refund'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {}
    if (input.amount !== undefined) {
      body.amount = {
        value: input.amount.toFixed(2),
        currency_code: input.currency ?? 'USD',
      }
    }
    if (input.note) body.note_to_payer = input.note

    const res = await fetchWithRetry(
      `${getBase()}/v2/payments/captures/${encodeURIComponent(input.capture_id)}/refund`,
      {
        method: 'POST',
        headers: ppHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'PayPal',
      'create_refund',
    )

    const refund = (await res.json()) as {
      id: string
      status: string
      amount: { value: string; currency_code: string }
    }

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount?.value,
      currency: refund.amount?.currency_code,
    }
  },
})

// ─── 7. List Transactions ─────────────────

export const paypalListTransactions = defineTool({
  id: 'paypal_list_transactions',
  name: 'List PayPal Transactions',
  description:
    'Lists transactions in a date range via PayPal Reporting API. Max 31-day range per request.\n\nReturns: { transactions: [{ id, eventCode, amount, currency, status, updatedAt, payerEmail }], totalItems, totalPages }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    start_date: z.string().describe('Start date in ISO 8601 format (e.g. "2025-01-01T00:00:00Z")'),
    end_date: z.string().describe('End date in ISO 8601 format (e.g. "2025-01-31T23:59:59Z")'),
    page: z.number().min(1).optional().describe('Page number'),
    page_size: z.number().min(1).max(500).optional().describe('Results per page (max 500)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      start_date: input.start_date,
      end_date: input.end_date,
      fields: 'all',
    })
    if (input.page) params.set('page', String(input.page))
    if (input.page_size) params.set('page_size', String(input.page_size))

    const res = await fetchWithRetry(
      `${getBase()}/v1/reporting/transactions?${params.toString()}`,
      { headers: ppHeaders(auth.accessToken!) },
      'PayPal',
      'list_transactions',
    )

    const data = (await res.json()) as {
      transaction_details: {
        transaction_info: {
          transaction_id: string
          transaction_event_code: string
          transaction_amount: { value: string; currency_code: string }
          transaction_status: string
          transaction_updated_date: string
        }
        payer_info?: { email_address: string }
      }[]
      total_items: number
      total_pages: number
    }

    return {
      transactions: (data.transaction_details ?? []).map((t) => ({
        id: t.transaction_info.transaction_id,
        eventCode: t.transaction_info.transaction_event_code,
        amount: t.transaction_info.transaction_amount?.value,
        currency: t.transaction_info.transaction_amount?.currency_code,
        status: t.transaction_info.transaction_status,
        updatedAt: t.transaction_info.transaction_updated_date,
        payerEmail: t.payer_info?.email_address,
      })),
      totalItems: data.total_items,
      totalPages: data.total_pages,
    }
  },
})

// ─── 8. Create Product ────────────────────

export const paypalCreateProduct = defineTool({
  id: 'paypal_create_product',
  name: 'Create PayPal Product',
  description:
    'Creates a product in the PayPal catalog. Products are used for subscriptions and recurring billing.\n\nReturns: { id, name, type, createdAt }',
  provider: 'paypal',
  category: 'payments',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    name: z.string().describe('Product name'),
    type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']).describe('Product type'),
    description: z.string().optional().describe('Product description'),
    category: z.string().optional().describe('Product category (e.g. "SOFTWARE")'),
    image_url: z.string().url().optional().describe('Product image URL'),
    home_url: z.string().url().optional().describe('Product home page URL'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {
      name: input.name,
      type: input.type,
    }
    if (input.description) body.description = input.description
    if (input.category) body.category = input.category
    if (input.image_url) body.image_url = input.image_url
    if (input.home_url) body.home_url = input.home_url

    const res = await fetchWithRetry(
      `${getBase()}/v1/catalogs/products`,
      {
        method: 'POST',
        headers: ppHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'PayPal',
      'create_product',
    )

    const product = (await res.json()) as {
      id: string
      name: string
      type: string
      create_time: string
    }

    return {
      id: product.id,
      name: product.name,
      type: product.type,
      createdAt: product.create_time,
    }
  },
})

// ─── Export ───────────────────────────────

export const paypalTools = [
  paypalCreateInvoice,
  paypalListInvoices,
  paypalSendInvoice,
  paypalCreateOrder,
  paypalGetOrder,
  paypalCreateRefund,
  paypalListTransactions,
  paypalCreateProduct,
]
