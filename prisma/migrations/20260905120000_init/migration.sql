CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "scope" TEXT,
  "expires" TIMESTAMP(3),
  "accessToken" TEXT NOT NULL,
  "userId" BIGINT,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "accountOwner" BOOLEAN NOT NULL DEFAULT false,
  "locale" TEXT,
  "collaborator" BOOLEAN DEFAULT false,
  "emailVerified" BOOLEAN DEFAULT false
);

CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNINSTALLED');
CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'PRO');
CREATE TYPE "BrandStyle" AS ENUM ('minimal', 'luxury', 'playful', 'futuristic', 'organic', 'bold', 'custom');
CREATE TYPE "ExperienceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AssetType" AS ENUM ('CURSOR', 'LOGO', 'EFFECT', 'OTHER');
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY', 'REJECTED');

CREATE TABLE "shops" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shopify_shop_id" TEXT NOT NULL,
  "shop_domain" TEXT NOT NULL,
  "encrypted_access_token" TEXT,
  "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
  "plan" "BillingPlan" NOT NULL DEFAULT 'FREE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "brand_profiles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop_id" TEXT NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "logo_url" TEXT,
  "primary_color" TEXT NOT NULL DEFAULT '#111111',
  "secondary_color" TEXT NOT NULL DEFAULT '#FFFFFF',
  "accent_color" TEXT NOT NULL DEFAULT '#FFFFFF',
  "style" "BrandStyle" NOT NULL DEFAULT 'minimal',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "experiences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop_id" TEXT NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ExperienceStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 0,
  "draft_configuration" JSONB NOT NULL,
  "published_configuration" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "published_at" TIMESTAMP(3)
);

CREATE TABLE "experience_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "experience_id" TEXT NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "configuration" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "experience_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "experience_id" TEXT NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "condition" JSONB NOT NULL,
  "action" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "assets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop_id" TEXT NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "AssetType" NOT NULL,
  "original_name" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "cdn_url" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "analytics_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop_id" TEXT NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "experience_id" TEXT REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "anonymous_session_id" TEXT NOT NULL,
  "device_type" TEXT NOT NULL,
  "page_type" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3)
);

CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop_id" TEXT NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "experience_id" TEXT REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "anonymous_session_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "page_type" TEXT,
  "element_type" TEXT,
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "analytics_daily_metrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop_id" TEXT NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "experience_id" TEXT REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "page_type" TEXT,
  "element_type" TEXT,
  "hover_count" INTEGER NOT NULL DEFAULT 0,
  "click_count" INTEGER NOT NULL DEFAULT 0,
  "interaction_count" INTEGER NOT NULL DEFAULT 0,
  "session_count" INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "shops_shopify_shop_id_key" ON "shops"("shopify_shop_id");
CREATE UNIQUE INDEX "shops_shop_domain_key" ON "shops"("shop_domain");
CREATE UNIQUE INDEX "brand_profiles_shop_id_key" ON "brand_profiles"("shop_id");
CREATE INDEX "experiences_shop_id_idx" ON "experiences"("shop_id");
CREATE INDEX "experiences_shop_id_status_idx" ON "experiences"("shop_id", "status");
CREATE UNIQUE INDEX "experience_versions_experience_id_version_key" ON "experience_versions"("experience_id", "version");
CREATE INDEX "experience_rules_experience_id_enabled_priority_idx" ON "experience_rules"("experience_id", "enabled", "priority");
CREATE INDEX "assets_shop_id_idx" ON "assets"("shop_id");
CREATE INDEX "analytics_events_shop_id_occurred_at_idx" ON "analytics_events"("shop_id", "occurred_at");
CREATE UNIQUE INDEX "analytics_daily_metrics_unique" ON "analytics_daily_metrics"("shop_id", "experience_id", "date", "page_type", "element_type");

