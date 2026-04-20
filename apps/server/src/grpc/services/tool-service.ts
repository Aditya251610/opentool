import * as grpc from '@grpc/grpc-js'
import { getUserId } from '../interceptors/auth'
import { getAllToolsForUser, executeTool } from '../../mcp/tools'
import { getToolById, getAllTools } from '../../registry'
import { logger } from '../../logger'
import { TOOL_TIMEOUT_MS } from '../../constants'
import type {
  ListToolsRequest,
  ListToolsResponse,
  ExecuteToolRequest,
  ExecuteToolResponse,
  ExecuteToolProgress,
  BatchExecuteRequest,
  BatchExecuteProgress,
  ToolSchema,
} from '@opentool/proto'

/**
 * gRPC ToolService implementation.
 * Delegates to the existing tool registry and execution engine.
 */
export const toolServiceImpl: grpc.UntypedServiceImplementation = {
  /**
   * List all tools available for the authenticated user.
   */
  async ListTools(
    call: grpc.ServerUnaryCall<ListToolsRequest, ListToolsResponse>,
    callback: grpc.sendUnaryData<ListToolsResponse>,
  ) {
    try {
      const userId = getUserId(call)
      let tools = await getAllToolsForUser(userId)

      // Apply filters
      const request = call.request as ListToolsRequest
      if (request.provider) {
        tools = tools.filter((t) => t.provider === request.provider)
      }
      if (request.connectedOnly) {
        tools = tools.filter((t) => t.connected)
      }

      callback(null, {
        tools: tools.map((t) => ({
          id: t.id,
          name: t.id, // Tools use id as name
          description: t.description,
          provider: t.provider,
          authType: mapAuthType(t),
          connected: t.connected,
          requiredScopes: [],
        })),
        totalCount: tools.length,
      } as ListToolsResponse)
    } catch (error) {
      logger.error('gRPC ListTools error', error)
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },

  /**
   * Execute a single tool (unary).
   */
  async ExecuteTool(
    call: grpc.ServerUnaryCall<ExecuteToolRequest, ExecuteToolResponse>,
    callback: grpc.sendUnaryData<ExecuteToolResponse>,
  ) {
    const startTime = Date.now()
    try {
      const userId = getUserId(call)
      const request = call.request as ExecuteToolRequest

      if (!request.toolId) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'tool_id is required',
        })
        return
      }

      const input = request.inputJson ? JSON.parse(request.inputJson) : {}
      const result = await executeTool(request.toolId, input, userId)

      callback(null, {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
        durationMs: Date.now() - startTime,
      } as ExecuteToolResponse)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      callback(null, {
        content: [{ type: 'text', text: message }],
        isError: true,
        durationMs: Date.now() - startTime,
      } as ExecuteToolResponse)
    }
  },

  /**
   * Execute a tool with streaming progress updates.
   */
  async ExecuteToolStream(
    call: grpc.ServerWritableStream<ExecuteToolRequest, ExecuteToolProgress>,
  ) {
    const startTime = Date.now()
    try {
      const userId = getUserId(call)
      const request = call.request as ExecuteToolRequest

      if (!request.toolId) {
        call.write({
          status: 'EXECUTION_STATUS_ERROR',
          content: [],
          progressMessage: '',
          error: {
            code: grpc.status.INVALID_ARGUMENT,
            message: 'tool_id is required',
            metadata: {},
          },
          elapsedMs: 0,
          progressPercent: 0,
        } as ExecuteToolProgress)
        call.end()
        return
      }

      // Send STARTED event
      call.write({
        status: 'EXECUTION_STATUS_STARTED',
        content: [],
        progressMessage: `Executing ${request.toolId}...`,
        error: null,
        elapsedMs: 0,
        progressPercent: 0,
      } as ExecuteToolProgress)

      const input = request.inputJson ? JSON.parse(request.inputJson) : {}
      const result = await executeTool(request.toolId, input, userId)

      // Send COMPLETED event
      call.write({
        status: 'EXECUTION_STATUS_COMPLETED',
        content: [{ type: 'text', text: JSON.stringify(result) }],
        progressMessage: 'Done',
        error: null,
        elapsedMs: Date.now() - startTime,
        progressPercent: 1.0,
      } as ExecuteToolProgress)

      call.end()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      call.write({
        status: 'EXECUTION_STATUS_ERROR',
        content: [],
        progressMessage: '',
        error: { code: grpc.status.INTERNAL, message, metadata: {} },
        elapsedMs: Date.now() - startTime,
        progressPercent: 0,
      } as ExecuteToolProgress)
      call.end()
    }
  },

  /**
   * Batch execute multiple tools in parallel, streaming results.
   */
  async BatchExecute(call: grpc.ServerWritableStream<BatchExecuteRequest, BatchExecuteProgress>) {
    try {
      const userId = getUserId(call)
      const request = call.request as BatchExecuteRequest
      const maxConcurrency = request.maxConcurrency || 5

      if (!request.requests || request.requests.length === 0) {
        call.end()
        return
      }

      // Execute with concurrency control
      const semaphore = new Semaphore(maxConcurrency)
      const promises = request.requests.map(async (req, index) => {
        await semaphore.acquire()
        const startTime = Date.now()
        try {
          const input = req.inputJson ? JSON.parse(req.inputJson) : {}

          // Send STARTED
          call.write({
            requestIndex: index,
            toolId: req.toolId,
            status: 'EXECUTION_STATUS_STARTED',
            content: [],
            error: null,
            durationMs: 0,
          } as BatchExecuteProgress)

          const result = await executeTool(req.toolId, input, userId)

          // Send COMPLETED
          call.write({
            requestIndex: index,
            toolId: req.toolId,
            status: 'EXECUTION_STATUS_COMPLETED',
            content: [{ type: 'text', text: JSON.stringify(result) }],
            error: null,
            durationMs: Date.now() - startTime,
          } as BatchExecuteProgress)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          call.write({
            requestIndex: index,
            toolId: req.toolId,
            status: 'EXECUTION_STATUS_ERROR',
            content: [],
            error: { code: grpc.status.INTERNAL, message, metadata: {} },
            durationMs: Date.now() - startTime,
          } as BatchExecuteProgress)
        } finally {
          semaphore.release()
        }
      })

      await Promise.all(promises)
      call.end()
    } catch (error) {
      logger.error('gRPC BatchExecute error', error)
      call.end()
    }
  },

  /**
   * Get the input schema for a tool.
   */
  async GetToolSchema(
    call: grpc.ServerUnaryCall<{ toolId: string }, ToolSchema>,
    callback: grpc.sendUnaryData<ToolSchema>,
  ) {
    try {
      const toolId = (call.request as { toolId: string }).toolId
      const tool = getToolById(toolId)

      if (!tool) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: `Tool not found: ${toolId}`,
        })
        return
      }

      callback(null, {
        toolId: tool.id,
        inputJsonSchema: JSON.stringify(tool.inputJsonSchema),
        description: tool.description,
      } as ToolSchema)
    } catch (error) {
      logger.error('gRPC GetToolSchema error', error)
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },
}

// ─── Helpers ───

function mapAuthType(tool: { connected: boolean; provider: string }): string {
  // We don't have direct access to authType from the UserTool, infer from description
  return 'AUTH_TYPE_UNSPECIFIED'
}

/**
 * Simple counting semaphore for concurrency control.
 */
class Semaphore {
  private permits: number
  private waiting: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!
      next()
    } else {
      this.permits++
    }
  }
}
