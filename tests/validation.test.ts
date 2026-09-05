import { describe, it, expect } from "vitest";
import {
  validateExperienceConfiguration,
  ExperienceConfigurationSchema,
  BrandProfileUpdateSchema,
  CreateRuleSchema,
  AnalyticsEventPayloadSchema,
  HexColorSchema,
} from "../app/services/brand-interaction/validation";

// ── Hex Color Validation ─────────────────────────────────────────────

describe("HexColorSchema", () => {
  it("accepts valid 6-digit hex colors", () => {
    expect(HexColorSchema.safeParse("#D4AF37").success).toBe(true);
    expect(HexColorSchema.safeParse("#000000").success).toBe(true);
    expect(HexColorSchema.safeParse("#FFFFFF").success).toBe(true);
    expect(HexColorSchema.safeParse("#aabbcc").success).toBe(true);
  });

  it("accepts valid 3-digit hex colors", () => {
    expect(HexColorSchema.safeParse("#FFF").success).toBe(true);
    expect(HexColorSchema.safeParse("#abc").success).toBe(true);
  });

  it("rejects invalid colors", () => {
    expect(HexColorSchema.safeParse("red").success).toBe(false);
    expect(HexColorSchema.safeParse("rgb(0,0,0)").success).toBe(false);
    expect(HexColorSchema.safeParse("#GGGGGG").success).toBe(false);
    expect(HexColorSchema.safeParse("").success).toBe(false);
    expect(HexColorSchema.safeParse("#12345").success).toBe(false);
  });
});

// ── Experience Configuration Validation ──────────────────────────────

describe("validateExperienceConfiguration", () => {
  const validConfig = {
    schemaVersion: 1,
    enabled: true,
    analyticsEnabled: false,
    reduceMotion: false,
    cursor: {
      type: "dot",
      size: 18,
      color: "#111111",
      opacity: 1,
      blendMode: "normal",
    },
    motion: { trail: false, trailLength: 0, magnetic: false, intensity: 0.3 },
    hover: { enabled: true, scale: 1.1 },
    click: { effect: "ripple" },
    rules: [],
  };

  it("validates a correct configuration", () => {
    const result = validateExperienceConfiguration(validConfig);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(1);
      expect(result.data.cursor.type).toBe("dot");
    }
  });

  it("validates configuration with rules", () => {
    const config = {
      ...validConfig,
      rules: [
        {
          name: "Product image",
          priority: 30,
          condition: { type: "element", target: "PRODUCT_IMAGE" },
          action: { type: "CHANGE_CURSOR", cursor: "ring", label: "View" },
          enabled: true,
        },
      ],
    };
    const result = validateExperienceConfiguration(config);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid schemaVersion", () => {
    const result = validateExperienceConfiguration({ ...validConfig, schemaVersion: 2 });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid cursor type", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      cursor: { ...validConfig.cursor, type: "laser" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid cursor color", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      cursor: { ...validConfig.cursor, color: "red" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects cursor size out of range", () => {
    const tooSmall = validateExperienceConfiguration({
      ...validConfig,
      cursor: { ...validConfig.cursor, size: 2 },
    });
    expect(tooSmall.ok).toBe(false);

    const tooBig = validateExperienceConfiguration({
      ...validConfig,
      cursor: { ...validConfig.cursor, size: 200 },
    });
    expect(tooBig.ok).toBe(false);
  });

  it("rejects cursor opacity out of range", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      cursor: { ...validConfig.cursor, opacity: 1.5 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateExperienceConfiguration(null).ok).toBe(false);
    expect(validateExperienceConfiguration("string").ok).toBe(false);
    expect(validateExperienceConfiguration(42).ok).toBe(false);
  });

  it("rejects too many rules", () => {
    const tooManyRules = Array.from({ length: 101 }, (_, i) => ({
      name: `Rule ${i}`,
      priority: i,
      condition: { type: "element" as const, target: "BUTTON" as const },
      action: { type: "SCALE" as const, scale: 1.1 },
      enabled: true,
    }));
    const result = validateExperienceConfiguration({
      ...validConfig,
      rules: tooManyRules,
    });
    expect(result.ok).toBe(false);
  });

  // ── Security Tests ─────────────────────────────────────────────────

  it("rejects configuration containing 'javascript' key", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      javascript: "alert(1)",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("JavaScript");
    }
  });

  it("rejects configuration containing 'customJavaScript' key", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      customJavaScript: "document.cookie",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects configuration containing 'eval' key in nested objects", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      cursor: { ...validConfig.cursor, eval: "alert(1)" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects extra unknown properties via strict mode", () => {
    const result = validateExperienceConfiguration({
      ...validConfig,
      unknownField: "should fail",
    });
    expect(result.ok).toBe(false);
  });
});

