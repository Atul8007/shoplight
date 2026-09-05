import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, TextField,
  Select, Banner, Box, Divider, FormLayout,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import { getOrCreateBrandProfile, updateBrandProfile } from "~/services/brand-interaction/brand.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const brand = await getOrCreateBrandProfile(shop.id);
  return json({ brand });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();

  const input = {
    primaryColor: formData.get("primaryColor") as string,
    secondaryColor: formData.get("secondaryColor") as string,
    accentColor: formData.get("accentColor") as string,
    style: formData.get("style") as string,
    logoUrl: (formData.get("logoUrl") as string) || null,
  };

  const result = await updateBrandProfile(shop.id, input);
  if (!result.ok) {
    return json({ ok: false, errors: result.errors }, { status: 400 });
  }
  return json({ ok: true, errors: [] });
};

const STYLE_OPTIONS = [
  { label: "Minimal — Clean, subtle monochromatic tones", value: "minimal" },
  { label: "Luxury — Emerald, gold, and deep charcoal", value: "luxury" },
  { label: "Playful — Vibrant pastels and lively particle trails", value: "playful" },
  { label: "Futuristic — Neon cyan, magenta, and glow rings", value: "futuristic" },
  { label: "Organic — Natural beige, forest greens, soft curves", value: "organic" },
  { label: "Bold — High-contrast black, crimson red, sharp shapes", value: "bold" },
  { label: "Custom — Fully personalized custom palette", value: "custom" },
];

export default function BrandKit() {
  const { brand } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor || "#008060");
  const [secondaryColor, setSecondaryColor] = useState(brand.secondaryColor || "#FFFFFF");
  const [accentColor, setAccentColor] = useState(brand.accentColor || "#5C6AC4");
  const [style, setStyle] = useState(brand.style || "minimal");
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl || "");

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("primaryColor", primaryColor);
    formData.set("secondaryColor", secondaryColor);
    formData.set("accentColor", accentColor);
    formData.set("style", style);
    formData.set("logoUrl", logoUrl);
    submit(formData, { method: "post" });
  }, [primaryColor, secondaryColor, accentColor, style, logoUrl, submit]);

  const handleReset = useCallback(() => {
    setPrimaryColor("#008060");
    setSecondaryColor("#FFFFFF");
    setAccentColor("#5C6AC4");
    setStyle("minimal");
    setLogoUrl("");
  }, []);

  return (
    <Page
      title="Brand Kit"
      subtitle="Define your brand palette, style theme, and visual identity for custom cursor interactions."
      primaryAction={{ content: "Save Changes", onAction: handleSave, loading: isSubmitting }}
      secondaryActions={[{ content: "Reset Defaults", onAction: handleReset }]}
    >
      <BlockStack gap="500">
        {actionData && !actionData.ok && (
          <Banner title="Validation errors" tone="critical">
            {actionData.errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </Banner>
        )}
        {actionData?.ok && (
          <Banner title="Brand Kit saved successfully!" tone="success" />
        )}

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <FormLayout>
                <Text as="h2" variant="headingMd">Brand Colors</Text>
                
                <InlineStack gap="300" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Primary Color (Hex)"
                      value={primaryColor}
                      onChange={setPrimaryColor}
                      autoComplete="off"
                      prefix="#"
                    />
                  </div>
                  <input
                    type="color"
                    value={primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: 42, height: 38, border: "none", cursor: "pointer", borderRadius: 4 }}
                  />
                </InlineStack>

                <InlineStack gap="300" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Secondary Color (Hex)"
                      value={secondaryColor}
                      onChange={setSecondaryColor}
                      autoComplete="off"
                      prefix="#"
                    />
                  </div>
                  <input
                    type="color"
                    value={secondaryColor.startsWith("#") ? secondaryColor : `#${secondaryColor}`}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{ width: 42, height: 38, border: "none", cursor: "pointer", borderRadius: 4 }}
                  />
                </InlineStack>

                <InlineStack gap="300" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Accent Color (Hex)"
                      value={accentColor}
                      onChange={setAccentColor}
                      autoComplete="off"
                      prefix="#"
                    />
                  </div>
                  <input
                    type="color"
                    value={accentColor.startsWith("#") ? accentColor : `#${accentColor}`}
                    onChange={(e) => setAccentColor(e.target.value)}
                    style={{ width: 42, height: 38, border: "none", cursor: "pointer", borderRadius: 4 }}
                  />
                </InlineStack>

                <Divider />

                <Text as="h2" variant="headingMd">Brand Style Theme</Text>
                <Select
                  label="Style Theme Preset"
                  options={STYLE_OPTIONS}
                  value={style}
                  onChange={(val) => setStyle(val as any)}
                  helpText="Presets automatically adapt glow radii, blend modes, and cursor trail shapes on your storefront."
                />

                <TextField
                  label="Brand Logo Image URL (Optional)"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  autoComplete="off"
                  placeholder="https://cdn.shopify.com/s/files/1/0000/0000/logo.png"
                  helpText="Used for image/SVG custom cursors."
                />
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Live Theme Preview</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Preview how your selected brand colors interact on interactive storefront components.
                </Text>

                <Box
                  padding="600"
                  borderRadius="300"
                  background="bg-surface-secondary"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="400" align="center">
                    {/* Simulated Cursor Marker */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: primaryColor,
                        border: `3px solid ${accentColor}`,
                        boxShadow: `0 0 16px ${primaryColor}`,
                        transition: "all 0.2s ease",
                      }}
                    />

                    {/* Simulated Interactive Button */}
                    <button
                      type="button"
                      style={{
                        padding: "12px 24px",
                        backgroundColor: primaryColor,
                        color: secondaryColor,
                        border: `2px solid ${accentColor}`,
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: `0 4px 12px ${primaryColor}40`,
                      }}
                    >
                      Add To Cart (Hover Effect)
                    </button>

                    {/* Color Swatch Badges */}
                    <InlineStack gap="200" align="center">
                      <div style={{ backgroundColor: primaryColor, color: "#fff", fontSize: 11, padding: "4px 8px", borderRadius: 4 }}>
                        Primary {primaryColor}
                      </div>
                      <div style={{ backgroundColor: secondaryColor, color: "#000", border: "1px solid #ccc", fontSize: 11, padding: "4px 8px", borderRadius: 4 }}>
                        Secondary {secondaryColor}
                      </div>
                      <div style={{ backgroundColor: accentColor, color: "#fff", fontSize: 11, padding: "4px 8px", borderRadius: 4 }}>
                        Accent {accentColor}
                      </div>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
