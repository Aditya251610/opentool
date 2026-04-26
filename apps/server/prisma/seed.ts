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
      defaultScopes: [
        'channels:read',
        'channels:history',
        'groups:history',
        'channels:join',
        'chat:write',
        'users:read',
      ],
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
      provider: 'google_calendar',
      displayName: 'Google Calendar',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GOOGLE_CLIENT_SECRET),
      defaultScopes: ['https://www.googleapis.com/auth/calendar'],
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
      clientSecretEnc: encryptIfSet(process.env.RESEND_API_KEY),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.RESEND_API_KEY,
    },
    {
      provider: 'postgres',
      displayName: 'PostgreSQL',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.POSTGRES_CONNECTION_STRING),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.POSTGRES_CONNECTION_STRING,
    },
    {
      provider: 'gitlab',
      displayName: 'GitLab',
      authUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      revokeUrl: null,
      clientId: process.env.GITLAB_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GITLAB_CLIENT_SECRET),
      defaultScopes: ['api', 'read_user'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET),
    },
    {
      provider: 'sentry',
      displayName: 'Sentry',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.SENTRY_AUTH_TOKEN),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.SENTRY_AUTH_TOKEN,
    },
    {
      provider: 'cloudflare',
      displayName: 'Cloudflare',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.CLOUDFLARE_API_TOKEN),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.CLOUDFLARE_API_TOKEN,
    },
    {
      provider: 'paypal',
      displayName: 'PayPal',
      authUrl: 'https://www.sandbox.paypal.com/signin/authorize',
      tokenUrl: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      revokeUrl: null,
      clientId: process.env.PAYPAL_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.PAYPAL_CLIENT_SECRET),
      defaultScopes: [],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    },
    {
      provider: 'docker',
      displayName: 'Docker Hub',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.DOCKER_HUB_TOKEN),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: true, // Docker public API works without auth
    },
    {
      provider: 'telegram',
      displayName: 'Telegram',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.TELEGRAM_BOT_TOKEN),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.TELEGRAM_BOT_TOKEN,
    },
    {
      provider: 'discord',
      displayName: 'Discord',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.DISCORD_BOT_TOKEN),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.DISCORD_BOT_TOKEN,
    },
    {
      provider: 'twilio',
      displayName: 'Twilio',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.TWILIO_ACCOUNT_SID),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.TWILIO_ACCOUNT_SID,
    },
    {
      provider: 'google_drive',
      displayName: 'Google Drive',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GOOGLE_CLIENT_SECRET),
      defaultScopes: ['https://www.googleapis.com/auth/drive'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    {
      provider: 'google_meet',
      displayName: 'Google Meet',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.GOOGLE_CLIENT_SECRET),
      defaultScopes: ['https://www.googleapis.com/auth/calendar'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    {
      provider: 'jira',
      displayName: 'Jira',
      authUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      revokeUrl: null,
      clientId: process.env.ATLASSIAN_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.ATLASSIAN_CLIENT_SECRET),
      defaultScopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.ATLASSIAN_CLIENT_ID && process.env.ATLASSIAN_CLIENT_SECRET),
    },
    {
      provider: 'confluence',
      displayName: 'Confluence',
      authUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      revokeUrl: null,
      clientId: process.env.ATLASSIAN_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.ATLASSIAN_CLIENT_SECRET),
      defaultScopes: [
        'read:confluence-content.all',
        'write:confluence-content',
        'read:confluence-space.summary',
      ],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.ATLASSIAN_CLIENT_ID && process.env.ATLASSIAN_CLIENT_SECRET),
    },
    {
      provider: 'microsoft',
      displayName: 'Microsoft',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      revokeUrl: null,
      clientId: process.env.MICROSOFT_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.MICROSOFT_CLIENT_SECRET),
      defaultScopes: [
        'Mail.ReadWrite',
        'Mail.Send',
        'Calendars.ReadWrite',
        'Team.ReadBasic.All',
        'Channel.ReadBasic.All',
        'ChannelMessage.Send',
      ],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    },
    {
      provider: 'aws',
      displayName: 'AWS',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.AWS_ACCESS_KEY_ID),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.AWS_ACCESS_KEY_ID,
    },
    {
      provider: 'azure',
      displayName: 'Azure',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      revokeUrl: null,
      clientId: process.env.AZURE_CLIENT_ID ?? '',
      clientSecretEnc: encryptIfSet(process.env.AZURE_CLIENT_SECRET),
      defaultScopes: ['https://management.azure.com/.default'],
      authType: AuthType.OAUTH2,
      isEnabled: !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET),
    },
    {
      provider: 'gcp',
      displayName: 'Google Cloud',
      authUrl: '',
      tokenUrl: '',
      revokeUrl: null,
      clientId: '',
      clientSecretEnc: encryptIfSet(process.env.GCP_SERVICE_ACCOUNT_KEY),
      defaultScopes: [],
      authType: AuthType.API_KEY,
      isEnabled: !!process.env.GCP_SERVICE_ACCOUNT_KEY,
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
    console.log(
      `  ${isEnabled ? '✅' : '⏭️ '} Provider: ${p.displayName}${isEnabled ? '' : ' (no credentials — disabled)'}`,
    )
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
