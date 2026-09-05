import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, TextField,
  Select, Button, Banner, Box, Divider,
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
    logoUrl: formData.get("logoUrl") as string || null,
  };

  const result = await updateBrandProfile(shop.id, input);
  if (!result.ok) {
    return json({ ok: false, errors: result.errors }, { status: 400 });
  }
  return json({ ok: true, errors: [] });
};

const STYLE_OPTIONS = [
  { label: "Minimal", value: "minimal" },
  { label: "Luxury", value: "luxury" },
  { label: "Playful", value: "playful" },
  { label: "Futuristic", value: "futuristic" },
  { label: "Organic", value: "organic" },
  { label: "Bold", value: "bold" },
  { label: "Custom", value: "custom" },
];

export default function BrandKit() {
  const { brand } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(brand.secondaryColor);
  const [accentColor, setAccentColor] = useState(brand.accentColor);
  const [style, setStyle] = useState(brand.style);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("primaryColor", primaryColor);
    formData.set("secondaryColor", secondaryColor);
    formData.set("accentColor", accentColor);
    formData.set("style", style);
    submit(formData, { method: "post" });
  }, [primaryColor, secondaryColor, accentColor, style, submit]);

  const handleReset = useCallback(() => {
    setPrimaryColor("#111111");
    setSecondaryColor("#FFFFFF");
    setAccentColor("#FFFFFF");
    setStyle("minimal");
  }, []);

  return (
    <Page
      title="Brand Kit"
      primaryAction={{ content: "Save", onAction: handleSave, loading: isSubmitting }}
      secondaryActions={[{ content: "Reset defaults", onAction: handleReset }]}
    >
      <BlockStack gap="500">
        {actionData && !actionData.ok && (
          <Banner title="Validation errors" tone="critical">
            {actionData.errors.map((e, i) => <p key={i}>{e}</p>)}
          </Banner>
        )}
        {actionData?.ok && (
          <Banner title="Brand Kit saved" tone="success" onDismiss={() => {}} />
        )}

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Colors</Text>
                <TextField
                  label="Primary Color"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  autoComplete="off"
                  prefix={
                    <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: primaryColor, border: "1px solid #ccc" }} />
                  }
                />
                <TextField
                  label="Secondary Color"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                  autoComplete="off"
                  prefix={
                    <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: secondaryColor, border: "1px solid #ccc" }} />
                  }
                />
                <TextField
                  label="Accent Color"
                  value={accentColor}
                  onChange={setAccentColor}
                  autoComplete="off"
                  prefix={
                    <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: accentColor, border: "1px solid #ccc" }} />
                  }
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Style</Text>
                <Select
                  label="Brand Style"
                  options={STYLE_OPTIONS}
                  value={style}
                  onChange={(value) => setStyle(value as any)}
                />
                <Divider />
                <Text as="h3" variant="headingSm">Preview</Text>
                <Box padding="400" borderRadius="200" background="bg-surface-secondary">
                  <InlineStack gap="300" align="center">
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: "50%",
                        backgroundColor: primaryColor,
                        border: `3px solid ${accentColor}`,
                        boxShadow: `0 0 0 2px ${secondaryColor}`,
                      }}
                    />
                    <BlockStack gap="100">
                      <div style={{ width: 120, height: 10, borderRadius: 4, backgroundColor: primaryColor }} />
                      <div style={{ width: 80, height: 8, borderRadius: 4, backgroundColor: secondaryColor, border: "1px solid #e5e5e5" }} />
                      <div style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: accentColor, border: "1px solid #e5e5e5" }} />
                    </BlockStack>
                  </InlineStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
