import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, TextField, Select,
  RangeSlider, Checkbox, Button, Banner, Badge, Divider, Box, Collapsible,
  Modal,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import {
  getExperience, updateExperienceDraft, publishExperience,
} from "~/services/brand-interaction/experience.server";
import { createRule, deleteRule, toggleRule } from "~/services/brand-interaction/rules.server";
import type { ExperienceConfiguration } from "~/services/brand-interaction/validation";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const experience = await getExperience(shop.id, params.id!);
  return json({ experience, shopDomain: session.shop });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save") {
    const configStr = formData.get("configuration") as string;
    const name = formData.get("name") as string;
    try {
      const config = JSON.parse(configStr);
      const result = await updateExperienceDraft(shop.id, params.id!, {
        name,
        draftConfiguration: config,
      });
      if (!result.ok) return json({ intent, ok: false, errors: result.errors });
      return json({ intent, ok: true, errors: [] });
    } catch {
      return json({ intent, ok: false, errors: ["Invalid configuration JSON."] });
    }
  }

  if (intent === "publish") {
    const result = await publishExperience(shop.id, params.id!);
    if (!result.ok) return json({ intent, ok: false, errors: result.errors });
    return json({ intent, ok: true, errors: [] });
  }

  if (intent === "addRule") {
    const ruleStr = formData.get("rule") as string;
    try {
      const rule = JSON.parse(ruleStr);
      const result = await createRule(shop.id, params.id!, rule);
      if (!result.ok) return json({ intent, ok: false, errors: result.errors });
      return json({ intent, ok: true, errors: [] });
    } catch {
      return json({ intent, ok: false, errors: ["Invalid rule data."] });
    }
  }

  if (intent === "deleteRule") {
    const ruleId = formData.get("ruleId") as string;
    await deleteRule(shop.id, ruleId);
    return json({ intent, ok: true, errors: [] });
  }

  if (intent === "toggleRule") {
    const ruleId = formData.get("ruleId") as string;
    const enabled = formData.get("enabled") === "true";
    await toggleRule(shop.id, ruleId, enabled);
    return json({ intent, ok: true, errors: [] });
  }

  return json({ intent: "", ok: false, errors: ["Unknown action"] }, { status: 400 });
};

const CURSOR_TYPE_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Dot", value: "dot" },
  { label: "Ring", value: "ring" },
  { label: "Crosshair", value: "crosshair" },
  { label: "Image", value: "image" },
  { label: "SVG", value: "svg" },
  { label: "Emoji", value: "emoji" },
];

const BLEND_MODE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Multiply", value: "multiply" },
  { label: "Screen", value: "screen" },
  { label: "Difference", value: "difference" },
];

const CLICK_EFFECT_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Ripple", value: "ripple" },
  { label: "Particle", value: "particle" },
];

const ELEMENT_TYPE_OPTIONS = [
  { label: "Product Image", value: "PRODUCT_IMAGE" },
  { label: "Product Card", value: "PRODUCT_CARD" },
  { label: "Add to Cart", value: "ADD_TO_CART" },
  { label: "Wishlist", value: "WISHLIST" },
  { label: "Button", value: "BUTTON" },
  { label: "Link", value: "LINK" },
  { label: "Cart", value: "CART" },
  { label: "Search", value: "SEARCH" },
];

const ACTION_TYPE_OPTIONS = [
  { label: "Change Cursor", value: "CHANGE_CURSOR" },
  { label: "Scale", value: "SCALE" },
  { label: "Show Label", value: "SHOW_LABEL" },
  { label: "Ripple", value: "RIPPLE" },
  { label: "Magnetic", value: "MAGNETIC" },
];

