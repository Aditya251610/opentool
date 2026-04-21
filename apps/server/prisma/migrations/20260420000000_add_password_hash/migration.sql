-- AlterTable: Add passwordHash to users (resolves drift)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
