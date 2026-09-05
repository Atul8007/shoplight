import { describe, it, expect } from "vitest";
import {
  hasEntitlement,
  FEATURE_FLAGS,
  type Plan,
  type Feature,
} from "../app/services/brand-interaction/entitlements";

describe("hasEntitlement", () => {
  it("FREE plan has BASIC_TEMPLATES", () => {
    expect(hasEntitlement("FREE", "BASIC_TEMPLATES")).toBe(true);
  });

  it("FREE plan does NOT have ADVANCED_INTERACTIONS", () => {
    expect(hasEntitlement("FREE", "ADVANCED_INTERACTIONS")).toBe(false);
  });

  it("FREE plan does NOT have ANALYTICS", () => {
    expect(hasEntitlement("FREE", "ANALYTICS")).toBe(false);
  });

  it("STARTER plan has ADVANCED_INTERACTIONS", () => {
    expect(hasEntitlement("STARTER", "ADVANCED_INTERACTIONS")).toBe(true);
  });

  it("STARTER plan has CUSTOM_ASSETS", () => {
    expect(hasEntitlement("STARTER", "CUSTOM_ASSETS")).toBe(true);
  });

  it("STARTER plan does NOT have ANALYTICS", () => {
    expect(hasEntitlement("STARTER", "ANALYTICS")).toBe(false);
  });

  it("GROWTH plan has ANALYTICS", () => {
    expect(hasEntitlement("GROWTH", "ANALYTICS")).toBe(true);
  });

  it("GROWTH plan does NOT have AI", () => {
    expect(hasEntitlement("GROWTH", "AI")).toBe(false);
  });

  it("PRO plan has everything", () => {
    const features: Feature[] = [
      "BASIC_TEMPLATES",
      "ADVANCED_INTERACTIONS",
      "CUSTOM_ASSETS",
      "ANALYTICS",
      "AB_TESTING",
      "AI",
    ];
    for (const feature of features) {
      expect(hasEntitlement("PRO", feature)).toBe(true);
    }
  });

  it("entitlement hierarchy is correct (PRO > GROWTH > STARTER > FREE)", () => {
    const plans: Plan[] = ["FREE", "STARTER", "GROWTH", "PRO"];
    // Each higher plan should have at least as many features
    let prevCount = 0;
    for (const plan of plans) {
      const features: Feature[] = [
        "BASIC_TEMPLATES",
        "ADVANCED_INTERACTIONS",
        "CUSTOM_ASSETS",
        "ANALYTICS",
        "AB_TESTING",
        "AI",
      ];
      const count = features.filter((f) => hasEntitlement(plan, f)).length;
      expect(count).toBeGreaterThanOrEqual(prevCount);
      prevCount = count;
    }
  });
});

describe("FEATURE_FLAGS", () => {
  it("has expected flag keys", () => {
    expect(FEATURE_FLAGS).toHaveProperty("ENABLE_ANALYTICS");
    expect(FEATURE_FLAGS).toHaveProperty("ENABLE_TOUCH_EFFECTS");
    expect(FEATURE_FLAGS).toHaveProperty("ENABLE_ADVANCED_RULES");
    expect(FEATURE_FLAGS).toHaveProperty("ENABLE_AB_TESTING");
    expect(FEATURE_FLAGS).toHaveProperty("ENABLE_AI");
    expect(FEATURE_FLAGS).toHaveProperty("ENABLE_HEATMAPS");
  });

  it("AB_TESTING is disabled by default", () => {
    expect(FEATURE_FLAGS.ENABLE_AB_TESTING).toBe(false);
  });

  it("AI is disabled by default", () => {
    expect(FEATURE_FLAGS.ENABLE_AI).toBe(false);
  });

  it("HEATMAPS is disabled by default", () => {
    expect(FEATURE_FLAGS.ENABLE_HEATMAPS).toBe(false);
  });
});
