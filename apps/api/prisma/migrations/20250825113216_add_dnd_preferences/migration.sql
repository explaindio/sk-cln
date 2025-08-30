-- AlterTable
ALTER TABLE "public"."notification_preferences" ADD COLUMN     "dnd_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dnd_end" TEXT,
ADD COLUMN     "dnd_start" TEXT;
