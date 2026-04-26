import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

// ─── Constants & Helpers ──────────────────

const ARM_BASE = 'https://management.azure.com'

const API_VERSIONS = {
  subscriptions: '2022-12-01',
  resourceGroups: '2023-07-01',
  virtualMachines: '2023-09-01',
  aks: '2023-11-01',
  storage: '2023-05-01',
  functions: '2023-12-01',
}

function azureHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function getSubscriptionId(): string {
  return process.env.AZURE_SUBSCRIPTION_ID ?? ''
}

// ─── 1. List Subscriptions ────────────────

export const azureListSubscriptions = defineTool({
  id: 'azure_list_subscriptions',
  name: 'List Azure Subscriptions',
  description:
    'Lists Azure subscriptions via ARM API. Use a subscription ID from the result for other Azure tools.\n\nReturns: [{ subscriptionId, displayName, state }]',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  execute: async ({ auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken

    const res = await fetchWithRetry(
      `${ARM_BASE}/subscriptions?api-version=${API_VERSIONS.subscriptions}`,
      { headers: azureHeaders(token) },
      'Azure',
      'list_subscriptions',
    )

    const data = (await res.json()) as {
      value: {
        subscriptionId: string
        displayName: string
        state: string
      }[]
    }

    return data.value.map((s) => ({
      subscriptionId: s.subscriptionId,
      displayName: s.displayName,
      state: s.state,
    }))
  },
})

// ─── 2. List Resource Groups ──────────────

export const azureListResourceGroups = defineTool({
  id: 'azure_list_resource_groups',
  name: 'List Azure Resource Groups',
  description:
    'Lists resource groups in a subscription via ARM API. Falls back to AZURE_SUBSCRIPTION_ID env var.\n\nReturns: [{ name, location, tags }]',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subscription_id: z
      .string()
      .optional()
      .describe('Azure subscription ID. Falls back to AZURE_SUBSCRIPTION_ID env var'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken
    const subId = input.subscription_id || getSubscriptionId()

    const res = await fetchWithRetry(
      `${ARM_BASE}/subscriptions/${subId}/resourcegroups?api-version=${API_VERSIONS.resourceGroups}`,
      { headers: azureHeaders(token) },
      'Azure',
      'list_resource_groups',
    )

    const data = (await res.json()) as {
      value: {
        name: string
        location: string
        tags?: Record<string, string>
      }[]
    }

    return data.value.map((rg) => ({
      name: rg.name,
      location: rg.location,
      tags: rg.tags ?? {},
    }))
  },
})

// ─── 3. List Virtual Machines ─────────────

export const azureListVms = defineTool({
  id: 'azure_list_vms',
  name: 'List Azure Virtual Machines',
  description:
    'Lists VMs in a subscription or resource group via Azure Compute API.\n\nReturns: [{ name, location, vmSize, provisioningState }]',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subscription_id: z
      .string()
      .optional()
      .describe('Azure subscription ID. Falls back to AZURE_SUBSCRIPTION_ID env var'),
    resource_group: z.string().optional().describe('Resource group name to scope the VM listing'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken
    const subId = input.subscription_id || getSubscriptionId()

    const basePath = input.resource_group
      ? `${ARM_BASE}/subscriptions/${subId}/resourceGroups/${input.resource_group}/providers/Microsoft.Compute/virtualMachines`
      : `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Compute/virtualMachines`

    const res = await fetchWithRetry(
      `${basePath}?api-version=${API_VERSIONS.virtualMachines}`,
      { headers: azureHeaders(token) },
      'Azure',
      'list_vms',
    )

    const data = (await res.json()) as {
      value: {
        name: string
        location: string
        properties: {
          hardwareProfile: { vmSize: string }
          provisioningState: string
        }
      }[]
    }

    return data.value.map((vm) => ({
      name: vm.name,
      location: vm.location,
      vmSize: vm.properties.hardwareProfile.vmSize,
      provisioningState: vm.properties.provisioningState,
    }))
  },
})

// ─── 4. Get Virtual Machine ──────────────

export const azureGetVm = defineTool({
  id: 'azure_get_vm',
  name: 'Get Azure Virtual Machine',
  description:
    'Fetches VM details with instanceView (includes power state). Requires resource_group and vm_name.\n\nReturns: { name, location, vmSize, provisioningState, powerState, osType, osDiskSizeGB, computerName, adminUsername, networkInterfaces, tags }',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subscription_id: z
      .string()
      .optional()
      .describe('Azure subscription ID. Falls back to AZURE_SUBSCRIPTION_ID env var'),
    resource_group: z.string().describe('Resource group containing the VM'),
    vm_name: z.string().describe('Name of the virtual machine'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken
    const subId = input.subscription_id || getSubscriptionId()

    const res = await fetchWithRetry(
      `${ARM_BASE}/subscriptions/${subId}/resourceGroups/${input.resource_group}/providers/Microsoft.Compute/virtualMachines/${input.vm_name}?api-version=${API_VERSIONS.virtualMachines}&$expand=instanceView`,
      { headers: azureHeaders(token) },
      'Azure',
      'get_vm',
    )

    const vm = (await res.json()) as {
      name: string
      location: string
      properties: {
        hardwareProfile: { vmSize: string }
        provisioningState: string
        storageProfile: {
          osDisk: { osType: string; diskSizeGB: number }
        }
        osProfile: { computerName: string; adminUsername: string }
        networkProfile: {
          networkInterfaces: { id: string }[]
        }
        instanceView?: {
          statuses: { code: string; displayStatus: string }[]
        }
      }
      tags?: Record<string, string>
    }

    const powerState =
      vm.properties.instanceView?.statuses?.find((s) => s.code.startsWith('PowerState/'))
        ?.displayStatus ?? 'Unknown'

    return {
      name: vm.name,
      location: vm.location,
      vmSize: vm.properties.hardwareProfile.vmSize,
      provisioningState: vm.properties.provisioningState,
      powerState,
      osType: vm.properties.storageProfile.osDisk.osType,
      osDiskSizeGB: vm.properties.storageProfile.osDisk.diskSizeGB,
      computerName: vm.properties.osProfile.computerName,
      adminUsername: vm.properties.osProfile.adminUsername,
      networkInterfaces: vm.properties.networkProfile.networkInterfaces.map((nic) => nic.id),
      tags: vm.tags ?? {},
    }
  },
})

// ─── 5. List AKS Clusters ────────────────

export const azureListAksClusters = defineTool({
  id: 'azure_list_aks_clusters',
  name: 'List Azure AKS Clusters',
  description:
    'Lists AKS managed clusters in a subscription via ARM API.\n\nReturns: [{ name, location, kubernetesVersion, provisioningState, nodeCount }]',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subscription_id: z
      .string()
      .optional()
      .describe('Azure subscription ID. Falls back to AZURE_SUBSCRIPTION_ID env var'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken
    const subId = input.subscription_id || getSubscriptionId()

    const res = await fetchWithRetry(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.ContainerService/managedClusters?api-version=${API_VERSIONS.aks}`,
      { headers: azureHeaders(token) },
      'Azure',
      'list_aks_clusters',
    )

    const data = (await res.json()) as {
      value: {
        name: string
        location: string
        properties: {
          kubernetesVersion: string
          provisioningState: string
          agentPoolProfiles: { count: number }[]
        }
      }[]
    }

    return data.value.map((c) => ({
      name: c.name,
      location: c.location,
      kubernetesVersion: c.properties.kubernetesVersion,
      provisioningState: c.properties.provisioningState,
      nodeCount: c.properties.agentPoolProfiles.reduce((sum, pool) => sum + pool.count, 0),
    }))
  },
})

// ─── 6. List Storage Accounts ─────────────

export const azureListStorageAccounts = defineTool({
  id: 'azure_list_storage_accounts',
  name: 'List Azure Storage Accounts',
  description:
    'Lists Azure Storage accounts in a subscription.\n\nReturns: [{ name, location, sku, kind, provisioningState }]',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subscription_id: z
      .string()
      .optional()
      .describe('Azure subscription ID. Falls back to AZURE_SUBSCRIPTION_ID env var'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken
    const subId = input.subscription_id || getSubscriptionId()

    const res = await fetchWithRetry(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Storage/storageAccounts?api-version=${API_VERSIONS.storage}`,
      { headers: azureHeaders(token) },
      'Azure',
      'list_storage_accounts',
    )

    const data = (await res.json()) as {
      value: {
        name: string
        location: string
        sku: { name: string; tier: string }
        kind: string
        properties: { provisioningState: string }
      }[]
    }

    return data.value.map((sa) => ({
      name: sa.name,
      location: sa.location,
      sku: sa.sku.name,
      kind: sa.kind,
      provisioningState: sa.properties.provisioningState,
    }))
  },
})

// ─── 7. List Functions ────────────────────

export const azureListFunctions = defineTool({
  id: 'azure_list_functions',
  name: 'List Azure Functions',
  description:
    'Lists Azure Function Apps by filtering Microsoft.Web/sites where kind contains "functionapp".\n\nReturns: [{ name, location, state, defaultHostName, kind }]',
  provider: 'azure',
  category: 'infrastructure',
  authType: 'oauth2',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subscription_id: z
      .string()
      .optional()
      .describe('Azure subscription ID. Falls back to AZURE_SUBSCRIPTION_ID env var'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Azure account first')
    const token = auth.accessToken
    const subId = input.subscription_id || getSubscriptionId()

    const res = await fetchWithRetry(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Web/sites?api-version=${API_VERSIONS.functions}`,
      { headers: azureHeaders(token) },
      'Azure',
      'list_functions',
    )

    const data = (await res.json()) as {
      value: {
        name: string
        location: string
        kind: string
        properties: {
          state: string
          defaultHostName: string
        }
      }[]
    }

    return data.value
      .filter((site) => site.kind.toLowerCase().includes('functionapp'))
      .map((fn) => ({
        name: fn.name,
        location: fn.location,
        state: fn.properties.state,
        defaultHostName: fn.properties.defaultHostName,
        kind: fn.kind,
      }))
  },
})

// ─── Export all tools ─────────────────────

export const azureTools = [
  azureListSubscriptions,
  azureListResourceGroups,
  azureListVms,
  azureGetVm,
  azureListAksClusters,
  azureListStorageAccounts,
  azureListFunctions,
]
