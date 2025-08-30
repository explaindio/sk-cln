-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "rich_text_content" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "rich_text_content" TEXT;