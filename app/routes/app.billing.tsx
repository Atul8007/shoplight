import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Divider,
  DataTable,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import { hasEntitlement, type Feature, type Plan } from "~/services/brand-interaction/entitlements";

const PLANS: { plan: Plan; price: string; description: string }[] = [
  { plan: "FREE", price: "$0/mo", description: "Basic templates, basic cursor, 1 active experience" },
  { plan: "STARTER", price: "$9/mo", description: "Advanced interactions, custom assets, more experiences" },
  { plan: "GROWTH", price: "$29/mo", description: "Analytics, advanced rules, future A/B testing" },
  { plan: "PRO", price: "$79/mo", description: "AI features, advanced analytics, agency functionality" },
];

const FEATURES: { feature: Feature; label: string }[] = [
  { feature: "BASIC_TEMPLATES", label: "Basic Templates" },
  { feature: "ADVANCED_INTERACTIONS", label: "Advanced Interactions" },
  { feature: "CUSTOM_ASSETS", label: "Custom Assets" },
  { feature: "ANALYTICS", label: "Analytics" },
  { feature: "AB_TESTING", label: "A/B Testing" },
  { feature: "AI", label: "AI Generation" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  return json({ currentPlan: shop.plan });
};

export default function Billing() {
  const { currentPlan } = useLoaderData<typeof loader>();

  const rows = FEATURES.map((f) => [
    f.label,
    ...PLANS.map((p) => (hasEntitlement(p.plan, f.feature) ? "✓" : "—")),
  ]);

  return (
    <Page title="Billing & Plans">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Current Plan</Text>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="success">{currentPlan}</Badge>
                  <Text as="span" variant="bodyMd">
                    {PLANS.find((p) => p.plan === currentPlan)?.price}
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  {PLANS.find((p) => p.plan === currentPlan)?.description}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Plan Comparison</Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["Feature", ...PLANS.map((p) => `${p.plan} (${p.price})`)]}
                  rows={rows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
