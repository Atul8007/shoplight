# Rule Engine Documentation

## Overview

The Rule Engine is the core decision system that maps storefront events to visual actions. It evaluates declarative rules configured by the merchant and produces safe, predefined visual effects.

## Rule Structure

```typescript
{
  name: string;       // Human-readable name
  priority: number;   // 0-1000, higher = more specific
  condition: {
    type: "element" | "page" | "product" | "collection" | "device" | "reduced_motion";
    // + type-specific fields
  };
  action: {
    type: "CHANGE_CURSOR" | "SCALE" | "SHOW_LABEL" | "RIPPLE" | ...;
    // + action-specific fields
  };
  enabled: boolean;
}
```

## Condition Types (V1)

| Type | Fields | Example |
|:-----|:-------|:--------|
| `element` | `target: ElementType` | `{ type: "element", target: "ADD_TO_CART" }` |
| `page` | `pageType` | `{ type: "page", pageType: "product" }` |
| `product` | `productId` | `{ type: "product", productId: "gid://..." }` |
| `collection` | `collectionId` | `{ type: "collection", collectionId: "gid://..." }` |
| `device` | `device` | `{ type: "device", device: "desktop" }` |
| `reduced_motion` | `enabled` | `{ type: "reduced_motion", enabled: true }` |

## Action Types (V1)

| Type | Fields | Description |
|:-----|:-------|:------------|
| `CHANGE_CURSOR` | `cursor`, `label?` | Switch to different cursor type |
| `SCALE` | `scale` | Scale the cursor |
| `SHOW_LABEL` | `label` | Show text label near cursor |
| `RIPPLE` | `color?`, `durationMs?` | Play ripple on click |
| `PARTICLE` | `color?`, `count?` | Emit particles on click |
| `MAGNETIC` | `intensity` | Magnetic attraction to elements |
| `DISABLE_TRAIL` | — | Disable cursor trail |
| `ENABLE_TRAIL` | `length?` | Enable cursor trail |

## Precedence

When multiple rules match, the highest `priority` wins.

Recommended priority ranges:
1. Product-specific rules: 50-100
2. Collection-specific rules: 40-49
3. Element-specific rules: 20-39
4. Page-level rules: 10-19
5. Global/default rules: 0-9

## Security

- All rules are **declarative** — no arbitrary JavaScript execution
- Conditions and actions are validated against Zod schemas
- The `validateExperienceConfiguration()` function rejects any configuration containing `javascript`, `eval`, `Function`, or `script` keys
- Actions are mapped to predefined renderer functions, not arbitrary code

## Performance

- Rules are evaluated on `mouseover` (element enter), NOT on every `mousemove`
- Element type resolution is cached via `WeakMap`
- Only enabled rules are evaluated
- Rules are pre-sorted by priority
- The entire evaluation is synchronous and O(n) where n = number of rules

## Extensibility

Adding new condition types or action types requires:
1. Adding the discriminated union variant to the Zod schema
2. Adding the matching logic in `matchCondition()`
3. Adding the execution logic in `executeAction()`
4. No changes to the rule storage or evaluation infrastructure
