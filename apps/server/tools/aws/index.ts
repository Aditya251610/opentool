import { createHmac, createHash } from 'node:crypto'
import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

// ─── AWS Config & Signature V4 ────────────

function getAwsCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set')
  }
  return { accessKeyId, secretAccessKey }
}

function getRegion(): string {
  return process.env.AWS_REGION ?? 'us-east-1'
}

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

interface SignV4Opts {
  method: string
  url: string
  service: string
  body?: string
  extraHeaders?: Record<string, string>
}

function signV4Request(opts: SignV4Opts): { url: string; headers: Record<string, string> } {
  const { method, service, body = '' } = opts
  const { accessKeyId, secretAccessKey } = getAwsCredentials()
  const region = getRegion()

  const parsed = new URL(opts.url)
  const host = parsed.host
  const path = parsed.pathname
  const queryString = parsed.searchParams.toString()

  const now = new Date()
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = sha256(body)

  const headersToSign: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...(opts.extraHeaders ?? {}),
  }

  const signedHeaderKeys = Object.keys(headersToSign).sort()
  const signedHeadersStr = signedHeaderKeys.join(';')
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headersToSign[k]}\n`).join('')

  const canonicalRequest = [
    method,
    path,
    queryString,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n')

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = hmacSha256(signingKey, stringToSign).toString('hex')

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeadersStr}, Signature=${signature}`

  return {
    url: opts.url,
    headers: {
      ...headersToSign,
      Authorization: authorization,
      ...(body
        ? {
            'Content-Type':
              opts.extraHeaders?.['content-type'] ?? 'application/x-www-form-urlencoded',
          }
        : {}),
    },
  }
}

// ─── XML helpers (regex-based, no parser dep) ─

function xmlTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? m[1] : null
}

function xmlTagAll(xml: string, tag: string): string[] {
  const results: string[] = []
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) results.push(m[1])
  return results
}

// ─── EC2 query helper ─────────────────────

async function ec2Query(params: Record<string, string>): Promise<string> {
  const region = getRegion()
  const qs = new URLSearchParams({ ...params, Version: '2016-11-15' })
  const url = `https://ec2.${region}.amazonaws.com/?${qs.toString()}`

  const signed = signV4Request({ method: 'GET', url, service: 'ec2' })
  const res = await fetchWithRetry(
    signed.url,
    { method: 'GET', headers: signed.headers },
    'aws',
    `ec2:${params.Action}`,
  )
  return res.text()
}

// ─── 1. List EC2 Instances ────────────────

export const awsListEc2Instances = defineTool({
  id: 'aws_list_ec2_instances',
  name: 'List EC2 Instances',
  description:
    'Lists EC2 instances via DescribeInstances API in the configured AWS_REGION. Uses AWS Signature V4 auth.\n\nReturns: [{ instanceId, instanceType, state, publicIp, privateIp, launchTime, name }]',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    state_filter: z
      .enum(['running', 'stopped', 'terminated', 'pending'])
      .optional()
      .describe('Filter instances by state'),
  }),
  execute: async ({ input }) => {
    const params: Record<string, string> = { Action: 'DescribeInstances' }
    if (input.state_filter) {
      params['Filter.1.Name'] = 'instance-state-name'
      params['Filter.1.Value.1'] = input.state_filter
    }

    const xml = await ec2Query(params)
    const items = xmlTagAll(xml, 'instancesSet').flatMap((set) => xmlTagAll(set, 'item'))

    return items.map((item) => {
      const tags = xmlTagAll(item, 'item')
      const nameTag = tags.find((t) => xmlTag(t, 'key') === 'Name')
      return {
        instanceId: xmlTag(item, 'instanceId') ?? null,
        instanceType: xmlTag(item, 'instanceType') ?? null,
        state: xmlTag(xmlTag(item, 'instanceState') ?? '', 'name') ?? null,
        publicIp: xmlTag(item, 'ipAddress') ?? null,
        privateIp: xmlTag(item, 'privateIpAddress') ?? null,
        launchTime: xmlTag(item, 'launchTime') ?? null,
        name: nameTag ? xmlTag(nameTag, 'value') : null,
      }
    })
  },
})

// ─── 2. Describe EC2 Instance ─────────────