export default function ExperienceEditor() {
  const { experience, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const config = experience.draftConfiguration as unknown as ExperienceConfiguration;
  const [name, setName] = useState(experience.name);
  const [cursorType, setCursorType] = useState(config.cursor.type);
  const [cursorSize, setCursorSize] = useState(config.cursor.size);
  const [cursorColor, setCursorColor] = useState(config.cursor.color);
  const [cursorOpacity, setCursorOpacity] = useState(config.cursor.opacity);
  const [blendMode, setBlendMode] = useState(config.cursor.blendMode);
  const [cursorEmoji, setCursorEmoji] = useState(config.cursor.emoji || "");
  const [hoverEnabled, setHoverEnabled] = useState(config.hover.enabled);
  const [hoverScale, setHoverScale] = useState(config.hover.scale);
  const [clickEffect, setClickEffect] = useState(config.click.effect);
  const [trailEnabled, setTrailEnabled] = useState(config.motion.trail);
  const [trailLength, setTrailLength] = useState(config.motion.trailLength);
  const [magneticEnabled, setMagneticEnabled] = useState(config.motion.magnetic);
  const [magneticIntensity, setMagneticIntensity] = useState(config.motion.intensity);
  const [reduceMotion, setReduceMotion] = useState(config.reduceMotion);
  const [enabled, setEnabled] = useState(config.enabled);

  // Rule creation state
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleElement, setNewRuleElement] = useState("PRODUCT_IMAGE");
  const [newRuleAction, setNewRuleAction] = useState("CHANGE_CURSOR");
  const [newRuleCursor, setNewRuleCursor] = useState("ring");

  // Preview ref
  const previewRef = useRef<HTMLDivElement>(null);

  const buildConfiguration = useCallback((): ExperienceConfiguration => ({
    schemaVersion: 1,
    enabled,
    analyticsEnabled: config.analyticsEnabled,
    reduceMotion,
    cursor: {
      type: cursorType,
      size: cursorSize,
      color: cursorColor,
      opacity: cursorOpacity,
      blendMode: blendMode as ExperienceConfiguration["cursor"]["blendMode"],
      ...(cursorType === "emoji" ? { emoji: cursorEmoji || "✨" } : {}),
    },
    motion: { trail: trailEnabled, trailLength, magnetic: magneticEnabled, intensity: magneticIntensity },
    hover: { enabled: hoverEnabled, scale: hoverScale },
    click: { effect: clickEffect as ExperienceConfiguration["click"]["effect"] },
    rules: config.rules,
  }), [
    enabled, reduceMotion, cursorType, cursorSize, cursorColor, cursorOpacity, blendMode,
    cursorEmoji, trailEnabled, trailLength, magneticEnabled, magneticIntensity,
    hoverEnabled, hoverScale, clickEffect, config.analyticsEnabled, config.rules,
  ]);

  const handleSave = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "save");
    fd.set("name", name);
    fd.set("configuration", JSON.stringify(buildConfiguration()));
    submit(fd, { method: "post" });
  }, [name, buildConfiguration, submit]);

  const handlePublish = useCallback(() => {
    // Save first, then publish
    const fd = new FormData();
    fd.set("intent", "publish");
    submit(fd, { method: "post" });
  }, [submit]);

  const handleAddRule = useCallback(() => {
    const rule = {
      name: newRuleName || "New Rule",
      priority: 10,
      condition: { type: "element", target: newRuleElement },
      action: newRuleAction === "CHANGE_CURSOR"
        ? { type: "CHANGE_CURSOR", cursor: newRuleCursor }
        : newRuleAction === "SCALE"
          ? { type: "SCALE", scale: 1.2 }
          : newRuleAction === "SHOW_LABEL"
            ? { type: "SHOW_LABEL", label: "View" }
            : newRuleAction === "RIPPLE"
              ? { type: "RIPPLE" }
              : { type: "MAGNETIC", intensity: 0.3 },
      enabled: true,
    };
    const fd = new FormData();
    fd.set("intent", "addRule");
    fd.set("rule", JSON.stringify(rule));
    submit(fd, { method: "post" });
    setShowAddRule(false);
    setNewRuleName("");
  }, [newRuleName, newRuleElement, newRuleAction, newRuleCursor, submit]);

  // Live preview cursor rendering
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [previewHover, setPreviewHover] = useState(false);

  return (
    <Page
      title={experience.name}
      backAction={{ url: "/app/experiences" }}
      titleMetadata={
        <Badge tone={experience.status === "PUBLISHED" ? "success" : "info"}>
          {`${experience.status} v${experience.version}`}
        </Badge>
      }
      primaryAction={{ content: "Save", onAction: handleSave, loading: isSubmitting }}
      secondaryActions={[
        { content: "Publish", onAction: handlePublish, disabled: isSubmitting },
      ]}
    >
      <BlockStack gap="500">
        {actionData && !actionData.ok && (
          <Banner title="Error" tone="critical">
            {actionData.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
          </Banner>
        )}
        {actionData?.ok && actionData.intent === "publish" && (
          <Banner title="Experience published!" tone="success" onDismiss={() => {}}>
            <p>Your experience is now live on your storefront.</p>
          </Banner>
        )}
        {actionData?.ok && actionData.intent === "save" && (
          <Banner title="Draft saved" tone="success" onDismiss={() => {}} />
        )}

        <Layout>
          {/* Left: Configuration */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* General */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">General</Text>
                  <TextField label="Experience Name" value={name} onChange={setName} autoComplete="off" />
                  <Checkbox label="Enabled" checked={enabled} onChange={setEnabled} />
                </BlockStack>
              </Card>

              {/* Cursor */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Cursor</Text>
                  <Select label="Type" options={CURSOR_TYPE_OPTIONS} value={cursorType} onChange={(v) => setCursorType(v as ExperienceConfiguration["cursor"]["type"])} />
                  <RangeSlider label={`Size: ${cursorSize}px`} value={cursorSize} min={4} max={96} onChange={(v) => setCursorSize(v as number)} output />
                  <TextField label="Color" value={cursorColor} onChange={setCursorColor} autoComplete="off"
                    prefix={<div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: cursorColor, border: "1px solid #ccc" }} />}
                  />
                  <RangeSlider label={`Opacity: ${cursorOpacity}`} value={cursorOpacity} min={0} max={1} step={0.05} onChange={(v) => setCursorOpacity(v as number)} output />
                  <Select label="Blend Mode" options={BLEND_MODE_OPTIONS} value={blendMode} onChange={(v) => setBlendMode(v as ExperienceConfiguration["cursor"]["blendMode"])} />
                  {cursorType === "emoji" && (
                    <TextField label="Emoji" value={cursorEmoji} onChange={setCursorEmoji} autoComplete="off" placeholder="✨" />
                  )}
                </BlockStack>
              </Card>

              {/* Hover */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Hover</Text>
                  <Checkbox label="Enable hover effects" checked={hoverEnabled} onChange={setHoverEnabled} />
                  {hoverEnabled && (
                    <RangeSlider label={`Scale: ${hoverScale}x`} value={hoverScale} min={0.5} max={3} step={0.05} onChange={(v) => setHoverScale(v as number)} output />
                  )}
                </BlockStack>
              </Card>

              {/* Click */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Click Effect</Text>
                  <Select label="Effect" options={CLICK_EFFECT_OPTIONS} value={clickEffect} onChange={(v) => setClickEffect(v as any)} />
                </BlockStack>
              </Card>

              {/* Trail / Motion */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Motion</Text>
                  <Checkbox label="Enable trail" checked={trailEnabled} onChange={setTrailEnabled} />
                  {trailEnabled && (
                    <RangeSlider label={`Trail Length: ${trailLength}`} value={trailLength} min={1} max={30} onChange={(v) => setTrailLength(v as number)} output />
                  )}
                  <Checkbox label="Enable magnetic effect" checked={magneticEnabled} onChange={setMagneticEnabled} />
                  {magneticEnabled && (
                    <RangeSlider label={`Intensity: ${magneticIntensity}`} value={magneticIntensity} min={0} max={1} step={0.05} onChange={(v) => setMagneticIntensity(v as number)} output />
                  )}
                </BlockStack>
              </Card>

              {/* Accessibility */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Accessibility</Text>
                  <Checkbox label="Reduce motion (disable trails, particles, large animations)" checked={reduceMotion} onChange={setReduceMotion} />
                </BlockStack>
              </Card>

              {/* Rules */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">Interaction Rules</Text>
                    <Button onClick={() => setShowAddRule(!showAddRule)} variant="plain">
                      {showAddRule ? "Cancel" : "Add Rule"}
                    </Button>
                  </InlineStack>

                  <Collapsible open={showAddRule} id="add-rule">
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="300">
                        <TextField label="Rule Name" value={newRuleName} onChange={setNewRuleName} autoComplete="off" placeholder="e.g., Product Image Hover" />
                        <Select label="When element" options={ELEMENT_TYPE_OPTIONS} value={newRuleElement} onChange={setNewRuleElement} />
                        <Select label="Action" options={ACTION_TYPE_OPTIONS} value={newRuleAction} onChange={setNewRuleAction} />
                        {newRuleAction === "CHANGE_CURSOR" && (
                          <Select label="Cursor" options={CURSOR_TYPE_OPTIONS} value={newRuleCursor} onChange={setNewRuleCursor} />
                        )}
                        <Button variant="primary" onClick={handleAddRule}>Save Rule</Button>
                      </BlockStack>
                    </Box>
                  </Collapsible>

                  {experience.rules.map((rule) => (
                    <Box key={rule.id} padding="300" borderWidth="025" borderColor="border" borderRadius="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">{rule.name}</Text>
                            <Badge tone={rule.enabled ? "success" : undefined}>
                              {rule.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </InlineStack>
                          <Text as="span" variant="bodySm" tone="subdued">
                            Priority: {rule.priority} · {(rule.condition as { type: string }).type}: {(rule.condition as { target?: string; pageType?: string }).target || (rule.condition as { pageType?: string }).pageType || ""} → {(rule.action as { type: string }).type}
                          </Text>
                        </BlockStack>
                        <InlineStack gap="100">
                          <Button
                            variant="plain"
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("intent", "toggleRule");
                              fd.set("ruleId", rule.id);
                              fd.set("enabled", (!rule.enabled).toString());
                              submit(fd, { method: "post" });
                            }}
                          >
                            {rule.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("intent", "deleteRule");
                              fd.set("ruleId", rule.id);
                              submit(fd, { method: "post" });
                            }}
                          >
                            Delete
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </Box>
                  ))}

                  {experience.rules.length === 0 && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      No rules yet. Add rules to customize how the cursor behaves on specific elements.
                    </Text>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Right: Live Preview */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Live Preview</Text>
                <div
                  ref={previewRef}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    cursor: "none",
                    minHeight: 400,
                    backgroundColor: "var(--p-color-bg-surface-secondary)",
                    borderRadius: 8,
                    padding: 16,
                  }}
                  onMouseMove={(e: React.MouseEvent) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setPreviewPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseEnter={() => setPreviewHover(true)}
                  onMouseLeave={() => setPreviewHover(false)}
                >
                  {/* Simulated storefront elements */}
                  <div style={{ padding: 20 }}>
                    <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e5e5e5" }}>
                      <div style={{ width: "100%", height: 120, backgroundColor: "#f3f4f6", borderRadius: 4, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Product Card</div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>$49.99</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, padding: "10px 16px", backgroundColor: "#111", color: "#fff", borderRadius: 6, textAlign: "center", fontSize: 13, fontWeight: 600 }}>
                        Add to Cart
                      </div>
                      <div style={{ padding: "10px 16px", backgroundColor: "#f9f9f9", borderRadius: 6, textAlign: "center", fontSize: 13, border: "1px solid #ddd" }}>
                        ♡
                      </div>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 12, color: "#999", textAlign: "center" }}>
                      Move your mouse here to preview
                    </div>
                  </div>

                  {/* Preview cursor */}
                  {previewHover && (
                    <div
                      style={{
                        position: "absolute",
                        left: previewPos.x,
                        top: previewPos.y,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 100,
                        transition: "width 0.15s, height 0.15s",
                      }}
                    >
                      {cursorType === "dot" && (
                        <div style={{
                          width: cursorSize, height: cursorSize, borderRadius: "50%",
                          backgroundColor: cursorColor, opacity: cursorOpacity,
                          mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
                        }} />
                      )}
                      {cursorType === "ring" && (
                        <div style={{
                          width: cursorSize, height: cursorSize, borderRadius: "50%",
                          border: `2px solid ${cursorColor}`, opacity: cursorOpacity,
                          mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
                        }} />
                      )}
                      {cursorType === "crosshair" && (
                        <div style={{ width: cursorSize, height: cursorSize, position: "relative", opacity: cursorOpacity }}>
                          <div style={{ position: "absolute", left: "50%", top: 0, width: 2, height: "100%", backgroundColor: cursorColor, transform: "translateX(-50%)" }} />
                          <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2, backgroundColor: cursorColor, transform: "translateY(-50%)" }} />
                        </div>
                      )}
                      {cursorType === "emoji" && (
                        <span style={{ fontSize: cursorSize * 0.8, opacity: cursorOpacity }}>{cursorEmoji || "✨"}</span>
                      )}
                      {(cursorType === "default" || cursorType === "image" || cursorType === "svg") && (
                        <div style={{
                          width: cursorSize, height: cursorSize, borderRadius: "50%",
                          backgroundColor: cursorColor, opacity: cursorOpacity * 0.6,
                        }} />
                      )}
                    </div>
                  )}
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
