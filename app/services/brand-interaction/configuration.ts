export type CursorType = "default" | "dot" | "ring" | "crosshair" | "image" | "svg" | "emoji";
export type ElementType = "PRODUCT_IMAGE" | "PRODUCT_CARD" | "ADD_TO_CART" | "WISHLIST" | "BUTTON" | "LINK" | "CART" | "SEARCH";
export type RuleCondition =
  | { type: "element"; target: ElementType }
  | { type: "page"; pageType: "home" | "product" | "collection" | "cart" | "search" | "page" }
  | { type: "product"; productId: string }
  | { type: "collection"; collectionId: string }
  | { type: "device"; device: "desktop" | "tablet" | "mobile" }
  | { type: "reduced_motion"; enabled: boolean };
export type RuleAction =
  | { type: "CHANGE_CURSOR"; cursor: CursorType; label?: string }
  | { type: "PLAY_EFFECT"; effect: "ripple" | "particle"; durationMs?: number }
  | { type: "SCALE"; scale: number }
  | { type: "SHOW_LABEL"; label: string }
  | { type: "RIPPLE"; color?: string; durationMs?: number }
  | { type: "PARTICLE"; color?: string; count?: number }
  | { type: "MAGNETIC"; intensity: number }
  | { type: "DISABLE_TRAIL" }
  | { type: "ENABLE_TRAIL"; length?: number };
export type ExperienceRuleConfiguration = { id?: string; name: string; priority: number; condition: RuleCondition; action: RuleAction; enabled: boolean };
export type ExperienceConfiguration = {
  schemaVersion: 1;
  enabled: boolean;
  analyticsEnabled: boolean;
  reduceMotion: boolean;
  cursor: { type: CursorType; size: number; color: string; opacity: number; blendMode: "normal" | "multiply" | "screen" | "difference"; imageUrl?: string; svgMarkup?: string; emoji?: string };
  motion: { trail: boolean; trailLength: number; magnetic: boolean; intensity: number };
  hover: { enabled: boolean; scale: number; label?: string };
  click: { effect: "none" | "ripple" | "particle" };
  rules: ExperienceRuleConfiguration[];
};
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
export const DEFAULT_EXPERIENCE_CONFIGURATION: ExperienceConfiguration = {
  schemaVersion: 1,
  enabled: true,
  analyticsEnabled: false,
  reduceMotion: false,
  cursor: { type: "dot", size: 18, color: "#111111", opacity: 1, blendMode: "normal" },
  motion: { trail: false, trailLength: 0, magnetic: false, intensity: 0.3 },
  hover: { enabled: true, scale: 1.1 },
  click: { effect: "ripple" },
  rules: [
    { name: "Product image", priority: 30, condition: { type: "element", target: "PRODUCT_IMAGE" }, action: { type: "CHANGE_CURSOR", cursor: "ring", label: "View" }, enabled: true },
    { name: "Add to cart", priority: 40, condition: { type: "element", target: "ADD_TO_CART" }, action: { type: "CHANGE_CURSOR", cursor: "emoji", label: "Add" }, enabled: true },
    { name: "Wishlist", priority: 35, condition: { type: "element", target: "WISHLIST" }, action: { type: "CHANGE_CURSOR", cursor: "emoji", label: "Save" }, enabled: true }
  ]
};
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validateExperienceConfiguration(value: unknown): { ok: true; data: ExperienceConfiguration } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(value)) return { ok: false, errors: ["Configuration must be an object."] };
  const config = value as ExperienceConfiguration;
  if (config.schemaVersion !== 1) errors.push("Unsupported schemaVersion.");
  if (!isObject(config.cursor)) errors.push("Cursor configuration is required.");
  if (config.cursor && !["default", "dot", "ring", "crosshair", "image", "svg", "emoji"].includes(config.cursor.type)) errors.push("Cursor type is invalid.");
  if (config.cursor && !isValidHexColor(config.cursor.color)) errors.push("Cursor color must be a valid hex color.");
  if (config.cursor && (!Number.isFinite(config.cursor.size) || config.cursor.size < 4 || config.cursor.size > 96)) errors.push("Cursor size must be between 4 and 96.");
  if (config.cursor && (!Number.isFinite(config.cursor.opacity) || config.cursor.opacity < 0 || config.cursor.opacity > 1)) errors.push("Cursor opacity must be between 0 and 1.");
  if (!Array.isArray(config.rules)) errors.push("Rules must be an array.");
  for (const [index, rule] of (Array.isArray(config.rules) ? config.rules : []).entries()) {
    if (!isObject(rule)) errors.push(`Rule ${index + 1} must be an object.`);
    if (isObject(rule) && (!isObject(rule.condition) || !isObject(rule.action))) errors.push(`Rule ${index + 1} must be declarative.`);
    if (isObject(rule) && ("javascript" in rule || "customJavaScript" in rule)) errors.push(`Rule ${index + 1} cannot include JavaScript.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, data: config };
}

