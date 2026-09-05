import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  Banner, Icon, Box, ProgressBar, List,
} from "@shopify/polaris";
import {
  StatusActiveIcon, AlertCircleIcon, ExternalIcon, CheckIcon, MagicIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import {
  ensureDefaultExperience, listExperiences, publishExperience,
} from "~/services/brand-interaction/experience.server";
import { getOrCreateBrandProfile } from "~/services/brand-interaction/brand.server";
import { getAnalyticsOverview } from "~/services/brand-interaction/analytics.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const brand = await getOrCreateBrandProfile(shop.id);
  await ensureDefaultExperience(shop.id);
  const experiences = await listExperiences(shop.id);
  const analytics = await getAnalyticsOverview(shop.id, 30);

  const activeExperience = experiences.find((e) => e.status === "PUBLISHED");
  const hasPublished = !!activeExperience;

  // Direct Shopify Theme Customizer App Embeds Deep-Link
  const storeSubdomain = session.shop.replace(".myshopify.com", "");
  const themeCustomizerUrl = `https://admin.shopify.com/store/${storeSubdomain}/themes/current/editor?context=apps`;

  return json({
    shopDomain: session.shop,
    plan: shop.plan,
    brand: { primaryColor: brand.primaryColor, style: brand.style },
    experiences: experiences.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      version: e.version,
      rulesCount: e._count.rules,
      updatedAt: e.updatedAt,
    })),
    activeExperience: activeExperience
      ? { id: activeExperience.id, name: activeExperience.name, version: activeExperience.version }
      : null,
    hasPublished,
    analytics: {
      totalSessions: analytics.totalSessions,
      totalEvents: analytics.totalEvents,
    },
    themeCustomizerUrl,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const experienceId = formData.get("experienceId") as string;

  if (intent === "publish" && experienceId) {
    const result = await publishExperience(shop.id, experienceId);
    return json({ ok: result.ok, errors: result.errors || [] });
  }

  return json({ ok: false, errors: ["Unknown action"] }, { status: 400 });
};

export default function Dashboard() {
  const {
    shopDomain, plan, experiences, activeExperience, hasPublished, analytics, themeCustomizerUrl,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Onboarding steps progress calculation
  const completedSteps = [
    true, // Brand profile created
    hasPublished, // Experience published
    false, // App embed toggled
  ].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / 3) * 100);

  return (
    <Page
      title="Dashboard"
      primaryAction={{
        content: "New Experience",
        url: "/app/experiences/new",
      }}
      secondaryActions={[
        {
          content: "Customize Theme Embed",
          icon: ExternalIcon,
          url: themeCustomizerUrl,
          external: true,
        },
      ]}
    >
      <BlockStack gap="500">
        {/* Quick Onboarding Progress Stepper */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={MagicIcon} tone="magic" />
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Setup Progress
                </Text>
              </InlineStack>
              <Badge tone={progressPercent === 100 ? "success" : "attention"}>
                {`${completedSteps} of 3 completed`}
              </Badge>
            </InlineStack>
            <ProgressBar progress={progressPercent} tone="primary" />
            <List type="bullet">
              <List.Item>
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={CheckIcon} tone="success" />
                  <Text as="span" variant="bodyMd">Brand profile initialized</Text>
                </InlineStack>
              </List.Item>
              <List.Item>
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={hasPublished ? CheckIcon : AlertCircleIcon} tone={hasPublished ? "success" : "warning"} />
                  <Text as="span" variant="bodyMd">
                    {hasPublished ? "Storefront experience published" : "Publish an experience"}
                  </Text>
                  {!hasPublished && (
                    <Button url="/app/experiences/new" variant="plain">Publish now</Button>
                  )}
                </InlineStack>
              </List.Item>
              <List.Item>
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={ExternalIcon} tone="interactive" />
                  <Text as="span" variant="bodyMd">Enable Brand Interaction App Embed in Theme Editor</Text>
                  <Button url={themeCustomizerUrl} target="_blank" variant="plain" icon={ExternalIcon}>
                    Open Theme Editor
                  </Button>
                </InlineStack>
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        {/* High-Level KPI Summary Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm" tone="subdued">Active Experience</Text>
                {activeExperience ? (
                  <BlockStack gap="100">
                    <Text as="p" variant="headingMd" fontWeight="bold">
                      {activeExperience.name}
                    </Text>
                    <InlineStack gap="200">
                      <Badge tone="success">ACTIVE</Badge>
                      <Text as="span" variant="bodySm" tone="subdued">v{activeExperience.version}</Text>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">No active experience</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm" tone="subdued">Engaged Sessions (30d)</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">
                  {analytics.totalSessions}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">Tracked visitor sessions</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm" tone="subdued">Interaction Events (30d)</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">
                  {analytics.totalEvents}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">Hovers, clicks & effect triggers</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Experience List with One-Click Publish */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Experiences ({experiences.length})</Text>
                  <Button url="/app/experiences/new" variant="primary">New Experience</Button>
                </InlineStack>

                {experiences.map((exp) => {
                  const isPublished = exp.status === "PUBLISHED";
                  const isLoading = fetcher.state !== "idle" && fetcher.formData?.get("experienceId") === exp.id;

                  return (
                    <Box key={exp.id} padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">{exp.name}</Text>
                            <Badge tone={isPublished ? "success" : exp.status === "DRAFT" ? "info" : undefined}>
                              {exp.status}
                            </Badge>
                          </InlineStack>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {exp.rulesCount} rules · v{exp.version}
                          </Text>
                        </BlockStack>

                        <InlineStack gap="200">
                          {!isPublished && (
                            <fetcher.Form method="post">
                              <input type="hidden" name="intent" value="publish" />
                              <input type="hidden" name="experienceId" value={exp.id} />
                              <Button submit loading={isLoading} variant="secondary">
                                Publish
                              </Button>
                            </fetcher.Form>
                          )}
                          <Button url={`/app/experiences/${exp.id}`} variant="plain">
                            Edit
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </Box>
                  );
                })}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Theme Activation Callout */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Storefront Activation</Text>
                <Banner tone="info">
                  <p>
                    Ensure the <strong>Brand Interaction</strong> App Embed is toggled ON in your theme customizer to activate live cursor effects for visitors.
                  </p>
                </Banner>
                <InlineStack align="start">
                  <Button
                    url={themeCustomizerUrl}
                    target="_blank"
                    variant="primary"
                    icon={ExternalIcon}
                  >
                    Open Theme Customizer App Embeds
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
