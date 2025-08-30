-- CreateEnum
CREATE TYPE "public"."ExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SegmentType" AS ENUM ('USER_BASED', 'ATTRIBUTE_BASED', 'BEHAVIOR_BASED', 'RANDOM');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'HATE_SPEECH', 'THREATS', 'MISINFORMATION', 'COPYRIGHT_INFRINGEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "value" JSONB NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "user_ids" TEXT[],
    "conditions" JSONB,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ab_experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "feature_flag_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "variants" JSONB NOT NULL,
    "target_audience" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "winner_variant" TEXT,
    "metrics" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_flag_id" TEXT,
    "experiment_id" TEXT,
    "variant" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "session_id" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_segments" (
    "id" TEXT NOT NULL,
    "feature_flag_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."SegmentType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "public"."ReportReason" NOT NULL,
    "description" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "resolution" TEXT,
    "action" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "public"."feature_flags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "public"."feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ab_experiments_name_key" ON "public"."ab_experiments"("name");

-- CreateIndex
CREATE INDEX "ab_experiments_feature_flag_id_idx" ON "public"."ab_experiments"("feature_flag_id");

-- CreateIndex
CREATE INDEX "ab_experiments_status_idx" ON "public"."ab_experiments"("status");

-- CreateIndex
CREATE INDEX "ab_experiments_start_date_end_date_idx" ON "public"."ab_experiments"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "feature_usage_user_id_timestamp_idx" ON "public"."feature_usage"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "feature_usage_feature_flag_id_timestamp_idx" ON "public"."feature_usage"("feature_flag_id", "timestamp");

-- CreateIndex
CREATE INDEX "feature_usage_experiment_id_idx" ON "public"."feature_usage"("experiment_id");

-- CreateIndex
CREATE INDEX "feature_usage_action_timestamp_idx" ON "public"."feature_usage"("action", "timestamp");

-- CreateIndex
CREATE INDEX "feature_segments_feature_flag_id_idx" ON "public"."feature_segments"("feature_flag_id");

-- CreateIndex
CREATE INDEX "feature_segments_type_idx" ON "public"."feature_segments"("type");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "public"."reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_targetType_targetId_idx" ON "public"."reports"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "public"."reports"("status");

-- CreateIndex
CREATE INDEX "reports_assigned_to_idx" ON "public"."reports"("assigned_to");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "public"."reports"("created_at");

-- AddForeignKey
ALTER TABLE "public"."feature_flags" ADD CONSTRAINT "feature_flags_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_flags" ADD CONSTRAINT "feature_flags_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ab_experiments" ADD CONSTRAINT "ab_experiments_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ab_experiments" ADD CONSTRAINT "ab_experiments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_usage" ADD CONSTRAINT "feature_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_usage" ADD CONSTRAINT "feature_usage_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_usage" ADD CONSTRAINT "feature_usage_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."ab_experiments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_segments" ADD CONSTRAINT "feature_segments_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
