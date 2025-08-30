-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "reminders_sent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "isClicked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOpened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openedAt" TIMESTAMP(3);
