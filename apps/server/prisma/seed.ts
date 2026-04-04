import { PrismaClient, AuthType } from '@prisma/client'
import { getAllTools } from '../src/registry'
import { encrypt } from '../src/auth/encryption'

const prisma = new PrismaClient()

function encryptIfSet(value: string | undefined): string {
  if (!value) return ''
  return encrypt(value)
}

async function main() {
  console.log('🌱 Seeding database...')

  // ─────────────────────────────────────────
  // OAUTH PROVIDERS
  // ─────────────────────────────────────────

  const providers = [
    {
      provider: 'github',
      displayName: 'GitHub',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      revokeUrl: null,
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GITHUB_CLIENT_SECRET),
      defaultScopes: ['repo', 'read:user', 'user:email'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    {
      provider: 'notion',
      displayName: 'Notion',
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      revokeUrl: null,
      clientId: process.env.NOTION_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.NOTION_CLIENT_SECRET),
      defaultScopes: [],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET),
    },
    {
      provider: 'slack',
      displayName: 'Slack',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      revokeUrl: 'https://slack.com/api/auth.revoke',
      clientId: process.env.SLACK_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.SLACK_CLIENT_SECRET),
      defaultScopes: ['channels:read', 'chat:write', 'users:read'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
    },
    {
      provider: 'linear',
      displayName: 'Linear',
      authUrl: 'https://linear.app/oauth/authorize',
      tokenUrl: 'https://api.linear.app/oauth/token',
      revokeUrl: 'https://api.linear.app/oauth/revoke',
      clientId: process.env.LINEAR_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.LINEAR_CLIENT_SECRET),
      defaultScopes: ['read', 'write'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.LINEAR_CLIENT_ID && process.env.LINEAR_CLIENT_SECRET),
    },
    {
      provider: 'gmail',
      displayName: 'Gmail',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GOOGLE_CLIENT_SECRET),
      defaultScopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    {
      provider: 'gcal',
      displayName: 'Google Calendar',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GOOGLE_CLIENT_SECRET),
      defaultScopes: [
        'https://www.googleapis.com/auth/calendar',
      ],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    {
      provider: 'stripe',
      displayName: 'Stripe',
      authUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
      clientId: process.env.STRIPE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.STRIPE_CLIENT_SECRET),
      defaultScopes: ['read_write'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.STRIPE_CLIENT_ID && process.env.STRIPE_CLIENT_SECRET),
    },
    {
      provider: 'vercel',
      displayName: 'Vercel',
      authUrl: 'https://vercel.com/integrations/opentool/new',
      tokenUrl: 'https://api.vercel.com/v2/oauth/access_token',
      revokeUrl: null,
      clientId: process.env.VERCEL_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.VERCEL_CLIENT_SECRET),
      defaultScopes: [],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET),
    },
    {
      provider: 'resend',
      displayName: 'Resend',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: '',
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: false,
    },
    {
      provider: 'postgres',
      displayName: 'PostgreSQL',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: '',
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: false,
    },
  ]

  for (const p of providers) {
    const { isEnabled, ...data } = p
    await prisma.oAuthProvider.upsert({
      where: { provider: p.provider },
      update: {
        displayName: p.displayName,
        authUrl: p.authUrl,
        tokenUrl: p.tokenUrl,
        revokeUrl: p.revokeUrl,
        defaultScopes: p.defaultScopes,
        authType: p.authType,
        clientId: p.clientId,
        clientSecretEnc: p.clientSecretEnc,
        isEnabled,
      },
      create: { ...data, isEnabled },
    })
    console.log(`  ${isEnabled ? '✅' : '⏭️ '} Provider: ${p.displayName}${isEnabled ? '' : ' (no credentials — disabled)'}`)
  }

  // ─────────────────────────────────────────
  // TOOL DEFINITIONS
  // Sync from in-memory registry into DB
  // ─────────────────────────────────────────

  const tools = getAllTools()

  for (const tool of tools) {
    const provider = await prisma.oAuthProvider.findUnique({
      where: { provider: tool.provider },
    })

    if (!provider) {
      console.warn(`  ⚠ Provider not found for tool: ${tool.id}, skipping`)
      continue
    }

    await prisma.toolDefinition.upsert({
      where: { toolId: tool.id },
      update: {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputJsonSchema,
        requiredScopes: tool.requiredScopes,
        authType: provider.authType,
        isEnabled: true,
      },
      create: {
        providerId: provider.id,
        toolId: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputJsonSchema,
        requiredScopes: tool.requiredScopes,
        authType: provider.authType,
        isEnabled: true,
      },
    })
    console.log(`  ✓ Tool: ${tool.id}`)
  }

  console.log('✅ Seed complete')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })