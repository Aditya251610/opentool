# gRPC Transport

OpenTool supports gRPC as an alternative transport alongside the default HTTP/MCP Streamable HTTP. gRPC provides binary serialization (Protocol Buffers), HTTP/2 multiplexing, and bidirectional streaming — ideal for high-throughput enterprise deployments.

## Quick Start

### 1. Enable gRPC on the Server

```bash
# Add to your .env
GRPC_ENABLED=true
GRPC_PORT=50051
```

Restart the server. You'll see:

```
⚡ gRPC server running { port: 50051 }
```

### 2. Connect with the TypeScript SDK

```ts
import { GrpcTransport } from '@opentool-ts/sdk'

const grpc = new GrpcTransport({
  host: 'localhost:50051',
  apiKey: 'ot_your_key_here',
})

// List tools
const { tools } = await grpc.listTools()
console.log(`${tools.length} tools available`)

// Execute a tool
const result = await grpc.executeTool('github.create_issue', {
  owner: 'myorg',
  repo: 'myrepo',
  title: 'Created via gRPC',
})

// Execute with streaming progress
for await (const progress of grpc.executeStream('postgres.query', {
  query: 'SELECT * FROM large_table',
})) {
  console.log(`[${progress.status}] ${progress.progressMessage}`)
  if (progress.content.length > 0) {
    console.log('Result:', progress.content[0].text)
  }
}

// Clean up
grpc.close()
```

### 3. Connect with grpcurl

```bash
# List tools
grpcurl -plaintext \
  -H "authorization: Bearer ot_your_key" \
  localhost:50051 opentool.v1.ToolService/ListTools

# Execute a tool
grpcurl -plaintext \
  -H "authorization: Bearer ot_your_key" \
  -d '{"tool_id": "github.list_repos", "input_json": "{}"}' \
  localhost:50051 opentool.v1.ToolService/ExecuteTool

# Health check
grpcurl -plaintext localhost:50051 opentool.v1.Health/Check
```

## Services

### ToolService

| RPC                 | Type             | Description                                     |
| ------------------- | ---------------- | ----------------------------------------------- |
| `ListTools`         | Unary            | List tools available for the authenticated user |
| `ExecuteTool`       | Unary            | Execute a single tool                           |
| `ExecuteToolStream` | Server streaming | Execute with real-time progress events          |
| `BatchExecute`      | Server streaming | Execute multiple tools in parallel              |
| `GetToolSchema`     | Unary            | Get a tool's input JSON schema                  |

### Health

| RPC     | Type             | Description                             |
| ------- | ---------------- | --------------------------------------- |
| `Check` | Unary            | Standard gRPC health check (DB + Redis) |
| `Watch` | Server streaming | Continuous health status updates        |

### McpTransport (MCP Bridge)

| RPC       | Type                    | Description                                                      |
| --------- | ----------------------- | ---------------------------------------------------------------- |
| `Connect` | Bidirectional streaming | Full MCP session over gRPC (initialize → tools/call → responses) |
| `Send`    | Unary                   | Stateless single-shot MCP request/response                       |