export const awsDescribeEc2Instance = defineTool({
  id: 'aws_describe_ec2_instance',
  name: 'Describe EC2 Instance',
  description:
    'Fetches detailed EC2 instance info including security groups, tags, and networking.\n\nReturns: { instanceId, instanceType, state, publicIp, privateIp, launchTime, availabilityZone, vpcId, subnetId, architecture, securityGroups, tags }',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    instance_id: z.string().describe('The EC2 instance ID (e.g. "i-0abcdef1234567890")'),
  }),
  execute: async ({ input }) => {
    const xml = await ec2Query({
      Action: 'DescribeInstances',
      'InstanceId.1': input.instance_id,
    })

    const items = xmlTagAll(xml, 'instancesSet').flatMap((set) => xmlTagAll(set, 'item'))

    const instance = items[0]
    if (!instance) {
      throw new Error(`Instance ${input.instance_id} not found`)
    }

    const sgItems = xmlTagAll(xmlTag(instance, 'groupSet') ?? '', 'item')
    const tagItems = xmlTagAll(xmlTag(instance, 'tagSet') ?? '', 'item')

    return {
      instanceId: xmlTag(instance, 'instanceId') ?? null,
      instanceType: xmlTag(instance, 'instanceType') ?? null,
      state: xmlTag(xmlTag(instance, 'instanceState') ?? '', 'name') ?? null,
      publicIp: xmlTag(instance, 'ipAddress') ?? null,
      privateIp: xmlTag(instance, 'privateIpAddress') ?? null,
      launchTime: xmlTag(instance, 'launchTime') ?? null,
      availabilityZone: xmlTag(xmlTag(instance, 'placement') ?? '', 'availabilityZone') ?? null,
      vpcId: xmlTag(instance, 'vpcId') ?? null,
      subnetId: xmlTag(instance, 'subnetId') ?? null,
      architecture: xmlTag(instance, 'architecture') ?? null,
      platform: xmlTag(instance, 'platformDetails') ?? null,
      securityGroups: sgItems.map((sg) => ({
        id: xmlTag(sg, 'groupId') ?? null,
        name: xmlTag(sg, 'groupName') ?? null,
      })),
      tags: tagItems.map((t) => ({
        key: xmlTag(t, 'key') ?? null,
        value: xmlTag(t, 'value') ?? null,
      })),
    }
  },
})

// ─── 3. List S3 Buckets ───────────────────

export const awsListS3Buckets = defineTool({
  id: 'aws_list_s3_buckets',
  name: 'List S3 Buckets',
  description:
    'Lists all S3 buckets in the AWS account via ListBuckets API.\n\nReturns: [{ name, creationDate }]',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  execute: async () => {
    const region = getRegion()
    const url = `https://s3.${region}.amazonaws.com/`
    const signed = signV4Request({ method: 'GET', url, service: 's3' })
    const res = await fetchWithRetry(
      signed.url,
      { method: 'GET', headers: signed.headers },
      'aws',
      's3:ListBuckets',
    )
    const xml = await res.text()

    return xmlTagAll(xml, 'Bucket').map((b) => ({
      name: xmlTag(b, 'Name') ?? null,
      creationDate: xmlTag(b, 'CreationDate') ?? null,
    }))
  },
})

// ─── 4. List S3 Objects ───────────────────

export const awsListS3Objects = defineTool({
  id: 'aws_list_s3_objects',
  name: 'List S3 Objects',
  description:
    'Lists objects in an S3 bucket via ListObjectsV2 API. Supports prefix filtering.\n\nReturns: { bucket, keyCount, isTruncated, objects: [{ key, size, lastModified, storageClass }] }',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    bucket: z.string().describe('S3 bucket name'),
    prefix: z.string().optional().describe('Key prefix to filter objects (e.g. "logs/2024/")'),
    max_keys: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of objects to return (1-1000, default 100)'),
  }),
  execute: async ({ input }) => {
    const region = getRegion()
    const qs = new URLSearchParams({ 'list-type': '2', 'max-keys': String(input.max_keys ?? 100) })
    if (input.prefix) qs.set('prefix', input.prefix)

    const url = `https://${input.bucket}.s3.${region}.amazonaws.com/?${qs.toString()}`
    const signed = signV4Request({ method: 'GET', url, service: 's3' })
    const res = await fetchWithRetry(
      signed.url,
      { method: 'GET', headers: signed.headers },
      'aws',
      's3:ListObjectsV2',
    )
    const xml = await res.text()

    const objects = xmlTagAll(xml, 'Contents').map((c) => ({
      key: xmlTag(c, 'Key') ?? null,
      size: xmlTag(c, 'Size') ? Number(xmlTag(c, 'Size')) : null,
      lastModified: xmlTag(c, 'LastModified') ?? null,
      storageClass: xmlTag(c, 'StorageClass') ?? null,
    }))

    return {
      bucket: input.bucket,
      keyCount: objects.length,
      isTruncated: xmlTag(xml, 'IsTruncated') === 'true',
      objects,
    }
  },
})

