# Database Documentation

## Overview

PostgreSQL database managed via Prisma ORM. All tenant data is isolated by `shopId`.

## Entity Relationship

```
Shop (1) ──── (1) BrandProfile
 │
 ├── (N) Experience ──── (N) ExperienceVersion
 │        │
 │        └── (N) ExperienceRule
 │
 ├── (N) Asset
 │
 ├── (N) AnalyticsSession
 ├── (N) AnalyticsEvent
 └── (N) AnalyticsDailyMetric
```

## Models

### Shop
Tenant root entity. Created on first OAuth installation. `shopifyShopId` and `shopDomain` are both unique. Access tokens are encrypted at rest (`encryptedAccessToken`). Status transitions: `ACTIVE` → `UNINSTALLED` (on app removal).

### BrandProfile
One-to-one with Shop. Stores global brand identity (logo, colors, style). Used as defaults for new experiences.

### Experience
Container for interaction configurations. Stores mutable `draftConfiguration` (JSONB) and immutable `publishedConfiguration` (JSONB). Status: `DRAFT` → `PUBLISHED` → `ARCHIVED`.

### ExperienceVersion
Immutable snapshot created on each publish. The storefront only ever reads published versions. Version numbers are monotonically increasing per experience.

### ExperienceRule
Individual interaction rule stored as JSONB `condition` and `action` fields. Evaluated by the storefront rule engine based on priority.

### Asset
Records for uploaded files (cursor images, logos). Files are stored in S3-compatible object storage. SVGs are sanitized before storage. Status: `PENDING` → `READY` / `REJECTED`.

### Analytics Tables
- **AnalyticsSession**: Anonymous visitor sessions (no PII).
- **AnalyticsEvent**: Aggregated interaction events (no raw mouse trajectories).
- **AnalyticsDailyMetric**: Pre-aggregated daily metrics for dashboard performance.

## Multi-Tenancy

Every query MUST include `shopId` ownership verification:

```sql
-- CORRECT
SELECT * FROM experiences WHERE id = $1 AND shop_id = $2;

-- WRONG (never do this)
SELECT * FROM experiences WHERE id = $1;
```

## Migrations

Managed via `prisma migrate`. Initial migration: `20260905120000_init`.

Run: `npx prisma migrate deploy`
