# Shopify Scopes Documentation

## Current Scopes

| Scope | Reason | Feature | Can Be Removed |
|:------|:-------|:--------|:--------------|
| `read_products` | Detect product pages and product-aware interactions in the storefront runtime | Element detection, product-specific rules | Only if product-aware interaction rules are removed |

## Scopes NOT Requested

| Scope | Reason Not Used |
|:------|:----------------|
| `write_products` | App never modifies products |
| `read_customers` / `write_customers` | V1 does not collect customer identity |
| `read_orders` / `write_orders` | No order processing required |
| `write_themes` | App uses Theme App Extension (no theme.liquid modification) |
| `read_script_tags` / `write_script_tags` | ScriptTag API is NOT used; Theme App Embed is used instead |
| `read_content` | Not needed for interaction engine |
| `read_analytics` | App collects its own anonymous interaction analytics |

## Design Principle

Request the **absolute minimum** scopes. The Brand Interaction Engine is a visual enhancement layer — it does not need to read or write customer, order, or theme data.

## Future Scope Changes

- **V2 (Product awareness):** `read_products` remains sufficient.
- **V3 (Analytics with commerce metrics):** May need `read_analytics` scope.
- **V4+ (A/B Testing):** Possible future need for `read_analytics` for conversion tracking.

All scope additions should be documented here with justification before implementation.
