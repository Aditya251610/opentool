-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SsoProvider" AS ENUM ('GOOGLE_WORKSPACE', 'OKTA', 'AZURE_AD', 'CUSTOM_SAML', 'CUSTOM_OIDC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ORG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_MEMBER_INVITED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_MEMBER_JOINED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_MEMBER_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_MEMBER_ROLE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_TEAM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_TEAM_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_KEY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_KEY_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_TOOL_CONNECTED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_TOOL_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_SSO_CONFIGURED';
ALTER TYPE "AuditAction" ADD VALUE 'ORG_SSO_LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'PERMISSION_DENIED';

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "maxKeys" INTEGER NOT NULL DEFAULT 10,
    "maxToolExec" INTEGER NOT NULL DEFAULT 1000,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoProvider" "SsoProvider",
    "ssoConfig" JSONB,
    "domainVerified" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_api_keys" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "ipAllowlist" TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_tool_connections" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING_AUTH',
    "scopes" TEXT[],
    "connectedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_tool_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_token_stores" (
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

    CONSTRAINT "org_token_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_invites" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_policies" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_audit_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "resource" TEXT,
    "durationMs" INTEGER,
    "inputSnapshot" JSONB,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "orgContext" JSONB,
    "geoLocation" TEXT,
    "retainUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_sso_sessions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idpSessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_sso_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "auditLogDays" INTEGER NOT NULL DEFAULT 90,
    "tokenStoreDays" INTEGER NOT NULL DEFAULT 365,
    "deletedUserDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "org_memberships_orgId_idx" ON "org_memberships"("orgId");

-- CreateIndex
CREATE INDEX "org_memberships_userId_idx" ON "org_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_orgId_userId_key" ON "org_memberships"("orgId", "userId");

-- CreateIndex
CREATE INDEX "teams_orgId_idx" ON "teams"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_orgId_slug_key" ON "teams"("orgId", "slug");

-- CreateIndex
CREATE INDEX "team_memberships_teamId_idx" ON "team_memberships"("teamId");

-- CreateIndex
CREATE INDEX "team_memberships_userId_idx" ON "team_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_teamId_userId_key" ON "team_memberships"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "org_api_keys_keyHash_key" ON "org_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "org_api_keys_orgId_idx" ON "org_api_keys"("orgId");

-- CreateIndex
CREATE INDEX "org_api_keys_keyHash_idx" ON "org_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "org_tool_connections_orgId_idx" ON "org_tool_connections"("orgId");

-- CreateIndex
CREATE INDEX "org_tool_connections_providerId_idx" ON "org_tool_connections"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "org_tool_connections_orgId_providerId_key" ON "org_tool_connections"("orgId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "org_token_stores_connectionId_key" ON "org_token_stores"("connectionId");

-- CreateIndex
CREATE INDEX "org_token_stores_connectionId_idx" ON "org_token_stores"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "org_invites_token_key" ON "org_invites"("token");

-- CreateIndex
CREATE INDEX "org_invites_orgId_idx" ON "org_invites"("orgId");

-- CreateIndex
CREATE INDEX "org_invites_email_idx" ON "org_invites"("email");

-- CreateIndex
CREATE INDEX "org_invites_token_idx" ON "org_invites"("token");

-- CreateIndex
CREATE INDEX "org_policies_orgId_idx" ON "org_policies"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_policies_orgId_name_key" ON "org_policies"("orgId", "name");

-- CreateIndex
CREATE INDEX "org_audit_logs_orgId_idx" ON "org_audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "org_audit_logs_userId_idx" ON "org_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "org_audit_logs_createdAt_idx" ON "org_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "org_audit_logs_retainUntil_idx" ON "org_audit_logs"("retainUntil");

-- CreateIndex
CREATE INDEX "org_sso_sessions_orgId_userId_idx" ON "org_sso_sessions"("orgId", "userId");

-- CreateIndex
CREATE INDEX "org_sso_sessions_expiresAt_idx" ON "org_sso_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_orgId_key" ON "data_retention_policies"("orgId");

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_api_keys" ADD CONSTRAINT "org_api_keys_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_tool_connections" ADD CONSTRAINT "org_tool_connections_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_tool_connections" ADD CONSTRAINT "org_tool_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "oauth_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_token_stores" ADD CONSTRAINT "org_token_stores_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "org_tool_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_policies" ADD CONSTRAINT "org_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_logs" ADD CONSTRAINT "org_audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_sso_sessions" ADD CONSTRAINT "org_sso_sessions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "data_retention_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
