import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  Banner, Icon, Box,
} from "@shopify/polaris";
import { StatusActiveIcon, AlertCircleIcon } from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import { ensureDefaultExperience, listExperiences } from "~/services/brand-interaction/experience.server";
import { getOrCreateBrandProfile } from "~/services/brand-interaction/brand.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const brand = await getOrCreateBrandProfile(shop.id);
  await ensureDefaultExperience(shop.id);
  const experiences = await listExperiences(shop.id);

  const activeExperience = experiences.find((e) => e.status === "PUBLISHED");
  const hasPublished = !!activeExperience;

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
  });
};

export default function Dashboard() {
  const { shopDomain, plan, experiences, activeExperience, hasPublished } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        {!hasPublished && (
          <Banner
            title="No active experience"
            tone="warning"
            action={{ content: "Create experience", url: "/app/experiences/new" }}
          >
            <p>Create and publish an experience to activate branded interactions on your storefront.</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Experience Status</Text>
                {activeExperience ? (
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="start" blockAlign="center">
                      <Icon source={StatusActiveIcon} tone="success" />
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {activeExperience.name}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Badge tone="success">ACTIVE</Badge>
                      <Text as="span" variant="bodySm" tone="subdued">v{activeExperience.version}</Text>
                    </InlineStack>
                    <Button url={`/app/experiences/${activeExperience.id}`} variant="plain">
                      Edit experience
                    </Button>
                  </BlockStack>
                ) : (
                  <InlineStack gap="200" align="start" blockAlign="center">
                    <Icon source={AlertCircleIcon} tone="warning" />
                    <Text as="span" variant="bodyMd">No active experience</Text>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Quick Actions</Text>
                <BlockStack gap="200">
                  <Button url="/app/experiences/new" variant="primary">New Experience</Button>
                  <Button url="/app/brand">Brand Kit</Button>
                  <Button url="/app/templates">Browse Templates</Button>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Account</Text>
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Shop</Text>
                  <Text as="span" variant="bodyMd">{shopDomain}</Text>
                  <Text as="span" variant="bodySm" tone="subdued">Plan</Text>
                  <Badge>{plan}</Badge>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Experiences ({experiences.length})</Text>
                {experiences.map((exp) => (
                  <Box key={exp.id} padding="300" borderColor="border" borderWidth="025" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">{exp.name}</Text>
                        <InlineStack gap="200">
                          <Badge tone={exp.status === "PUBLISHED" ? "success" : exp.status === "DRAFT" ? "info" : undefined}>
                            {exp.status}
                          </Badge>
                          <Text as="span" variant="bodySm" tone="subdued">{exp.rulesCount} rules</Text>
                        </InlineStack>
                      </BlockStack>
                      <Button url={`/app/experiences/${exp.id}`} variant="plain">Edit</Button>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Storefront Activation</Text>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={StatusActiveIcon} tone="success" />
                    <Text as="span" variant="bodyMd">App installed</Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    {hasPublished ? (
                      <>
                        <Icon source={StatusActiveIcon} tone="success" />
                        <Text as="span" variant="bodyMd">Experience published</Text>
                      </>
                    ) : (
                      <>
                        <Icon source={AlertCircleIcon} tone="warning" />
                        <Text as="span" variant="bodyMd">No published experience</Text>
                      </>
                    )}
                  </InlineStack>
                  <Banner tone="info">
                    <p>
                      To activate the storefront experience, go to your Shopify Theme Editor →
                      App Embeds → enable &quot;Brand Interaction&quot;.
                    </p>
                  </Banner>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
