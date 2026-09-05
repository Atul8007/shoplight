import type { ExperienceConfiguration } from "./validation";

export type ExperienceTemplate = {
  key: string;
  name: string;
  category: string;
  description: string;
  configuration: ExperienceConfiguration;
};

/** Default experience configuration — the "Minimal Brand" base. */
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
    { name: "Wishlist", priority: 35, condition: { type: "element", target: "WISHLIST" }, action: { type: "CHANGE_CURSOR", cursor: "emoji", label: "Save" }, enabled: true },
  ],
};

function makeTemplate(
  key: string,
  name: string,
  category: string,
  description: string,
  overrides: Partial<ExperienceConfiguration["cursor"]>,
  motionOverrides?: Partial<ExperienceConfiguration["motion"]>,
  clickOverrides?: Partial<ExperienceConfiguration["click"]>,
): ExperienceTemplate {
  return {
    key,
    name,
    category,
    description,
    configuration: {
      ...DEFAULT_EXPERIENCE_CONFIGURATION,
      cursor: { ...DEFAULT_EXPERIENCE_CONFIGURATION.cursor, ...overrides },
      motion: { ...DEFAULT_EXPERIENCE_CONFIGURATION.motion, ...motionOverrides },
      click: { ...DEFAULT_EXPERIENCE_CONFIGURATION.click, ...clickOverrides },
    },
  };
}

export const EXPERIENCE_TEMPLATES: ExperienceTemplate[] = [
  makeTemplate("minimal", "Minimal", "minimal", "Clean, understated cursor for minimal brands.", { color: "#111111", type: "dot", size: 14 }),
  makeTemplate("luxury-gold", "Luxury Gold", "luxury", "Premium gold ring cursor with smooth hover.", { color: "#D4AF37", type: "ring", size: 22 }, { magnetic: true, intensity: 0.2 }),
  makeTemplate("playful", "Playful", "playful", "Fun emoji-based cursor with particles on click.", { color: "#FF4F9A", type: "emoji", emoji: "✨", size: 24 }, { trail: true, trailLength: 5 }, { effect: "particle" }),
  makeTemplate("futuristic", "Futuristic", "futuristic", "Sci-fi crosshair cursor with blend mode.", { color: "#00D1FF", type: "crosshair", size: 20, blendMode: "difference" }),
  makeTemplate("organic", "Organic", "organic", "Natural, soft ring cursor in earthy green.", { color: "#3A7D44", type: "ring", size: 20 }),
  makeTemplate("fashion", "Fashion", "fashion", "Sleek dark dot cursor for fashion brands.", { color: "#0F172A", type: "dot", size: 12 }),
  makeTemplate("beauty", "Beauty", "beauty", "Elegant purple ring cursor for beauty brands.", { color: "#C026D3", type: "ring", size: 18 }, { magnetic: true, intensity: 0.15 }),
  makeTemplate("gaming", "Gaming", "gaming", "High-energy neon crosshair cursor.", { color: "#39FF14", type: "crosshair", size: 22, blendMode: "screen" }, { trail: true, trailLength: 8 }),
  makeTemplate("seasonal", "Seasonal", "seasonal", "Festive red dot cursor for seasonal campaigns.", { color: "#B91C1C", type: "dot", size: 16 }),
  makeTemplate("brand-logo", "Brand Logo", "brand", "Use your brand logo as the cursor.", { color: "#111111", type: "image", size: 32 }),
];

/** Deep-clone a template's configuration so the merchant gets an independent copy. */
export function cloneTemplateConfiguration(templateKey: string): ExperienceConfiguration {
  const found = EXPERIENCE_TEMPLATES.find((t) => t.key === templateKey) ?? EXPERIENCE_TEMPLATES[0];
  return JSON.parse(JSON.stringify(found.configuration)) as ExperienceConfiguration;
}
