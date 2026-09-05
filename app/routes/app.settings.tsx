import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, Badge, Divider,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { FEATURE_FLAGS } from "~/services/brand-interaction/entitlements";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ featureFlags: FEATURE_FLAGS });
};

export default function Settings() {
  const { featureFlags } = useLoaderData<typeof loader>();

  const flags = Object.entries(featureFlags).map(([key, value]) => ({
    key,
    label: key.replace(/^ENABLE_/, "").replace(/_/g, " "),
    enabled: value,
  }));

  return (
    <Page title="Settings">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Feature Flags</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Feature flags control which capabilities are active. These are configured
                  via environment variables and cannot be changed from the dashboard.
                </Text>
                <Divider />
                {flags.map((f) => (
                  <BlockStack key={f.key} gap="100">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">{f.label}</Text>
                    <Badge tone={f.enabled ? "success" : undefined}>
                      {f.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </BlockStack>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
