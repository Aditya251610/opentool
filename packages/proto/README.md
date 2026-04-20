# @opentool/proto

Protocol Buffer definitions for OpenTool gRPC services.

## Services

| Service        | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `ToolService`  | List, execute, stream, and batch-execute tools             |
| `AuthService`  | API key validation                                         |
| `Health`       | Standard gRPC health checking (compatible with Kubernetes) |
| `McpTransport` | MCP JSON-RPC over gRPC bridge                              |

## Proto Files

```
opentool/v1/
├── types.proto          # Shared message types
├── tool_service.proto   # Tool operations
├── auth_service.proto   # Authentication
├── health.proto         # Health checking
└── mcp_transport.proto  # MCP bridge
```

## Usage — TypeScript (Dynamic Loading)

The default approach uses `@grpc/proto-loader` for dynamic loading at runtime. No `protoc` required.

```ts
import { ToolServiceClient, HealthClient, grpc } from '@opentool/proto'

const creds = grpc.credentials.createInsecure()
const tools = new ToolServiceClient('localhost:50051', creds)
const health = new HealthClient('localhost:50051', creds)

// List tools
tools.ListTools({ provider: '', connectedOnly: false }, (err, res) => {
  console.log(res.tools)
})

// Execute a tool
tools.ExecuteTool(
  { toolId: 'github.list_repos', inputJson: '{"per_page": 5}', timeoutMs: 30000 },
  (err, res) => {
    console.log(res)
  },
)

// Stream execution
const stream = tools.ExecuteToolStream({
  toolId: 'github.create_issue',
  inputJson: '{}',
  timeoutMs: 60000,
})
stream.on('data', (progress) => console.log(progress.status))
stream.on('end', () => console.log('done'))
```

## Usage — Python

Generate Python stubs first:

```bash
pip install grpcio-tools
python packages/proto/scripts/generate-python.py
```

Then use:

```python
import grpc
from opentool_proto import tool_service_pb2, tool_service_pb2_grpc

channel = grpc.insecure_channel('localhost:50051')
stub = tool_service_pb2_grpc.ToolServiceStub(channel)

# List tools
response = stub.ListTools(tool_service_pb2.ListToolsRequest())
for tool in response.tools:
    print(f"{tool.id}: {tool.name}")

# Execute a tool
response = stub.ExecuteTool(tool_service_pb2.ExecuteToolRequest(
    tool_id="github.list_repos",
    input_json='{"per_page": 5}',
    timeout_ms=30000,
))
print(response.content)

# Stream execution
for progress in stub.ExecuteToolStream(tool_service_pb2.ExecuteToolRequest(
    tool_id="github.create_issue",
    input_json='{}',
)):
    print(f"Status: {progress.status}")
```

## Generating Stubs

```bash
# All languages
pnpm proto:gen

# TypeScript only
pnpm proto:gen -- --lang ts

# Python only
pnpm proto:gen -- --lang python
```

## Server Implementation

The OpenTool server uses these proto definitions to run a gRPC server alongside HTTP:

```bash
# Enable gRPC
GRPC_ENABLED=true GRPC_PORT=50051 pnpm dev

# With TLS
GRPC_TLS_CERT=./cert.pem GRPC_TLS_KEY=./key.pem pnpm dev
```

See [docs/grpc.md](../../docs/grpc.md) for the full gRPC guide.