// ─── 5. List Lambda Functions ─────────────

export const awsListLambdaFunctions = defineTool({
  id: 'aws_list_lambda_functions',
  name: 'List Lambda Functions',
  description:
    'Lists Lambda functions in the configured AWS_REGION.\n\nReturns: [{ functionName, runtime, handler, memorySize, timeout, lastModified, codeSize, description }]',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    max_items: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of functions to return (1-50, default 50)'),
  }),
  execute: async ({ input }) => {
    const region = getRegion()
    const qs = new URLSearchParams({ MaxItems: String(input.max_items ?? 50) })
    const url = `https://lambda.${region}.amazonaws.com/2015-03-31/functions?${qs.toString()}`
    const signed = signV4Request({ method: 'GET', url, service: 'lambda' })
    const res = await fetchWithRetry(
      signed.url,
      { method: 'GET', headers: signed.headers },
      'aws',
      'lambda:ListFunctions',
    )
    const data = (await res.json()) as { Functions?: any[] }

    return (data.Functions ?? []).map((f: any) => ({
      functionName: f.FunctionName ?? null,
      runtime: f.Runtime ?? null,
      handler: f.Handler ?? null,
      memorySize: f.MemorySize ?? null,
      timeout: f.Timeout ?? null,
      lastModified: f.LastModified ?? null,
      codeSize: f.CodeSize ?? null,
      description: f.Description ?? null,
    }))
  },
})

// ─── 6. Invoke Lambda Function ────────────

export const awsInvokeLambda = defineTool({
  id: 'aws_invoke_lambda',
  name: 'Invoke Lambda Function',
  description:
    'Invokes a Lambda function synchronously (RequestResponse). The payload param should be a JSON string. Potentially destructive — the function may have side effects.\n\nReturns: { statusCode, functionError, executedVersion, payload }',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    function_name: z.string().describe('Lambda function name, ARN, or partial ARN'),
    payload: z.string().optional().describe('JSON string payload to send to the function'),
  }),
  execute: async ({ input }) => {
    const region = getRegion()
    const fnName = encodeURIComponent(input.function_name)
    const url = `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${fnName}/invocations`
    const body = input.payload ?? ''

    const signed = signV4Request({
      method: 'POST',
      url,
      service: 'lambda',
      body,
      extraHeaders: {
        'x-amz-invocation-type': 'RequestResponse',
        'content-type': 'application/json',
      },
    })

    const res = await fetchWithRetry(
      signed.url,
      { method: 'POST', headers: signed.headers, body },
      'aws',
      'lambda:Invoke',
    )
    const text = await res.text()

    return {
      statusCode: res.status,
      functionError: res.headers.get('x-amz-function-error') ?? null,
      executedVersion: res.headers.get('x-amz-executed-version') ?? null,
      payload: text ? JSON.parse(text) : null,
    }
  },
})

// ─── 7. List EKS Clusters ────────────────

export const awsListEksClusters = defineTool({
  id: 'aws_list_eks_clusters',
  name: 'List EKS Clusters',
  description:
    'Lists EKS clusters with details (version, status, endpoint) in the configured AWS_REGION. Makes N+1 API calls (one list + one describe per cluster).\n\nReturns: [{ name, status, version, endpoint, platformVersion, createdAt }]',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  execute: async () => {
    const region = getRegion()
    const listUrl = `https://eks.${region}.amazonaws.com/clusters`
    const signed = signV4Request({ method: 'GET', url: listUrl, service: 'eks' })
    const res = await fetchWithRetry(
      signed.url,
      { method: 'GET', headers: signed.headers },
      'aws',
      'eks:ListClusters',
    )
    const data = (await res.json()) as { clusters?: string[] }
    const clusterNames: string[] = data.clusters ?? []

    const clusters = await Promise.all(
      clusterNames.map(async (name: string) => {
        try {
          const descUrl = `https://eks.${region}.amazonaws.com/clusters/${encodeURIComponent(name)}`
          const descSigned = signV4Request({ method: 'GET', url: descUrl, service: 'eks' })
          const descRes = await fetchWithRetry(
            descSigned.url,
            { method: 'GET', headers: descSigned.headers },
            'aws',
            'eks:DescribeCluster',
          )
          const descData = (await descRes.json()) as { cluster?: any }
          const c = descData.cluster
          return {
            name: c?.name ?? name,
            status: c?.status ?? null,
            version: c?.version ?? null,
            endpoint: c?.endpoint ?? null,
            platformVersion: c?.platformVersion ?? null,
            createdAt: c?.createdAt ?? null,
          }
        } catch {
          return { name, status: 'UNKNOWN', version: null }
        }
      }),
    )

    return clusters
  },
})

