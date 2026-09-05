import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, TextField,
  Button, Box, Badge, InlineGrid,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import { createExperienceFromTemplate } from "~/services/brand-interaction/experience.server";
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
    })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();
  const name = (formData.get("name") as string) || "My Experience";
  const templateKey = (formData.get("templateKey") as string) || "minimal";

  const experience = await createExperienceFromTemplate(shop.id, name, templateKey);
  return redirect(`/app/experiences/${experience.id}`);
};

export default function NewExperience() {
  const { templates } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("minimal");

  const handleCreate = useCallback(() => {
    const fd = new FormData();
    fd.set("name", name || "My Experience");
    fd.set("templateKey", selectedTemplate);
    submit(fd, { method: "post" });
  }, [name, selectedTemplate, submit]);

  return (
    <Page title="Create Experience" backAction={{ url: "/app/experiences" }}>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Experience Name</Text>
                <TextField
                  label="Name"
                  labelHidden
                  value={name}
                  onChange={setName}
                  placeholder="My Experience"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Choose a Template</Text>
                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
                  {templates.map((t) => (
                    <div
                      key={t.key}
                      onClick={() => setSelectedTemplate(t.key)}
                      style={{ cursor: "pointer" }}
                    >
                      <Box
                        padding="400"
                        borderRadius="200"
                        borderWidth="025"
                        borderColor={selectedTemplate === t.key ? "border-brand" : "border"}
                        background={selectedTemplate === t.key ? "bg-surface-selected" : "bg-surface"}
                      >
                      <BlockStack gap="200">
                        <InlineStack gap="200" blockAlign="center">
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%",
                            backgroundColor: t.cursorColor,
                            border: "2px solid rgba(0,0,0,0.1)",
                          }} />
                          <Text as="span" variant="bodyMd" fontWeight="semibold">{t.name}</Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">{t.description}</Text>
                        <InlineStack gap="100">
                          <Badge>{t.category}</Badge>
                          <Badge tone="info">{t.cursorType}</Badge>
                        </InlineStack>
                      </BlockStack>
                      </Box>
                    </div>
                  ))}
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <InlineStack align="end">
              <Button variant="primary" onClick={handleCreate} loading={isSubmitting}>
                Create Experience
              </Button>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
