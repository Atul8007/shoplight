# Storefront Engine Documentation

## Overview

The storefront engine is a zero-dependency, pure Vanilla TypeScript runtime that runs on the merchant's Shopify storefront. It is injected via a Shopify Theme App Extension (App Embed Block).

**Bundle size target:** < 30 KB compressed (current: ~12.9 KB uncompressed, ~5 KB compressed)

## Architecture

```
Bootstrap (IIFE)
  └─→ BrandInteractionEngine
        ├─→ fetch /storefront/config
        ├─→ CursorRenderer (position: fixed, pointer-events: none)
        ├─→ ElementDetector (semantic selector resolution)
        ├─→ RuleEngine (condition matching + priority sorting)
        ├─→ AnalyticsCollector (batched sendBeacon)
        └─→ MutationObserver (AJAX theme support)
```

## Rendering Pipeline

```
mousemove event
  → update latest x, y coordinates
  → requestAnimationFrame
    → CursorRenderer.render()
      → transform: translate3d(x, y, 0)  [GPU-accelerated]
      → update trail positions
      → update label position
```

Only the **latest** pointer position is rendered. No expensive logic runs in mousemove callbacks.

## Cursor Types

| Type | Implementation |
|:-----|:--------------|
| `default` | Simple filled circle |
| `dot` | Filled circle |
| `ring` | Border-only circle |
| `crosshair` | Two crossing lines |
| `image` | Background image URL |
| `svg` | Inline SVG markup |
| `emoji` | Text content emoji |

All cursors use `position: fixed`, `pointer-events: none`, and `will-change: transform`.

## Element Detection

Uses a multi-strategy approach to identify semantic element types without relying on fragile CSS selectors:

1. **Semantic selectors:** Checks multiple known Shopify theme selectors per element type
2. **Data attributes:** `[data-add-to-cart]`, `[data-wishlist]`, etc.
3. **Form analysis:** `form[action*="/cart/add"] button`
4. **ARIA labels:** `button[aria-label*="wishlist"]`
5. **Cached results:** Uses `WeakMap` so GC handles cleanup

Supported element types: `PRODUCT_IMAGE`, `PRODUCT_CARD`, `ADD_TO_CART`, `WISHLIST`, `BUTTON`, `LINK`, `CART`, `SEARCH`

## Rule Engine

```
EVENT (mouseenter)
  → ElementDetector resolves type (cached)
  → Build context (elementType, pageType, device, reducedMotion)
  → Filter enabled rules matching condition
  → Sort by priority (descending)
  → Execute highest-priority action
  → Update CursorRenderer state
```

Rule evaluation happens on `mouseover`, NOT on `mousemove`. Cursor position updates use only RAF.

## Fail-Open Design

- Configuration fetch timeout → normal browser cursor
- Runtime initialization error → destroy() + restore defaults
- Invalid rule → skip rule, continue others
- Broken asset → fallback to filled circle
- Backend down → `{ enabled: false }` response, cached

## Reduced Motion

When `prefers-reduced-motion: reduce` is detected OR the merchant enables reduce motion:
- Trail disabled
- Particles disabled
- Magnetic effect disabled
- Large scale transitions reduced
- Only subtle color/type changes remain

## Touch / Mobile

`hasHoverCapability()` checks `(hover: hover) and (pointer: fine)`.
If false, the entire cursor engine does NOT initialize. No fake cursor on mobile.

## Cleanup

`BrandInteractionEngine.destroy()` removes:
- Cursor DOM element
- Label DOM element
- Trail DOM elements
- All event listeners
- MutationObserver connections
- Animation frame requests
- Cursor-hide style tag

## Dynamic Themes (AJAX Cart, SPAs)

A minimal `MutationObserver` watches `document.body` for structural DOM changes. The `WeakMap`-based element cache automatically handles removed elements via garbage collection.
