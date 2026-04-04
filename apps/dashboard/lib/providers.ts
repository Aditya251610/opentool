import {
  GitHubIcon, NotionIcon, SlackIcon, LinearIcon, GmailIcon,
  GoogleCalendarIcon, StripeIcon, VercelIcon, ResendIcon, PostgreSQLIcon,
} from '@/components/icons'
import type { ComponentType, CSSProperties } from 'react'

export interface ProviderMeta {
  name: string
  Icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>
  color: string
  bg: string
  description: string
  tools: string[]
  authType: 'oauth2' | 'api_key' | 'none'
}

export const PROVIDERS: Record<string, ProviderMeta> = {
  github: {
    name: 'GitHub',
    Icon: GitHubIcon,
    color: '#f0f6fc',
    bg: '#161b22',
    description: 'Create issues, PRs, manage repos',
    tools: ['create_issue', 'list_issues', 'create_pr', 'comment_on_issue', 'get_repo'],
    authType: 'oauth2',
  },
  notion: {
    name: 'Notion',
    Icon: NotionIcon,
    color: '#ffffff',
    bg: '#191919',
    description: 'Pages, databases, blocks',
    tools: ['create_page', 'query_database', 'update_block'],
    authType: 'oauth2',
  },
  slack: {
    name: 'Slack',
    Icon: SlackIcon,
    color: '#e8d44d',
    bg: '#1a1320',
    description: 'Send messages, read channels',
    tools: ['send_message', 'read_channel'],
    authType: 'oauth2',
  },
  linear: {
    name: 'Linear',
    Icon: LinearIcon,
    color: '#5e6ad2',
    bg: '#14142b',
    description: 'Issues, status updates',
    tools: ['create_issue', 'update_status'],
    authType: 'oauth2',
  },
  gmail: {
    name: 'Gmail',
    Icon: GmailIcon,
    color: '#ea4335',
    bg: '#1c1210',
    description: 'Send, read, search emails',
    tools: ['send_email', 'read_email', 'search_emails'],
    authType: 'oauth2',
  },
  gcal: {
    name: 'Google Calendar',
    Icon: GoogleCalendarIcon,
    color: '#4285f4',
    bg: '#101828',
    description: 'Events, scheduling',
    tools: ['create_event', 'list_events'],
    authType: 'oauth2',
  },
  stripe: {
    name: 'Stripe',
    Icon: StripeIcon,
    color: '#635bff',
    bg: '#13112b',
    description: 'Payments, customers',
    tools: ['create_payment_link', 'list_customers'],
    authType: 'api_key',
  },
  vercel: {
    name: 'Vercel',
    Icon: VercelIcon,
    color: '#ffffff',
    bg: '#111111',
    description: 'Deployments, status',
    tools: ['list_deployments', 'get_deployment'],
    authType: 'oauth2',
  },
  resend: {
    name: 'Resend',
    Icon: ResendIcon,
    color: '#00d4aa',
    bg: '#0a1a17',
    description: 'Transactional emails',
    tools: ['send_email'],
    authType: 'api_key',
  },
  postgres: {
    name: 'PostgreSQL',
    Icon: PostgreSQLIcon,
    color: '#336791',
    bg: '#0d1520',
    description: 'Execute SQL queries',
    tools: ['execute_query'],
    authType: 'none',
  },
}
