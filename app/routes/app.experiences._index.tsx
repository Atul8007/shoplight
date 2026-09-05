import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Card, Text, BlockStack, InlineStack, Badge, Button,
  EmptyState, Box, Filters, Select, Modal,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/services/brand-interaction/shop.server";
import {
  listExperiences, deleteExperience, duplicateExperience, publishExperience,
} from "~/services/brand-interaction/experience.server";

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

  if (intent === "delete" && experienceId) {
    await deleteExperience(shop.id, experienceId);
    return json({ ok: true });
  }

  if (intent === "duplicate" && experienceId) {
    const dup = await duplicateExperience(shop.id, experienceId);
    return redirect(`/app/experiences/${dup.id}`);
  }

  if (intent === "publish" && experienceId) {
    await publishExperience(shop.id, experienceId);
    return json({ ok: true });
  }

  return json({ ok: false }, { status: 400 });
};

export default function ExperiencesList() {
  const { experiences } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const filteredExperiences = experiences.filter((exp) => {
    const matchesQuery = exp.name.toLowerCase().includes(query.toLowerCase()) ||
      (exp.description || "").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || exp.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteModalId) return;
    const fd = new FormData();
    fd.set("intent", "delete");
    fd.set("experienceId", deleteModalId);
    submit(fd, { method: "post" });
    setDeleteModalId(null);
  }, [deleteModalId, submit]);

  if (experiences.length === 0) {
    return (
      <Page title="Experiences">
        <Card>
          <EmptyState
            heading="Create your first storefront experience"
            action={{ content: "Create experience", url: "/app/experiences/new" }}
            image=""
          >
            <p>Branded interaction experiences let you customize how visitors interact with your storefront cursors and hover effects.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Experiences"
      subtitle="Manage, edit, and publish cursor interaction experiences for your storefront."
      primaryAction={{ content: "New Experience", url: "/app/experiences/new" }}
    >
      <BlockStack gap="500">
        <Card padding="300">
          <InlineStack gap="300" align="space-between" blockAlign="center">
            <div style={{ flex: 1 }}>
              <Filters
                queryValue={query}
                queryPlaceholder="Search experiences..."
                onQueryChange={setQuery}
                onQueryClear={() => setQuery("")}
                onClearAll={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
                filters={[
                  {
                    key: "status",
                    label: "Status",
                    filter: (
                      <Select
                        label="Status"
                        options={[
                          { label: "All Statuses", value: "all" },
                          { label: "Published", value: "PUBLISHED" },
                          { label: "Draft", value: "DRAFT" },
                          { label: "Archived", value: "ARCHIVED" },
                        ]}
                        value={statusFilter}
                        onChange={setStatusFilter}
                      />
                    ),
                    shortcut: true,
                  },
                ]}
              />
            </div>
          </InlineStack>
        </Card>

        {filteredExperiences.length === 0 ? (
          <Card>
            <Box padding="500">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                No experiences found matching query filter &quot;{query}&quot;.
              </Text>
            </Box>
          </Card>
        ) : (
          <BlockStack gap="300">
            {filteredExperiences.map((exp) => {
              const isPublished = exp.status === "PUBLISHED";

              return (
                <Card key={exp.id}>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingSm" fontWeight="bold">
                          {exp.name}
                        </Text>
                        <Badge tone={isPublished ? "success" : exp.status === "DRAFT" ? "info" : undefined}>
                          {exp.status}
                        </Badge>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Text as="span" variant="bodySm" tone="subdued">v{exp.version}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">·</Text>
                        <Text as="span" variant="bodySm" tone="subdued">{exp.rulesCount} targeting rules</Text>
                      </InlineStack>
                      {exp.description && (
                        <Text as="p" variant="bodySm" tone="subdued">{exp.description}</Text>
                      )}
                    </BlockStack>

                    <InlineStack gap="200" blockAlign="center">
                      {!isPublished && (
                        <Button
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("intent", "publish");
                            fd.set("experienceId", exp.id);
                            submit(fd, { method: "post" });
                          }}
                          variant="secondary"
                        >
                          Publish
                        </Button>
                      )}
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
                        onClick={() => setDeleteModalId(exp.id)}
                      >
                        Delete
                      </Button>
                    </InlineStack>
                  </InlineStack>
                </Card>
              );
            })}
          </BlockStack>
        )}

        {/* Confirm Delete Modal */}
        <Modal
          open={!!deleteModalId}
          onClose={() => setDeleteModalId(null)}
          title="Delete Experience?"
          primaryAction={{
            content: "Delete Experience",
            destructive: true,
            onAction: handleDeleteConfirm,
            loading: isSubmitting,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setDeleteModalId(null),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p" variant="bodyMd">
              Are you sure you want to delete this experience? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
