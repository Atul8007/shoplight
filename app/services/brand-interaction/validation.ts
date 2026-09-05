import { z } from "zod";

// ── Hex color validation ─────────────────────────────────────────────
export const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Must be a valid hex color");

// ── Cursor types ─────────────────────────────────────────────────────
export const CursorTypeSchema = z.enum(["default", "dot", "ring", "crosshair", "image", "svg", "emoji"]);
export type CursorType = z.infer<typeof CursorTypeSchema>;

// ── Blend modes ──────────────────────────────────────────────────────
export const BlendModeSchema = z.enum(["normal", "multiply", "screen", "difference"]);

// ── Element types ────────────────────────────────────────────────────
export const ElementTypeSchema = z.enum([
  "PRODUCT_IMAGE", "PRODUCT_CARD", "ADD_TO_CART", "WISHLIST",
  "BUTTON", "LINK", "CART", "SEARCH",
]);
export type ElementType = z.infer<typeof ElementTypeSchema>;

// ── Page types ───────────────────────────────────────────────────────
export const PageTypeSchema = z.enum(["home", "product", "collection", "cart", "search", "page"]);

// ── Device types ─────────────────────────────────────────────────────
export const DeviceTypeSchema = z.enum(["desktop", "tablet", "mobile"]);

// ── Rule conditions ──────────────────────────────────────────────────
export const RuleConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("element"), target: ElementTypeSchema }),
  z.object({ type: z.literal("page"), pageType: PageTypeSchema }),
  z.object({ type: z.literal("product"), productId: z.string().min(1) }),
  z.object({ type: z.literal("collection"), collectionId: z.string().min(1) }),
  z.object({ type: z.literal("device"), device: DeviceTypeSchema }),
  z.object({ type: z.literal("reduced_motion"), enabled: z.boolean() }),
]);
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

// ── Rule actions ─────────────────────────────────────────────────────
export const RuleActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CHANGE_CURSOR"), cursor: CursorTypeSchema, label: z.string().max(50).optional() }),
  z.object({ type: z.literal("PLAY_EFFECT"), effect: z.enum(["ripple", "particle"]), durationMs: z.number().int().min(50).max(3000).optional() }),
  z.object({ type: z.literal("SCALE"), scale: z.number().min(0.5).max(3) }),
  z.object({ type: z.literal("SHOW_LABEL"), label: z.string().max(50) }),
  z.object({ type: z.literal("RIPPLE"), color: HexColorSchema.optional(), durationMs: z.number().int().min(50).max(3000).optional() }),
  z.object({ type: z.literal("PARTICLE"), color: HexColorSchema.optional(), count: z.number().int().min(1).max(50).optional() }),
  z.object({ type: z.literal("MAGNETIC"), intensity: z.number().min(0).max(1) }),
  z.object({ type: z.literal("DISABLE_TRAIL") }),
  z.object({ type: z.literal("ENABLE_TRAIL"), length: z.number().int().min(1).max(30).optional() }),
]);
export type RuleAction = z.infer<typeof RuleActionSchema>;

// ── Experience rule configuration ────────────────────────────────────
export const ExperienceRuleConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  priority: z.number().int().min(0).max(1000),
  condition: RuleConditionSchema,
  action: RuleActionSchema,
  enabled: z.boolean(),
});
export type ExperienceRuleConfig = z.infer<typeof ExperienceRuleConfigSchema>;

// ── Cursor configuration ─────────────────────────────────────────────
export const CursorConfigSchema = z.object({
  type: CursorTypeSchema,
  size: z.number().int().min(4).max(96),
  color: HexColorSchema,
  opacity: z.number().min(0).max(1),
  blendMode: BlendModeSchema,
  imageUrl: z.string().url().optional(),
  svgMarkup: z.string().max(100_000).optional(),
  emoji: z.string().max(4).optional(),
});

// ── Motion configuration ─────────────────────────────────────────────
export const MotionConfigSchema = z.object({
  trail: z.boolean(),
  trailLength: z.number().int().min(0).max(30),
  magnetic: z.boolean(),
  intensity: z.number().min(0).max(1),
});

// ── Hover configuration ──────────────────────────────────────────────
export const HoverConfigSchema = z.object({
  enabled: z.boolean(),
  scale: z.number().min(0.5).max(3),
  label: z.string().max(50).optional(),
});

// ── Click configuration ──────────────────────────────────────────────
export const ClickConfigSchema = z.object({
  effect: z.enum(["none", "ripple", "particle"]),
});

// ── Full experience configuration ────────────────────────────────────
export const ExperienceConfigurationSchema = z.object({
  schemaVersion: z.literal(1),
  enabled: z.boolean(),
  analyticsEnabled: z.boolean(),
  reduceMotion: z.boolean(),
  cursor: CursorConfigSchema,
  motion: MotionConfigSchema,
  hover: HoverConfigSchema,
  click: ClickConfigSchema,
  rules: z.array(ExperienceRuleConfigSchema).max(100),
}).strict();
export type ExperienceConfiguration = z.infer<typeof ExperienceConfigurationSchema>;

// ── Security: reject any JS-containing configuration ─────────────────
const FORBIDDEN_KEYS = ["javascript", "customJavaScript", "script", "eval", "Function"];

function containsForbiddenKeys(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.includes(key)) return true;
    if (containsForbiddenKeys((obj as Record<string, unknown>)[key])) return true;
  }
  return false;
}

export function validateExperienceConfiguration(
  value: unknown,
): { ok: true; data: ExperienceConfiguration } | { ok: false; errors: string[] } {
  if (containsForbiddenKeys(value)) {
    return { ok: false, errors: ["Configuration must not contain JavaScript or script keys."] };
  }
  const result = ExperienceConfigurationSchema.safeParse(value);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  return { ok: true, data: result.data };
}

// ── Brand profile validation ─────────────────────────────────────────
export const BrandProfileUpdateSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: HexColorSchema,
  secondaryColor: HexColorSchema,
  accentColor: HexColorSchema,
  style: z.enum(["minimal", "luxury", "playful", "futuristic", "organic", "bold", "custom"]),
});
export type BrandProfileUpdate = z.infer<typeof BrandProfileUpdateSchema>;

// ── Analytics event validation ───────────────────────────────────────
export const AnalyticsEventPayloadSchema = z.object({
  sessionId: z.string().min(8).max(64),
  experienceId: z.string().min(1).max(64),
  events: z.array(z.object({
    eventType: z.enum([
      "experience_loaded", "cursor_interaction", "element_hover",
      "element_click", "effect_triggered", "experience_disabled",
    ]),
    pageType: PageTypeSchema.optional(),
    elementType: ElementTypeSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    occurredAt: z.string().datetime(),
  })).min(1).max(100),
  deviceType: DeviceTypeSchema,
});
export type AnalyticsEventPayload = z.infer<typeof AnalyticsEventPayloadSchema>;

// ── Rule creation/update validation ──────────────────────────────────
export const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  priority: z.number().int().min(0).max(1000).default(0),
  condition: RuleConditionSchema,
  action: RuleActionSchema,
  enabled: z.boolean().default(true),
});

export const UpdateRuleSchema = CreateRuleSchema.partial();
