import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Banner,
  DataTable, Box,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import { getAnalyticsOverview, getInteractionBreakdown } from "~/services/brand-interaction/analytics.server";
import { FEATURE_FLAGS } from "~/services/brand-interaction/entitlements";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const analyticsEnabled = FEATURE_FLAGS.ENABLE_ANALYTICS;

  if (!analyticsEnabled) {
    return json({ analyticsEnabled, overview: null, breakdown: null });
  }

  const [overview, breakdown] = await Promise.all([
    getAnalyticsOverview(shop.id, 30),
    getInteractionBreakdown(shop.id, 30),
  ]);

  return json({ analyticsEnabled, overview, breakdown });
};

export default function Analytics() {
  const { analyticsEnabled, overview, breakdown } = useLoaderData<typeof loader>();

  if (!analyticsEnabled) {
    return (
      <Page title="Analytics">
        <Card>
          <BlockStack gap="300">
            <Banner tone="info">
              <p>Analytics is currently in beta and disabled. Enable it in Settings or via environment variables.</p>
            </Banner>
            <Text as="p" variant="bodyMd" tone="subdued">
              When enabled, analytics will track anonymous interaction events such as cursor interactions,
              element hovers, and effect triggers — without collecting customer identity or raw mouse trajectories.
            </Text>
          </BlockStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Analytics">
      <BlockStack gap="500">
        <Banner tone="info">
          <p>Analytics is in beta. Data shown reflects the last {overview?.period ?? 30} days.</p>
        </Banner>

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Sessions</Text>
                <Text as="p" variant="headingLg">{overview?.totalSessions ?? 0}</Text>
                <Text as="p" variant="bodySm" tone="subdued">Anonymous visitor sessions</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Interactions</Text>
                <Text as="p" variant="headingLg">{overview?.totalEvents ?? 0}</Text>
                <Text as="p" variant="bodySm" tone="subdued">Total interaction events</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Interaction Breakdown</Text>
                {breakdown && breakdown.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "numeric"]}
                    headings={["Event Type", "Count"]}
                    rows={breakdown.map((b) => [b.eventType, b.count])}
                  />
                ) : (
                  <Text as="p" variant="bodySm" tone="subdued">No interaction data yet.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
