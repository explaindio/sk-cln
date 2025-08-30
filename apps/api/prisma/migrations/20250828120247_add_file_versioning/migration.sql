-- AlterTable
ALTER TABLE "public"."files" ADD COLUMN     "parent_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
