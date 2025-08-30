-- AlterTable
ALTER TABLE "public"."files" ADD COLUMN     "access_level" TEXT NOT NULL DEFAULT 'private',
ADD COLUMN     "cdn_url" TEXT,
ADD COLUMN     "compressed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "compressed_size" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
