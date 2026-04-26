import { fetchWithRetry } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3'

function driveHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

const FILE_FIELDS = 'id,name,mimeType,size,modifiedTime,webViewLink,parents'

export const gdriveListFiles = defineTool({
  id: 'google_drive_list_files',
  name: 'List Google Drive Files',
  description:
    'Lists files in Google Drive with optional query filter. Uses the Drive query syntax.\n\nReturns: { files: [{ id, name, mimeType, size, modifiedTime, webViewLink, parents }], nextPageToken, count }\n\nExamples:\n  - All files: query omitted\n  - Folders only: query="mimeType=\'application/vnd.google-apps.folder\'"\n  - By name: query="name contains \'report\'"',
  provider: 'google_drive',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe('Drive query string (e.g. "mimeType=\'application/vnd.google-apps.folder\'")'),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of files to return (default 20, max 100)'),
    page_token: z.string().optional().describe('Token for fetching the next page of results'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      pageSize: String(input.page_size ?? 20),
      fields: `nextPageToken,files(${FILE_FIELDS})`,
    })
    if (input.query) params.set('q', input.query)
    if (input.page_token) params.set('pageToken', input.page_token)

    const res = await fetchWithRetry(
      `${DRIVE_BASE}/files?${params}`,
      { headers: driveHeaders(auth.accessToken!) },
      'GoogleDrive',
      'list_files',
    )

    const data = (await res.json()) as {
      files: Array<{
        id: string
        name: string
        mimeType: string
        size?: string
        modifiedTime: string
        webViewLink?: string
        parents?: string[]
      }>
      nextPageToken?: string
    }

    return {
      files: data.files ?? [],
      nextPageToken: data.nextPageToken,
      count: data.files?.length ?? 0,
    }
  },
})

export const gdriveSearchFiles = defineTool({
  id: 'google_drive_search_files',
  name: 'Search Google Drive Files',
  description:
    'Searches for files in Google Drive by keyword using full-text search.\n\nReturns: { files: [{ id, name, mimeType, size, modifiedTime, webViewLink, parents }], count }',
  provider: 'google_drive',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    keyword: z.string().describe('Search keyword for full-text file search'),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of results to return (default 20, max 100)'),
  }),
  execute: async ({ input, auth }) => {
    const query = `fullText contains '${input.keyword.replace(/'/g, "\\'")}'`
    const params = new URLSearchParams({
      q: query,
      pageSize: String(input.page_size ?? 20),
      fields: `files(${FILE_FIELDS})`,
    })

    const res = await fetchWithRetry(
      `${DRIVE_BASE}/files?${params}`,
      { headers: driveHeaders(auth.accessToken!) },
      'GoogleDrive',
      'search_files',
    )

    const data = (await res.json()) as {
      files: Array<{
        id: string
        name: string
        mimeType: string
        size?: string
        modifiedTime: string
        webViewLink?: string
        parents?: string[]
      }>
    }

    return {
      files: data.files ?? [],
      count: data.files?.length ?? 0,
    }
  },
})

export const gdriveGetFile = defineTool({
  id: 'google_drive_get_file',
  name: 'Get Google Drive File',
  description:
    'Gets metadata for a specific file in Google Drive by file ID.\n\nReturns: { id, name, mimeType, size, modifiedTime, webViewLink, parents, description, shared }',
  provider: 'google_drive',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    file_id: z.string().describe('The ID of the file to retrieve'),
  }),
  execute: async ({ input, auth }) => {
    const fields = `${FILE_FIELDS},description,shared`
    const params = new URLSearchParams({ fields })

    const res = await fetchWithRetry(
      `${DRIVE_BASE}/files/${encodeURIComponent(input.file_id)}?${params}`,
      { headers: driveHeaders(auth.accessToken!) },
      'GoogleDrive',
      'get_file',
    )

    const file = (await res.json()) as {
      id: string
      name: string
      mimeType: string
      size?: string
      modifiedTime: string
      webViewLink?: string
      parents?: string[]
      description?: string
      shared?: boolean
    }

    return file
  },
})

export const gdriveCreateFile = defineTool({
  id: 'google_drive_create_file',
  name: 'Create Google Drive File',
  description:
    'Creates a new file (metadata only) in Google Drive. Use this to create folders or empty files.\n\nReturns: { id, name, mimeType, webViewLink }',
  provider: 'google_drive',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/drive.file'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    name: z.string().describe('Name of the file or folder to create'),
    mime_type: z
      .string()
      .optional()
      .describe(
        'MIME type (e.g. "application/vnd.google-apps.folder" for a folder, "application/vnd.google-apps.document" for a Google Doc)',
      ),
    parent_folder_id: z.string().optional().describe('ID of the parent folder (defaults to root)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = { name: input.name }
    if (input.mime_type) body.mimeType = input.mime_type
    if (input.parent_folder_id) body.parents = [input.parent_folder_id]

    const res = await fetchWithRetry(
      `${DRIVE_BASE}/files?fields=id,name,mimeType,webViewLink`,
      {
        method: 'POST',
        headers: driveHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'GoogleDrive',
      'create_file',
    )

    const file = (await res.json()) as {
      id: string
      name: string
      mimeType: string
      webViewLink?: string
    }

    return file
  },
})

export const gdriveShareFile = defineTool({
  id: 'google_drive_share_file',
  name: 'Share Google Drive File',
  description:
    'Shares a Google Drive file with a user by creating a permission.\n\nReturns: { permissionId, role, email }',
  provider: 'google_drive',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/drive.file'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    file_id: z.string().describe('The ID of the file to share'),
    email: z.string().email().describe('Email address of the user to share with'),
    role: z.enum(['reader', 'writer', 'commenter']).describe('Permission role to grant'),
  }),
  execute: async ({ input, auth }) => {
    const body = {
      type: 'user',
      role: input.role,
      emailAddress: input.email,
    }

    const res = await fetchWithRetry(
      `${DRIVE_BASE}/files/${encodeURIComponent(input.file_id)}/permissions`,
      {
        method: 'POST',
        headers: driveHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      },
      'GoogleDrive',
      'share_file',
    )

    const permission = (await res.json()) as {
      id: string
      role: string
      type: string
    }

    return {
      permissionId: permission.id,
      role: permission.role,
      email: input.email,
    }
  },
})

export const gdriveDeleteFile = defineTool({
  id: 'google_drive_delete_file',
  name: 'Delete Google Drive File',
  description:
    'Moves a Google Drive file to the trash. This does not permanently delete the file.\n\nReturns: { id, trashed }',
  provider: 'google_drive',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/drive.file'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    file_id: z.string().describe('The ID of the file to move to trash'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${DRIVE_BASE}/files/${encodeURIComponent(input.file_id)}?fields=id,trashed`,
      {
        method: 'PATCH',
        headers: driveHeaders(auth.accessToken!),
        body: JSON.stringify({ trashed: true }),
      },
      'GoogleDrive',
      'delete_file',
    )

    const file = (await res.json()) as {
      id: string
      trashed: boolean
    }

    return { id: file.id, trashed: file.trashed }
  },
})

export const gdriveTools = [
  gdriveListFiles,
  gdriveSearchFiles,
  gdriveGetFile,
  gdriveCreateFile,
  gdriveShareFile,
  gdriveDeleteFile,
]
