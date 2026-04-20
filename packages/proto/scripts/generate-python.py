#!/usr/bin/env python3
"""
Python gRPC client generation for OpenTool.

Generates Python stubs from the OpenTool .proto files.
Requires: pip install grpcio-tools

Usage:
  python scripts/generate-python.py [--output-dir <dir>]
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Generate Python gRPC stubs for OpenTool")
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Output directory (default: <repo>/packages/sdk/python/opentool_proto/)",
    )
    args = parser.parse_args()

    # Find paths
    script_dir = Path(__file__).parent
    proto_root = script_dir.parent
    proto_dir = proto_root / "opentool" / "v1"
    repo_root = proto_root.parent.parent

    output_dir = Path(args.output_dir) if args.output_dir else repo_root / "packages" / "sdk" / "python" / "opentool_proto"

    protos = [
        "types.proto",
        "tool_service.proto",
        "auth_service.proto",
        "health.proto",
        "mcp_transport.proto",
    ]

    print("🐍 OpenTool Proto — Python Generation")
    print("======================================\n")

    # Check grpcio-tools is installed
    try:
        import grpc_tools  # noqa: F401
    except ImportError:
        print("❌ grpcio-tools not installed. Install with:")
        print("   pip install grpcio-tools")
        sys.exit(1)

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Proto directory: {proto_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Protos: {', '.join(protos)}\n")

    proto_files = [str(proto_dir / p) for p in protos]

    cmd = [
        sys.executable,
        "-m",
        "grpc_tools.protoc",
        f"-I{proto_root}",
        f"--python_out={output_dir}",
        f"--grpc_python_out={output_dir}",
        f"--pyi_out={output_dir}",
        *proto_files,
    ]

    print(f"Running: {' '.join(cmd)}\n")

    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Generation failed with exit code {e.returncode}")
        sys.exit(1)

    # Create __init__.py
    init_file = output_dir / "__init__.py"
    init_file.write_text(
        '"""Auto-generated OpenTool gRPC stubs."""\n'
        "\n"
        "from .opentool.v1 import tool_service_pb2\n"
        "from .opentool.v1 import tool_service_pb2_grpc\n"
        "from .opentool.v1 import auth_service_pb2\n"
        "from .opentool.v1 import auth_service_pb2_grpc\n"
        "from .opentool.v1 import health_pb2\n"
        "from .opentool.v1 import health_pb2_grpc\n"
        "from .opentool.v1 import mcp_transport_pb2\n"
        "from .opentool.v1 import mcp_transport_pb2_grpc\n"
        "from .opentool.v1 import types_pb2\n"
    )

    # Also create opentool/v1/__init__.py
    opentool_v1_dir = output_dir / "opentool" / "v1"
    if opentool_v1_dir.exists():
        (opentool_v1_dir / "__init__.py").touch()
        opentool_dir = output_dir / "opentool"
        (opentool_dir / "__init__.py").touch()

    print("\n✅ Python gRPC stubs generated successfully!")
    print(f"   Output: {output_dir}")
    print("\nUsage example:")
    print("  import grpc")
    print("  from opentool_proto import tool_service_pb2, tool_service_pb2_grpc")
    print()
    print("  channel = grpc.insecure_channel('localhost:50051')")
    print("  stub = tool_service_pb2_grpc.ToolServiceStub(channel)")
    print("  response = stub.ListTools(tool_service_pb2.ListToolsRequest())")


if __name__ == "__main__":
    main()
