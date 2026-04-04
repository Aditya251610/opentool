# Contributing a Tool

> Add a new provider in ~100 lines of TypeScript. No PhD required.

OpenTool's tool system is designed to be dead simple. Each tool is a self-contained function with a schema. If you can call an API, you can write a tool.

---

## Anatomy of a Tool

Every tool has four parts:

1. **ID** — Unique identifier like `github.create_issue`
2. **Schema** — Zod schema defining the input parameters
3. **Execute** — Async function that does the actual work
4. **Metadata** — Name, description, auth type, required scopes

Here's a real example:

```typescript
import { defineTool } from '@opentool/tool-schema'
import { z } from 'zod'

export const createIssue = defineTool({
  id: 'github.create_issue',
  name: 'Create GitHub Issue',
  description: 'Create a new issue in a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],

  inputSchema: z.object({
    owner: z.string().describe('Repository owner (username or org)'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Issue title'),
    body: z.string().optional().describe('Issue body (Markdown)'),
    labels: z.array(z.string()).optional().describe('Labels to apply'),
  }),

  execute: async ({ input, auth }) => {
    const response = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          labels: input.labels,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    return await response.json()
  },
})
```

That's it. The `defineTool` function handles:
- Converting the Zod schema to JSON Schema (for MCP)
- Type-safe input validation
- Passing the auth context with the decrypted access token

---

## Step-by-Step: Adding a New Provider

Let's say you want to add **Jira** as a provider.

### 1. Create the tool files

```bash
mkdir -p apps/server/tools/jira
```

Create `apps/server/tools/jira/index.ts`:

```typescript
import { defineTool } from '@opentool/tool-schema'
import { z } from 'zod'

export const createJiraIssue = defineTool({
  id: 'jira.create_issue',
  name: 'Create Jira Issue',
  description: 'Create a new issue in Jira',
  provider: 'jira',
  authType: 'oauth2',
  requiredScopes: ['read:jira-work', 'write:jira-work'],

  inputSchema: z.object({
    projectKey: z.string().describe('Jira project key (e.g., PROJ)'),
    summary: z.string().describe('Issue summary'),
    description: z.string().optional().describe('Issue description'),
    issueType: z.enum(['Bug', 'Task', 'Story']).default('Task'),
  }),

  execute: async ({ input, auth }) => {
    const response = await fetch(
      'https://your-domain.atlassian.net/rest/api/3/issue',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            project: { key: input.projectKey },
            summary: input.summary,
            description: input.description,
            issuetype: { name: input.issueType },
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Jira API error: ${response.status}`)
    return await response.json()
  },
})

// Export all tools for this provider
export const jiraTools = [createJiraIssue]
```

### 2. Register in the tool registry

Edit `apps/server/src/registry/index.ts`:

```typescript
import { jiraTools } from '../../tools/jira'

const allTools = [
  ...githubTools,
  ...notionTools,
  // ... existing tools
  ...jiraTools,  // ← add this
]
```

### 3. Add the provider to the seed

Edit `apps/server/prisma/seed.ts` — add to the `providers` array:

```typescript
{
  provider: 'jira',
  displayName: 'Jira',
  authUrl: 'https://auth.atlassian.com/authorize',
  tokenUrl: 'https://auth.atlassian.com/oauth/token',
  revokeUrl: null,
  clientId: process.env.JIRA_CLIENT_ID ?? '',
  clientSecretEnc: encryptIfSet(process.env.JIRA_CLIENT_SECRET),
  defaultScopes: ['read:jira-work', 'write:jira-work', 'offline_access'],
  authType: AuthType.OAUTH2,
  isEnabled: !!(process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET),
},
```

### 4. Add to `.env.example`

```bash
# Jira OAuth
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
```

### 5. Add to the dashboard provider list

Edit `apps/dashboard/lib/providers.ts`:

```typescript
jira: {
  name: 'Jira',
  Icon: JiraIcon,  // Create or import an icon component
  color: '#0052CC',
  bg: '#0d1a33',
  description: 'Issues, projects, workflows',
  tools: ['create_issue'],
  authType: 'oauth2',
},
```

### 6. Test

```bash
# Set credentials
echo 'JIRA_CLIENT_ID=xxx' >> apps/server/.env
echo 'JIRA_CLIENT_SECRET=yyy' >> apps/server/.env

# Re-seed
cd apps/server && npx tsx prisma/seed.ts

# Start
pnpm dev

# Connect via dashboard and test
```

---

## The `defineTool` API

```typescript
defineTool({
  // Required
  id: string,              // Unique ID: "provider.action_name"
  name: string,            // Human-readable name
  description: string,     // What this tool does (shown to AI agents)
  provider: string,        // Provider key (matches seed provider)
  authType: 'oauth2' | 'api_key' | 'none',
  inputSchema: ZodSchema,  // Zod object schema for inputs

  // Optional
  requiredScopes?: string[], // OAuth scopes needed for this tool

  // The actual implementation
  execute: async ({ input, auth }) => {
    // input: Validated and typed from your Zod schema
    // auth.accessToken: Decrypted OAuth token (for oauth2)
    // auth.apiKey: API key (for api_key auth type)
    // auth.userId: The user's OpenTool ID

    // Return anything — it gets JSON.stringify'd for MCP
    return result
  },
})
```

---

## Tips

- **Keep tools focused.** One action per tool. `github.create_issue` not `github.do_everything`.
- **Describe inputs well.** The `.describe()` on Zod fields becomes the description AI agents see. Be specific.
- **Handle errors.** Throw descriptive errors — they get logged to the audit table and returned to the agent.
- **Don't hardcode URLs.** If a provider has per-tenant URLs (like Jira), make it an input parameter.
- **Test with curl.** Hit the `/mcp` endpoint directly to test your tool before connecting an agent.

---

## Submitting a PR

1. Fork the repo
2. Add your tool following the steps above
3. Test locally (seed, connect, execute)
4. Open a PR to `main`

That's the whole process. No contributor license agreements, no 12-step review process. Just code that works.
