-- OpenTool Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ococyfzesoolczqcdywv/sql)

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('OAUTH2', 'API_KEY', 'NONE');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'EXPIRED', 'REVOKED', 'PENDING_AUTH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('TOOL_EXECUTE', 'TOOL_AUTH_REQUEST', 'TOOL_AUTH_SUCCESS', 'TOOL_AUTH_FAILURE', 'TOKEN_REFRESH', 'TOKEN_REVOKE', 'API_KEY_CREATED', 'API_KEY_REVOKED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_providers" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "authUrl" TEXT NOT NULL,
    "tokenUrl" TEXT NOT NULL,
    "revokeUrl" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT NOT NULL,
    "defaultScopes" TEXT[],
    "authType" "AuthType" NOT NULL DEFAULT 'OAUTH2',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_definitions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB,
    "authType" "AuthType" NOT NULL DEFAULT 'OAUTH2',
    "requiredScopes" TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING_AUTH',
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_stores" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "accessTokenExpiry" TIMESTAMP(3),
    "scopes" TEXT[],
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "rawMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolDefinitionId" TEXT,
    "action" "AuditAction" NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "durationMs" INTEGER,
    "inputSnapshot" JSONB,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_providers_provider_key" ON "oauth_providers"("provider");

-- CreateIndex
CREATE INDEX "oauth_providers_provider_idx" ON "oauth_providers"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "tool_definitions_toolId_key" ON "tool_definitions"("toolId");

-- CreateIndex
CREATE INDEX "tool_definitions_providerId_idx" ON "tool_definitions"("providerId");

-- CreateIndex
CREATE INDEX "tool_definitions_toolId_idx" ON "tool_definitions"("toolId");

-- CreateIndex
CREATE INDEX "tool_connections_userId_idx" ON "tool_connections"("userId");

-- CreateIndex
CREATE INDEX "tool_connections_providerId_idx" ON "tool_connections"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_connections_userId_providerId_key" ON "tool_connections"("userId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "token_stores_connectionId_key" ON "token_stores"("connectionId");

-- CreateIndex
CREATE INDEX "token_stores_connectionId_idx" ON "token_stores"("connectionId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_toolDefinitionId_idx" ON "audit_logs"("toolDefinitionId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_definitions" ADD CONSTRAINT "tool_definitions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "oauth_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_connections" ADD CONSTRAINT "tool_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_connections" ADD CONSTRAINT "tool_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "oauth_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_stores" ADD CONSTRAINT "token_stores_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "tool_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_toolDefinitionId_fkey" FOREIGN KEY ("toolDefinitionId") REFERENCES "tool_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Disable RLS on all tables (Prisma connects as postgres role, not through Supabase client)
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_providers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_definitions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_connections" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "token_stores" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
