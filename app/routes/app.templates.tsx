import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  InlineGrid, Box,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { EXPERIENCE_TEMPLATES } from "~/services/brand-interaction/templates";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({
    templates: EXPERIENCE_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      category: t.category,
      description: t.description,
      cursorType: t.configuration.cursor.type,
      cursorColor: t.configuration.cursor.color,
      cursorSize: t.configuration.cursor.size,
      trail: t.configuration.motion.trail,
      clickEffect: t.configuration.click.effect,
    })),
  });
};

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page title="Experience Templates">
      <BlockStack gap="500">
        <Text as="p" variant="bodyMd" tone="subdued">
          Templates are ready-made interaction experiences. Select one to create a new experience based on it.
        </Text>

        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
          {templates.map((t) => (
            <Card key={t.key}>
              <BlockStack gap="300">
                {/* Visual preview */}
                <Box
                  padding="500"
                  borderRadius="200"
                  background="bg-surface-secondary"
                  minHeight="120px"
                >
                  <InlineStack align="center" blockAlign="center">
                    {t.cursorType === "dot" && (
                      <div style={{
                        width: t.cursorSize * 2, height: t.cursorSize * 2,
                        borderRadius: "50%", backgroundColor: t.cursorColor,
                      }} />
                    )}
                    {t.cursorType === "ring" && (
                      <div style={{
                        width: t.cursorSize * 2, height: t.cursorSize * 2,
                        borderRadius: "50%", border: `3px solid ${t.cursorColor}`,
                      }} />
                    )}
                    {t.cursorType === "crosshair" && (
                      <div style={{ width: t.cursorSize * 2, height: t.cursorSize * 2, position: "relative" }}>
                        <div style={{ position: "absolute", left: "50%", top: 0, width: 2, height: "100%", backgroundColor: t.cursorColor, transform: "translateX(-50%)" }} />
                        <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2, backgroundColor: t.cursorColor, transform: "translateY(-50%)" }} />
                      </div>
                    )}
                    {t.cursorType === "emoji" && (
                      <span style={{ fontSize: t.cursorSize * 1.5 }}>✨</span>
                    )}
                    {(t.cursorType === "image" || t.cursorType === "svg" || t.cursorType === "default") && (
                      <div style={{
                        width: t.cursorSize * 2, height: t.cursorSize * 2,
                        borderRadius: "50%", backgroundColor: t.cursorColor, opacity: 0.6,
                      }} />
                    )}
                  </InlineStack>
                </Box>

                <Text as="h3" variant="headingSm">{t.name}</Text>
                <Text as="p" variant="bodySm" tone="subdued">{t.description}</Text>
                <InlineStack gap="100">
                  <Badge>{t.category}</Badge>
                  <Badge tone="info">{t.cursorType}</Badge>
                  {t.trail && <Badge tone="attention">trail</Badge>}
                  {t.clickEffect !== "none" && <Badge>{t.clickEffect}</Badge>}
                </InlineStack>

                <Button
                  onClick={() => navigate(`/app/experiences/new?template=${t.key}`)}
                  variant="primary"
                >
                  Use Template
                </Button>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
