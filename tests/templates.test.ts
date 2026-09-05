import { describe, it, expect } from "vitest";
import {
  EXPERIENCE_TEMPLATES,
  cloneTemplateConfiguration,
  DEFAULT_EXPERIENCE_CONFIGURATION,
} from "../app/services/brand-interaction/templates";
import { validateExperienceConfiguration } from "../app/services/brand-interaction/validation";

describe("EXPERIENCE_TEMPLATES", () => {
  it("has at least 10 templates", () => {
    expect(EXPERIENCE_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("each template has a unique key", () => {
    const keys = EXPERIENCE_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each template has a valid configuration", () => {
    for (const template of EXPERIENCE_TEMPLATES) {
      const result = validateExperienceConfiguration(template.configuration);
      expect(result.ok, `Template "${template.key}" should have valid config: ${JSON.stringify(!result.ok ? result.errors : [])}`).toBe(true);
    }
  });

  it("each template has required fields", () => {
    for (const template of EXPERIENCE_TEMPLATES) {
      expect(template.key).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(template.description).toBeTruthy();
    }
  });
});

describe("DEFAULT_EXPERIENCE_CONFIGURATION", () => {
  it("is a valid configuration", () => {
    const result = validateExperienceConfiguration(DEFAULT_EXPERIENCE_CONFIGURATION);
    expect(result.ok).toBe(true);
  });

  it("has schemaVersion 1", () => {
    expect(DEFAULT_EXPERIENCE_CONFIGURATION.schemaVersion).toBe(1);
  });

  it("has default rules", () => {
    expect(DEFAULT_EXPERIENCE_CONFIGURATION.rules.length).toBeGreaterThan(0);
  });

  it("has reduceMotion disabled by default", () => {
    expect(DEFAULT_EXPERIENCE_CONFIGURATION.reduceMotion).toBe(false);
  });
});

describe("cloneTemplateConfiguration", () => {
  it("returns a deep copy (not a reference)", () => {
    const clone = cloneTemplateConfiguration("minimal");
    clone.cursor.color = "#FF0000";
    const original = EXPERIENCE_TEMPLATES.find((t) => t.key === "minimal")!;
    expect(original.configuration.cursor.color).not.toBe("#FF0000");
  });

  it("falls back to first template for unknown key", () => {
    const clone = cloneTemplateConfiguration("nonexistent");
    expect(clone).toBeDefined();
    expect(clone.schemaVersion).toBe(1);
  });

  it("cloned configuration passes validation", () => {
    for (const template of EXPERIENCE_TEMPLATES) {
      const clone = cloneTemplateConfiguration(template.key);
      const result = validateExperienceConfiguration(clone);
      expect(result.ok, `Cloned "${template.key}" should validate`).toBe(true);
    }
  });
});