The MCP bridge wraps MCP JSON-RPC messages in protobuf, enabling gRPC-native MCP clients (following Google's proposed spec).

## CLI Usage

The CLI supports `--transport grpc` for direct gRPC access:

```bash
# List tools via gRPC
opentool tools -t grpc

# Execute via gRPC
opentool exec github.list_repos -t grpc --args '{"per_page": 5}'

# Streaming execution (real-time progress)
opentool exec postgres.query -t grpc --stream --args '{"query": "SELECT *"}'

# gRPC health check
opentool status -t grpc

# Configure gRPC endpoint (default: derived from server URL, port 50051)
opentool set-grpc-url myserver.com:50051
```

## Authentication

Pass your API key in the `authorization` gRPC metadata field:

```
authorization: Bearer ot_your_key_here
```

The `Health/Check` and `Health/Watch` RPCs are public (no auth required).

## TLS / mTLS

### Server-side TLS

```bash
GRPC_TLS_CERT=/path/to/server.crt
GRPC_TLS_KEY=/path/to/server.key
```

### Mutual TLS (client certificate verification)

```bash
GRPC_TLS_CERT=/path/to/server.crt
GRPC_TLS_KEY=/path/to/server.key
GRPC_TLS_CA=/path/to/ca.crt
```

### SDK with TLS

```ts
const grpc = new GrpcTransport({
  host: 'opentool.example.com:50051',
  apiKey: 'ot_your_key',
  tls: true,
  caCert: '/path/to/ca.crt', // Optional: custom CA
  clientCert: '/path/to/client.crt', // Optional: mTLS
  clientKey: '/path/to/client.key', // Optional: mTLS
})
```

## Configuration Reference

| Variable           | Default | Description                           |
| ------------------ | ------- | ------------------------------------- |
| `GRPC_ENABLED`     | `false` | Enable the gRPC server                |
| `GRPC_PORT`        | `50051` | Port for the gRPC server              |
| `GRPC_TLS_CERT`    | —       | Path to TLS certificate               |
| `GRPC_TLS_KEY`     | —       | Path to TLS private key               |
| `GRPC_TLS_CA`      | —       | Path to CA cert for mutual TLS        |
| `GRPC_MAX_STREAMS` | `100`   | Max concurrent streams per connection |
| `GRPC_REFLECTION`  | `true`  | Enable gRPC server reflection         |

## Streaming Execution

The `ExecuteToolStream` RPC sends progress events as the tool executes:

```
STARTED → PROGRESS* → COMPLETED | ERROR
```

Each `ExecuteToolProgress` message contains:

| Field              | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `status`           | `EXECUTION_STATUS_STARTED`, `PROGRESS`, `COMPLETED`, or `ERROR` |
| `content`          | Tool output (present on `COMPLETED`)                            |
| `progress_message` | Human-readable status update                                    |
| `error`            | Error details (present on `ERROR`)                              |
| `elapsed_ms`       | Time since execution started                                    |
| `progress_percent` | 0.0–1.0 if available                                            |

## Batch Execution

Execute multiple tools in parallel with concurrency control:

```ts
// Via grpcurl
grpcurl -plaintext \
  -H "authorization: Bearer ot_key" \
  -d '{
    "requests": [
      {"tool_id": "github.list_repos", "input_json": "{}"},
      {"tool_id": "slack.list_channels", "input_json": "{}"},
      {"tool_id": "linear.list_issues", "input_json": "{}"}
    ],
    "max_concurrency": 3
  }' \
  localhost:50051 opentool.v1.ToolService/BatchExecute
```

Results stream back as each tool completes, with `request_index` to correlate responses.

## Docker / Kubernetes

### Docker Compose

The gRPC port is already exposed in `docker-compose.yml`:

```yaml
server:
  ports:
    - '3001:3001' # HTTP
    - '50051:50051' # gRPC
```

### Kubernetes Health Probes

```yaml
livenessProbe:
  grpc:
    port: 50051
readinessProbe:
  grpc:
    port: 50051
```

## Multi-Language Clients

Proto files are in `packages/proto/opentool/v1/`. Generate clients for any language:

```bash
# Go
protoc --go_out=. --go-grpc_out=. packages/proto/opentool/v1/*.proto

# Python
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. packages/proto/opentool/v1/*.proto

# Java
protoc --java_out=. --grpc-java_out=. packages/proto/opentool/v1/*.proto

# Rust (tonic)
# Add to build.rs: tonic_build::compile_protos("packages/proto/opentool/v1/tool_service.proto")
```

## Performance

gRPC vs HTTP comparison for tool execution:

| Metric                 | HTTP/JSON     | gRPC/Protobuf       |
| ---------------------- | ------------- | ------------------- |
| Serialization          | ~1ms          | ~0.1ms              |
| Payload size (typical) | 2–5 KB        | 0.3–1 KB            |
| Concurrent calls       | Sequential    | Multiplexed         |
| Progress updates       | Not supported | Real-time streaming |
| Connection reuse       | Keep-alive    | HTTP/2 persistent   |