// ─── 8. Get CloudWatch Metrics ────────────

export const awsGetCloudWatchMetrics = defineTool({
  id: 'aws_get_cloudwatch_metrics',
  name: 'Get CloudWatch Metrics',
  description:
    'Retrieves CloudWatch metric statistics for a given namespace, metric, and time range via GetMetricStatistics API.\n\nReturns: { label, datapoints: [{ timestamp, average, sum, maximum, minimum, sampleCount, unit }] }',
  provider: 'aws',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    namespace: z.string().describe('CloudWatch namespace (e.g. "AWS/EC2", "AWS/Lambda", "AWS/S3")'),
    metric_name: z
      .string()
      .describe('Metric name (e.g. "CPUUtilization", "Invocations", "Duration")'),
    dimensions: z
      .array(
        z.object({
          Name: z.string().describe('Dimension name (e.g. "InstanceId")'),
          Value: z.string().describe('Dimension value (e.g. "i-0abc123")'),
        }),
      )
      .optional()
      .describe('Metric dimensions to filter by'),
    period: z
      .number()
      .min(60)
      .optional()
      .describe('Aggregation period in seconds (minimum 60, default 300)'),
    start_time: z
      .string()
      .describe('Start of time range in ISO 8601 format (e.g. "2024-01-01T00:00:00Z")'),
    end_time: z
      .string()
      .describe('End of time range in ISO 8601 format (e.g. "2024-01-02T00:00:00Z")'),
    statistics: z
      .array(z.enum(['Average', 'Sum', 'Maximum', 'Minimum', 'SampleCount']))
      .optional()
      .describe('Statistics to retrieve (default: ["Average"])'),
  }),
  execute: async ({ input }) => {
    const region = getRegion()
    const params: Record<string, string> = {
      Action: 'GetMetricStatistics',
      Version: '2010-08-01',
      Namespace: input.namespace,
      MetricName: input.metric_name,
      Period: String(input.period ?? 300),
      StartTime: new Date(input.start_time).toISOString(),
      EndTime: new Date(input.end_time).toISOString(),
    }

    const stats = input.statistics ?? ['Average']
    stats.forEach((s, i) => {
      params[`Statistics.member.${i + 1}`] = s
    })

    if (input.dimensions) {
      input.dimensions.forEach((d, i) => {
        params[`Dimensions.member.${i + 1}.Name`] = d.Name
        params[`Dimensions.member.${i + 1}.Value`] = d.Value
      })
    }

    const qs = new URLSearchParams(params)
    const url = `https://monitoring.${region}.amazonaws.com/?${qs.toString()}`
    const signed = signV4Request({ method: 'GET', url, service: 'monitoring' })
    const res = await fetchWithRetry(
      signed.url,
      { method: 'GET', headers: signed.headers },
      'aws',
      'cloudwatch:GetMetricStatistics',
    )
    const xml = await res.text()

    const members = xmlTagAll(xml, 'member')
    const datapoints = members
      .filter((m) => xmlTag(m, 'Timestamp'))
      .map((m) => ({
        timestamp: xmlTag(m, 'Timestamp') ?? null,
        average: xmlTag(m, 'Average') ? Number(xmlTag(m, 'Average')) : null,
        sum: xmlTag(m, 'Sum') ? Number(xmlTag(m, 'Sum')) : null,
        maximum: xmlTag(m, 'Maximum') ? Number(xmlTag(m, 'Maximum')) : null,
        minimum: xmlTag(m, 'Minimum') ? Number(xmlTag(m, 'Minimum')) : null,
        sampleCount: xmlTag(m, 'SampleCount') ? Number(xmlTag(m, 'SampleCount')) : null,
        unit: xmlTag(m, 'Unit') ?? null,
      }))
      .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))

    return {
      label: xmlTag(xml, 'Label') ?? input.metric_name,
      datapoints,
    }
  },
})

// ─── Export ───────────────────────────────

export const awsTools = [
  awsListEc2Instances,
  awsDescribeEc2Instance,
  awsListS3Buckets,
  awsListS3Objects,
  awsListLambdaFunctions,
  awsInvokeLambda,
  awsListEksClusters,
  awsGetCloudWatchMetrics,
]
