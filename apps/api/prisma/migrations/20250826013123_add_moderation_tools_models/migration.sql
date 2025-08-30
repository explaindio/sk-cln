-- CreateEnum
CREATE TYPE "public"."ModerationAction" AS ENUM ('APPROVE', 'REJECT', 'DELETE', 'EDIT', 'WARN', 'MUTE', 'BAN', 'UNBAN', 'FLAG', 'REVIEW');

-- CreateEnum
CREATE TYPE "public"."FilterType" AS ENUM ('KEYWORD', 'REGEX', 'AI_BASED', 'IMAGE', 'LINK');

-- CreateEnum
CREATE TYPE "public"."FilterSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."FilterAction" AS ENUM ('FLAG', 'BLOCK', 'SHADOW_BAN', 'REQUIRE_REVIEW', 'AUTO_DELETE');

-- CreateEnum
CREATE TYPE "public"."AppealStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "public"."moderation_logs" (
    "id" TEXT NOT NULL,
    "action" "public"."ModerationAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."FilterType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "severity" "public"."FilterSeverity" NOT NULL,
    "action" "public"."FilterAction" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."banned_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "bannedUntil" TIMESTAMP(3),
    "appealStatus" "public"."AppealStatus" NOT NULL DEFAULT 'NONE',
    "appealNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banned_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auto_moderation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_moderation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_logs_targetType_targetId_idx" ON "public"."moderation_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "moderation_logs_moderatorId_idx" ON "public"."moderation_logs"("moderatorId");

-- CreateIndex
CREATE INDEX "moderation_logs_action_idx" ON "public"."moderation_logs"("action");

-- CreateIndex
CREATE INDEX "content_filters_type_idx" ON "public"."content_filters"("type");

-- CreateIndex
CREATE INDEX "content_filters_isActive_idx" ON "public"."content_filters"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "banned_users_userId_key" ON "public"."banned_users"("userId");

-- CreateIndex
CREATE INDEX "banned_users_bannedUntil_idx" ON "public"."banned_users"("bannedUntil");

-- CreateIndex
CREATE INDEX "banned_users_appealStatus_idx" ON "public"."banned_users"("appealStatus");

-- CreateIndex
CREATE INDEX "auto_moderation_rules_isActive_idx" ON "public"."auto_moderation_rules"("isActive");

-- CreateIndex
CREATE INDEX "auto_moderation_rules_priority_idx" ON "public"."auto_moderation_rules"("priority");

-- AddForeignKey
ALTER TABLE "public"."moderation_logs" ADD CONSTRAINT "moderation_logs_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_filters" ADD CONSTRAINT "content_filters_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."banned_users" ADD CONSTRAINT "banned_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."banned_users" ADD CONSTRAINT "banned_users_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auto_moderation_rules" ADD CONSTRAINT "auto_moderation_rules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
