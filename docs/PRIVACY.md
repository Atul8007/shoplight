# Privacy Documentation

## Data Collected

### Interaction Events (Feature-Flagged)
When analytics is enabled, the following **anonymous** interaction events may be collected:
- `experience_loaded` — Experience was initialized on a page
- `cursor_interaction` — A cursor state change occurred
- `element_hover` — User hovered over a recognized element
- `element_click` — User clicked a recognized element
- `effect_triggered` — A visual effect was played
- `experience_disabled` — Experience was disabled by user preference

### Session Data
- Anonymous session identifier (random, not tied to any account)
- Device type (desktop/tablet/mobile)
- Page type (home/product/collection/cart/search)

## Data NOT Collected

- ❌ Customer identity (no Shopify customer IDs)
- ❌ Email addresses
- ❌ IP addresses
- ❌ Raw mouse coordinates or trajectories
- ❌ Order data
- ❌ Payment information
- ❌ Browser fingerprints
- ❌ Cookies for tracking
- ❌ Third-party analytics pixels
- ❌ Cross-site tracking

## Anonymous Identifiers

Session identifiers are generated client-side using `Date.now().toString(36) + random()`. They are:
- Not derived from any user-identifying information
- Not persistent across browser sessions
- Not shared with any third party
- Automatically expire when the browser tab closes

## Retention Policy

| Data Type | Default Retention |
|:----------|:-----------------|
| Raw interaction events | 90 days |
| Daily aggregated metrics | 1 year |
| Session records | 90 days |

Design allows raw events to be deleted while aggregated metrics are preserved.

## Merchant Controls

- **Analytics toggle:** Merchants can disable analytics independently from visual functionality
- **Experience disable:** Merchants can disable the entire experience
- **Reduce motion:** Merchants can enforce reduced motion for all visitors

## Consent Behavior

The storefront runtime respects:
- OS-level `prefers-reduced-motion: reduce`
- Shopify's consent/privacy mechanisms where applicable

Analytics can be configured to require explicit consent before collecting interaction events.

## Deletion

On app uninstallation:
- Shop status is set to `UNINSTALLED`
- Access tokens are cleared
- Storefront configuration stops being served
- Analytics data retention follows the configured policy

## Legal Compliance

This implementation provides the **technical infrastructure** for privacy compliance. Legal compliance (GDPR, CCPA, etc.) depends on:
- Merchant jurisdiction
- Shopify's platform requirements
- Merchant's own privacy policy

The app does NOT automatically claim GDPR or CCPA compliance.
