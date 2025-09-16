/*
  Warnings:

  - The `type` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `created_at` on the `event_attendees` table. All the data in the column will be lost.
  - The `status` column on the `event_attendees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `message_type` column on the `messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `instructor_id` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `moderation_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."CourseDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "public"."ModerationActionType" AS ENUM ('WARN', 'BAN', 'DELETE', 'EDIT', 'RESTORE');

-- CreateEnum
CREATE TYPE "public"."ModerationLogAction" AS ENUM ('APPROVE', 'REJECT', 'DELETE', 'EDIT', 'WARN', 'MUTE', 'BAN', 'UNBAN', 'FLAG', 'REVIEW');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('confirmed', 'declined', 'maybe');

-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('direct', 'group');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('text', 'image', 'file', 'video');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('post', 'comment', 'message');

-- CreateEnum
CREATE TYPE "public"."FlagType" AS ENUM ('spam', 'abuse', 'inappropriate', 'offtopic');

-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "public"."FlagStatus" AS ENUM ('pending', 'resolved');

-- AlterEnum
ALTER TYPE "public"."ReportStatus" ADD VALUE 'ESCALATED';

-- AlterTable
ALTER TABLE "public"."conversation_participants" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "public"."conversations" DROP COLUMN "type",
ADD COLUMN     "type" "public"."ConversationType" NOT NULL DEFAULT 'direct';

-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "difficulty" "public"."CourseDifficulty" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "enrollment_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "instructor_id" TEXT NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "public"."event_attendees" DROP COLUMN "created_at",
ADD COLUMN     "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."EventStatus" NOT NULL DEFAULT 'confirmed';

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "message_type",
ADD COLUMN     "message_type" "public"."MessageType" NOT NULL DEFAULT 'text';

-- AlterTable
ALTER TABLE "public"."moderation_logs" DROP COLUMN "action",
ADD COLUMN     "action" "public"."ModerationLogAction" NOT NULL;

-- AlterTable
ALTER TABLE "public"."user_preferences" ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "optOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recommendationFrequency" TEXT NOT NULL DEFAULT 'weekly';

-- DropEnum
DROP TYPE "public"."ModerationAction";

-- CreateTable
CREATE TABLE "public"."message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_reminders" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "remind_at" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."moderation_actions" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "actionType" "public"."ModerationActionType" NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recommendation_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "helpful" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_flags" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" "public"."ContentType" NOT NULL,
    "flagType" "public"."FlagType" NOT NULL,
    "severity" "public"."Severity" NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "status" "public"."FlagStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_user_id_key" ON "public"."message_reactions"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_reminders_event_id_user_id_remind_at_key" ON "public"."event_reminders"("event_id", "user_id", "remind_at");

-- CreateIndex
CREATE INDEX "moderation_logs_action_idx" ON "public"."moderation_logs"("action");

-- AddForeignKey
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_reminders" ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_reminders" ADD CONSTRAINT "event_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_actions" ADD CONSTRAINT "moderation_actions_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_actions" ADD CONSTRAINT "moderation_actions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_flags" ADD CONSTRAINT "content_flags_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
