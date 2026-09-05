# Security Documentation

## Authentication & Authorization

### Shopify OAuth
- App uses Shopify's managed installation flow via `@shopify/shopify-app-remix`
- Session storage via `PrismaSessionStorage`
- All admin routes verify authentication via `authenticate.admin(request)`

### Shop Isolation (Multi-Tenancy)
- Every database query includes `shopId` ownership verification
- Merchant identity is derived from the authenticated Shopify session, never from client-provided values
- Cross-shop access is prevented at the query level

### Webhook Verification
- Webhooks are verified using `authenticate.webhook(request)` from `@shopify/shopify-app-remix`
- The `APP_UNINSTALLED` webhook deactivates shops and clears credentials

## Input Validation

### Zod Schema Validation
All inputs are validated using Zod schemas:
- Experience configurations
- Rule conditions and actions
- Brand profile updates
- Analytics event payloads
- Asset metadata

### No Arbitrary JavaScript
The following are strictly prohibited in merchant configurations:
- `eval()`
- `new Function()`
- Inline JavaScript in configuration objects
- Custom JavaScript fields
- Script injection via SVG

The validation layer explicitly scans for and rejects keys named `javascript`, `customJavaScript`, `script`, `eval`, and `Function`.

## Asset Security

### SVG Sanitization
Uploaded SVG files are checked for:
- `<script>` tags
- Event handler attributes (`onclick`, `onload`, `onmouseover`, etc.)
- `javascript:` URIs
- `data:text/html` content
- `<foreignObject>` elements
- External `xlink:href` references
- Size limit (100 KB)

Dangerous SVGs are **rejected**, not sanitized — this prevents bypass attempts.

### File Upload Validation
- MIME type verification
- File size limits
- Dimension validation for images
- File extension validation (not trusted — MIME type takes precedence)

## Storefront Security

### No Sensitive Data Exposure
The `/storefront/config` endpoint never returns:
- Shopify access tokens
- Merchant secrets
- Customer information
- Internal database IDs (unnecessarily)
- Private billing information

### CORS
- Storefront endpoints use `Access-Control-Allow-Origin: *` (public read-only data)
- Admin endpoints are protected by Shopify's embedded app authentication

### Cache Headers
- Published configurations use `Cache-Control: public, max-age=300`
- ETag-based conditional requests reduce unnecessary data transfer

## Rate Limiting

Rate limiting should be configured at the infrastructure level (CDN, reverse proxy). The app is designed to be cache-friendly to reduce backend load.

## Secrets Management

### Environment Variables
- `SHOPIFY_API_KEY` — public client identifier
- `SHOPIFY_API_SECRET` — server-only, never exposed to browser
- `SESSION_SECRET` — cookie signing key
- `DATABASE_URL` — database connection string
- `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` — S3 credentials

### .env File
- `.env` is in `.gitignore`
- `.env.example` contains only variable names without values
- Access tokens are encrypted before storage in the database
