-- CreateTable
CREATE TABLE "public"."search_queries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "page" INTEGER NOT NULL,
    "results_count" INTEGER NOT NULL,
    "took" INTEGER NOT NULL,
    "clicked_result_id" TEXT,
    "clicked_result_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_queries_user_id_idx" ON "public"."search_queries"("user_id");

-- CreateIndex
CREATE INDEX "search_queries_created_at_idx" ON "public"."search_queries"("created_at");

-- AddForeignKey
ALTER TABLE "public"."search_queries" ADD CONSTRAINT "search_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
