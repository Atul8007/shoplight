# Performance Documentation

## Storefront Runtime

### Bundle Size
- **Uncompressed:** ~12.9 KB
- **Target:** < 30 KB compressed
- **Actual (gzip estimated):** ~5 KB

### Rendering Performance
- Uses `requestAnimationFrame` for cursor rendering — locked to display refresh rate
- CSS `transform: translate3d()` for GPU-accelerated compositing
- `will-change: transform` on cursor elements
- No forced synchronous layout
- No continuous DOM querying

### Event Handling
- `mousemove`: Only updates x/y coordinates (no logic)
- `mouseover`: Evaluates rules (cached element type resolution)
- `click`: Plays effects (fire-and-forget DOM elements with setTimeout cleanup)
- All listeners use `{ passive: true }` where applicable

### Rule Evaluation
- O(n) evaluation where n = number of enabled rules
- Element type resolution cached via `WeakMap` (automatic GC)
- Rules only evaluated on `mouseover`, NOT on every `mousemove`

### Memory
- `WeakMap` for element cache (GC-friendly)
- Trail elements limited to configured `trailLength`
- Click effects auto-remove after animation duration

## What We Do NOT Do

- ❌ Send mousemove events to the server
- ❌ Persist raw mouse coordinates
- ❌ Run expensive DOM queries on every animation frame
- ❌ Load React/Polaris on the storefront
- ❌ Block page rendering while fetching configuration
- ❌ Use synchronous XHR
- ❌ Attach hundreds of individual event listeners
- ❌ Use MutationObserver with expensive processing

## Admin Performance

### Configuration Endpoint
- `Cache-Control: public, max-age=300, stale-while-revalidate=60`
- ETag-based conditional requests (304 Not Modified)
- JSON response (no HTML parsing needed)

### Analytics
- Storefront batches events locally (up to 50 events or 30s flush interval)
- Uses `navigator.sendBeacon()` for non-blocking transmission
- Fallback to `fetch()` with `keepalive: true`

## Performance Testing

### Bundle Size Check
```bash
npm run storefront:build
npm run storefront:check-size
```

### FPS Testing
Use Chrome DevTools Performance tab to verify 60fps cursor rendering.

### Lighthouse
The storefront runtime should not measurably impact Lighthouse performance scores.
