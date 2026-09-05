export type Plan = "FREE" | "STARTER" | "GROWTH" | "PRO";
export type Feature = "BASIC_TEMPLATES" | "ADVANCED_INTERACTIONS" | "CUSTOM_ASSETS" | "ANALYTICS" | "AB_TESTING" | "AI";
const FEATURE_PLANS: Record<Feature, Plan[]> = {
  BASIC_TEMPLATES: ["FREE", "STARTER", "GROWTH", "PRO"],
  ADVANCED_INTERACTIONS: ["STARTER", "GROWTH", "PRO"],
  CUSTOM_ASSETS: ["STARTER", "GROWTH", "PRO"],
  ANALYTICS: ["GROWTH", "PRO"],
  AB_TESTING: ["PRO"],
  AI: ["PRO"]
};
export function hasEntitlement(plan: Plan, feature: Feature) {
  return FEATURE_PLANS[feature].includes(plan);
}
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === "true",
  ENABLE_TOUCH_EFFECTS: process.env.ENABLE_TOUCH_EFFECTS === "true",
  ENABLE_ADVANCED_RULES: process.env.ENABLE_ADVANCED_RULES === "true",
  ENABLE_AB_TESTING: false,
  ENABLE_AI: false,
  ENABLE_HEATMAPS: false
};