// ── Rule Validation ──────────────────────────────────────────────────

describe("CreateRuleSchema", () => {
  it("validates a correct element rule", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Product hover",
      priority: 10,
      condition: { type: "element", target: "PRODUCT_IMAGE" },
      action: { type: "CHANGE_CURSOR", cursor: "ring", label: "View" },
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates a page-type rule", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Home page",
      priority: 5,
      condition: { type: "page", pageType: "home" },
      action: { type: "SCALE", scale: 1.2 },
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates a device-type rule", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Desktop only",
      priority: 0,
      condition: { type: "device", device: "desktop" },
      action: { type: "ENABLE_TRAIL", length: 5 },
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = CreateRuleSchema.safeParse({
      name: "",
      priority: 10,
      condition: { type: "element", target: "BUTTON" },
      action: { type: "SCALE", scale: 1.1 },
      enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid element target", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Bad rule",
      priority: 10,
      condition: { type: "element", target: "INVALID_ELEMENT" },
      action: { type: "SCALE", scale: 1.1 },
      enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action type", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Bad rule",
      priority: 10,
      condition: { type: "element", target: "BUTTON" },
      action: { type: "EXECUTE_JAVASCRIPT", code: "alert(1)" },
      enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects scale out of range", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Too big",
      priority: 10,
      condition: { type: "element", target: "BUTTON" },
      action: { type: "SCALE", scale: 10 },
      enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects magnetic intensity out of range", () => {
    const result = CreateRuleSchema.safeParse({
      name: "Too intense",
      priority: 10,
      condition: { type: "element", target: "BUTTON" },
      action: { type: "MAGNETIC", intensity: 5 },
      enabled: true,
    });
    expect(result.success).toBe(false);
  });
});

// ── Brand Profile Validation ─────────────────────────────────────────

describe("BrandProfileUpdateSchema", () => {
  it("validates correct brand profile", () => {
    const result = BrandProfileUpdateSchema.safeParse({
      primaryColor: "#111111",
      secondaryColor: "#FFFFFF",
      accentColor: "#D4AF37",
      style: "luxury",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid style", () => {
    const result = BrandProfileUpdateSchema.safeParse({
      primaryColor: "#111111",
      secondaryColor: "#FFFFFF",
      accentColor: "#D4AF37",
      style: "neon",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid color format", () => {
    const result = BrandProfileUpdateSchema.safeParse({
      primaryColor: "blue",
      secondaryColor: "#FFFFFF",
      accentColor: "#D4AF37",
      style: "minimal",
    });
    expect(result.success).toBe(false);
  });
});

// ── Analytics Event Validation ───────────────────────────────────────

describe("AnalyticsEventPayloadSchema", () => {
  it("validates correct analytics payload", () => {
    const result = AnalyticsEventPayloadSchema.safeParse({
      sessionId: "bi_abc12345",
      experienceId: "exp_123",
      events: [
        {
          eventType: "experience_loaded",
          pageType: "home",
          occurredAt: new Date().toISOString(),
        },
      ],
      deviceType: "desktop",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid event type", () => {
    const result = AnalyticsEventPayloadSchema.safeParse({
      sessionId: "bi_abc12345",
      experienceId: "exp_123",
      events: [
        {
          eventType: "mouse_trajectory",
          occurredAt: new Date().toISOString(),
        },
      ],
      deviceType: "desktop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty events array", () => {
    const result = AnalyticsEventPayloadSchema.safeParse({
      sessionId: "bi_abc12345",
      experienceId: "exp_123",
      events: [],
      deviceType: "desktop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many events (>100)", () => {
    const events = Array.from({ length: 101 }, () => ({
      eventType: "element_hover" as const,
      occurredAt: new Date().toISOString(),
    }));
    const result = AnalyticsEventPayloadSchema.safeParse({
      sessionId: "bi_abc12345",
      experienceId: "exp_123",
      events,
      deviceType: "desktop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short session ID", () => {
    const result = AnalyticsEventPayloadSchema.safeParse({
      sessionId: "abc",
      experienceId: "exp_123",
      events: [{ eventType: "experience_loaded", occurredAt: new Date().toISOString() }],
      deviceType: "desktop",
    });
    expect(result.success).toBe(false);
  });
});
