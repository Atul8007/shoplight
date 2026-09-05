import { prisma } from "~/db.server";
import { CreateRuleSchema, UpdateRuleSchema } from "./validation";

// ── Ownership guard ──────────────────────────────────────────────────

async function verifyExperienceOwnership(shopId: string, experienceId: string) {
  const exp = await prisma.experience.findFirst({
    where: { id: experienceId, shopId },
    select: { id: true },
  });
  if (!exp) throw new Response("Experience not found", { status: 404 });
  return exp;
}

async function verifyRuleOwnership(shopId: string, ruleId: string) {
  const rule = await prisma.experienceRule.findFirst({
    where: { id: ruleId, experience: { shopId } },
    include: { experience: { select: { id: true, shopId: true } } },
  });
  if (!rule) throw new Response("Rule not found", { status: 404 });
  return rule;
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function listRules(shopId: string, experienceId: string) {
  await verifyExperienceOwnership(shopId, experienceId);
  return prisma.experienceRule.findMany({
    where: { experienceId },
    orderBy: { priority: "desc" },
  });
}

export async function createRule(shopId: string, experienceId: string, input: unknown) {
  await verifyExperienceOwnership(shopId, experienceId);

  const parsed = CreateRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }

  const rule = await prisma.experienceRule.create({
    data: {
      experienceId,
      name: parsed.data.name,
      priority: parsed.data.priority,
      condition: parsed.data.condition as unknown as import("@prisma/client/runtime/library").InputJsonValue,
      action: parsed.data.action as unknown as import("@prisma/client/runtime/library").InputJsonValue,
      enabled: parsed.data.enabled,
    },
  });

  return { ok: true as const, rule };
}

export async function updateRule(shopId: string, ruleId: string, input: unknown) {
  await verifyRuleOwnership(shopId, ruleId);

  const parsed = UpdateRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.condition !== undefined) data.condition = parsed.data.condition as unknown as import("@prisma/client/runtime/library").InputJsonValue;
  if (parsed.data.action !== undefined) data.action = parsed.data.action as unknown as import("@prisma/client/runtime/library").InputJsonValue;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;

  const rule = await prisma.experienceRule.update({ where: { id: ruleId }, data: data as any });
  return { ok: true as const, rule };
}

export async function deleteRule(shopId: string, ruleId: string) {
  await verifyRuleOwnership(shopId, ruleId);
  return prisma.experienceRule.delete({ where: { id: ruleId } });
}

export async function toggleRule(shopId: string, ruleId: string, enabled: boolean) {
  await verifyRuleOwnership(shopId, ruleId);
  return prisma.experienceRule.update({
    where: { id: ruleId },
    data: { enabled },
  });
}
