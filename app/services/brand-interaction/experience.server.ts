import { prisma } from "~/db.server";
import type { ExperienceConfiguration } from "./validation";
import { validateExperienceConfiguration } from "./validation";
import { cloneTemplateConfiguration, DEFAULT_EXPERIENCE_CONFIGURATION } from "./templates";

// ── Reusable ownership guard ─────────────────────────────────────────
async function findOwnedExperience(shopId: string, experienceId: string) {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, shopId },
  });
  if (!experience) throw new Response("Experience not found", { status: 404 });
  return experience;
}

// ── CRUD ─────────────────────────────────────────────────────────────

/** Ensure the shop has at least one experience (created on first visit). */
export async function ensureDefaultExperience(shopId: string) {
  const existing = await prisma.experience.findFirst({ where: { shopId } });
  if (existing) return existing;
  return prisma.experience.create({
    data: {
      shopId,
      name: "Minimal Brand",
      description: "Default branded cursor experience.",
      draftConfiguration: DEFAULT_EXPERIENCE_CONFIGURATION as unknown as import("@prisma/client/runtime/library").InputJsonValue,
    },
  });
}

/** List all experiences owned by a shop. */
export async function listExperiences(shopId: string) {
  return prisma.experience.findMany({
    where: { shopId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { rules: true, versions: true } } },
  });
}

/** Get single experience with rules (ownership-checked). */
export async function getExperience(shopId: string, experienceId: string) {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, shopId },
    include: { rules: { orderBy: { priority: "desc" } } },
  });
  if (!experience) throw new Response("Experience not found", { status: 404 });
  return experience;
}

/** Create a new experience from a template or default configuration. */
export async function createExperienceFromTemplate(
  shopId: string,
  name: string,
  templateKey: string,
) {
  const config = cloneTemplateConfiguration(templateKey);
  return prisma.experience.create({
    data: {
      shopId,
      name,
      description: `Created from ${templateKey} template.`,
      draftConfiguration: config as unknown as import("@prisma/client/runtime/library").InputJsonValue,
    },
  });
}

/** Update draft configuration for an experience (ownership-checked). */
export async function updateExperienceDraft(
  shopId: string,
  experienceId: string,
  updates: { name?: string; description?: string; draftConfiguration?: unknown },
) {
  await findOwnedExperience(shopId, experienceId);

  const data: Record<string, unknown> = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.description !== undefined) data.description = updates.description;

  if (updates.draftConfiguration !== undefined) {
    const validation = validateExperienceConfiguration(updates.draftConfiguration);
    if (!validation.ok) return { ok: false as const, errors: validation.errors };
    data.draftConfiguration = validation.data as unknown as import("@prisma/client/runtime/library").InputJsonValue;
  }

  const updated = await prisma.experience.update({
    where: { id: experienceId },
    data: data as any,
  });
  return { ok: true as const, experience: updated };
}

/** Delete an experience (ownership-checked). */
export async function deleteExperience(shopId: string, experienceId: string) {
  await findOwnedExperience(shopId, experienceId);
  return prisma.experience.delete({ where: { id: experienceId } });
}

/** Duplicate an experience (ownership-checked). */
export async function duplicateExperience(shopId: string, experienceId: string) {
  const original = await findOwnedExperience(shopId, experienceId);
  return prisma.experience.create({
    data: {
      shopId,
      name: `${original.name} (copy)`,
      description: original.description,
      draftConfiguration: original.draftConfiguration as import("@prisma/client/runtime/library").InputJsonValue,
    },
  });
}

// ── Publishing ───────────────────────────────────────────────────────

/** Validate, version, and publish the current draft. */
export async function publishExperience(shopId: string, experienceId: string) {
  const experience = await findOwnedExperience(shopId, experienceId);

  const validation = validateExperienceConfiguration(experience.draftConfiguration);
  if (!validation.ok) return { ok: false as const, errors: validation.errors };

  const nextVersion = experience.version + 1;
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // Create immutable version snapshot
    await tx.experienceVersion.create({
      data: {
        experienceId,
        version: nextVersion,
        configuration: validation.data as unknown as import("@prisma/client/runtime/library").InputJsonValue,
        publishedAt: now,
      },
    });

    // Update the experience to published state
    return tx.experience.update({
      where: { id: experienceId },
      data: {
        status: "PUBLISHED",
        version: nextVersion,
        publishedConfiguration: validation.data as unknown as import("@prisma/client/runtime/library").InputJsonValue,
        publishedAt: now,
      },
    });
  });

  return { ok: true as const, experience: updated };
}

/** Archive an experience (ownership-checked). */
export async function archiveExperience(shopId: string, experienceId: string) {
  await findOwnedExperience(shopId, experienceId);
  return prisma.experience.update({
    where: { id: experienceId },
    data: { status: "ARCHIVED" },
  });
}

// ── Storefront config ────────────────────────────────────────────────

/** Get the published configuration for a shop's active experience. */
export async function getPublishedStorefrontConfig(shopDomain: string) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { id: true, status: true },
  });
  if (!shop || shop.status !== "ACTIVE") return null;

  const experience = await prisma.experience.findFirst({
    where: { shopId: shop.id, status: "PUBLISHED" },
    select: {
      id: true,
      version: true,
      publishedConfiguration: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: "desc" },
  });
  if (!experience || !experience.publishedConfiguration) return null;

  return {
    experienceId: experience.id,
    version: experience.version,
    configuration: experience.publishedConfiguration as ExperienceConfiguration,
    publishedAt: experience.publishedAt,
  };
}
