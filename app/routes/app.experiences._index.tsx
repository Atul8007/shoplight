import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  EmptyState, Box,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import { listExperiences, deleteExperience, duplicateExperience } from "~/services/brand-interaction/experience.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const experiences = await listExperiences(shop.id);
  return json({
    experiences: experiences.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      status: e.status,
      version: e.version,
      rulesCount: e._count.rules,
      updatedAt: e.updatedAt,
    })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const experienceId = formData.get("experienceId") as string;

  if (intent === "delete") {
    await deleteExperience(shop.id, experienceId);
    return json({ ok: true });
  }

  if (intent === "duplicate") {
    const dup = await duplicateExperience(shop.id, experienceId);
    return redirect(`/app/experiences/${dup.id}`);
  }

  return json({ ok: false }, { status: 400 });
};

function statusTone(status: string) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "DRAFT") return "info" as const;
  return undefined;
}

export default function ExperiencesList() {
  const { experiences } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  if (experiences.length === 0) {
    return (
      <Page title="Experiences">
        <Card>
          <EmptyState
            heading="Create your first experience"
            action={{ content: "Create experience", url: "/app/experiences/new" }}
            image=""
          >
            <p>Branded interaction experiences let you customize how visitors interact with your storefront.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Experiences"
      primaryAction={{ content: "New experience", url: "/app/experiences/new" }}
    >
      <BlockStack gap="400">
        {experiences.map((exp) => (
          <Card key={exp.id}>
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">{exp.name}</Text>
                <InlineStack gap="200">
                  <Badge tone={statusTone(exp.status)}>{exp.status}</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">v{exp.version}</Text>
                  <Text as="span" variant="bodySm" tone="subdued">{exp.rulesCount} rules</Text>
                </InlineStack>
                {exp.description && (
                  <Text as="p" variant="bodySm" tone="subdued">{exp.description}</Text>
                )}
              </BlockStack>
              <InlineStack gap="200">
                <Button url={`/app/experiences/${exp.id}`}>Edit</Button>
                <Button
                  variant="plain"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("intent", "duplicate");
                    fd.set("experienceId", exp.id);
                    submit(fd, { method: "post" });
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  variant="plain"
                  tone="critical"
                  onClick={() => {
                    if (!confirm("Delete this experience?")) return;
                    const fd = new FormData();
                    fd.set("intent", "delete");
                    fd.set("experienceId", exp.id);
                    submit(fd, { method: "post" });
                  }}
                >
                  Delete
                </Button>
              </InlineStack>
            </InlineStack>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}
