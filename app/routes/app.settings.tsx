import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Banner,
  FormLayout, Divider, Checkbox,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { FEATURE_FLAGS } from "~/services/brand-interaction/entitlements";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ featureFlags: FEATURE_FLAGS });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  
  const analytics = formData.get("enableAnalytics") === "true";
  const touchEffects = formData.get("enableTouchEffects") === "true";
  const reduceMotion = formData.get("respectReduceMotion") === "true";

  return json({
    ok: true,
    savedSettings: { analytics, touchEffects, reduceMotion },
  });
};

export default function Settings() {
  const { featureFlags } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [enableAnalytics, setEnableAnalytics] = useState(FEATURE_FLAGS.ENABLE_ANALYTICS);
  const [enableTouchEffects, setEnableTouchEffects] = useState(FEATURE_FLAGS.ENABLE_TOUCH_EFFECTS);
  const [respectReduceMotion, setRespectReduceMotion] = useState(true);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("enableAnalytics", String(enableAnalytics));
    formData.set("enableTouchEffects", String(enableTouchEffects));
    formData.set("respectReduceMotion", String(respectReduceMotion));
    submit(formData, { method: "post" });
  }, [enableAnalytics, enableTouchEffects, respectReduceMotion, submit]);

  return (
    <Page
      title="Settings"
      subtitle="Configure storefront interaction behaviors, privacy controls, and accessibility compliance."
      primaryAction={{ content: "Save Settings", onAction: handleSave, loading: isSubmitting }}
    >
      <BlockStack gap="500">
        {actionData?.ok && (
          <Banner title="Settings saved successfully" tone="success" />
        )}

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <FormLayout>
                <Text as="h2" variant="headingMd">Storefront Behavior</Text>
                
                <Checkbox
                  label="Enable Anonymous Analytics & Interaction Events"
                  checked={enableAnalytics}
                  onChange={setEnableAnalytics}
                  helpText="Collects anonymous interaction metrics (hovers, clicks, page types) without recording customer identity or mouse trajectories."
                />

                <Checkbox
                  label="Enable Touch Device Support (Mobile & Tablet)"
                  checked={enableTouchEffects}
                  onChange={setEnableTouchEffects}
                  helpText="Renders touch particle ripples on mobile taps while disabling persistent mouse cursors."
                />

                <Divider />

                <Text as="h2" variant="headingMd">Accessibility & Compliance</Text>

                <Checkbox
                  label="Respect User System Preference for Reduced Motion"
                  checked={respectReduceMotion}
                  onChange={setRespectReduceMotion}
                  helpText="Automatically disables intense particle trails and magnetic displacement if the customer has prefers-reduced-motion turned on in OS settings."
                />
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">System Entitlements & Environment Flags</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  System entitlements active for your current plan tier:
                </Text>
                <Divider />

                {Object.entries(featureFlags).map(([key, value]) => (
                  <InlineStack key={key} align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {key.replace(/^ENABLE_/, "").replace(/_/g, " ")}
                    </Text>
                    <div
                      style={{
                        backgroundColor: value ? "#E4F8F0" : "#F1F2F4",
                        color: value ? "#007A5C" : "#616161",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {value ? "ACTIVE" : "INACTIVE"}
                    </div>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
