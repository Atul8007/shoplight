import { prisma } from "~/db.server";
import { BrandProfileUpdateSchema } from "./validation";

/** Get or create a brand profile for the shop. */
export async function getOrCreateBrandProfile(shopId: string) {
  let profile = await prisma.brandProfile.findUnique({ where: { shopId } });
  if (!profile) {
    profile = await prisma.brandProfile.create({
      data: { shopId },
    });
  }
  return profile;
}

/** Update the brand profile with validation. */
export async function updateBrandProfile(shopId: string, input: unknown) {
  const parsed = BrandProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const profile = await prisma.brandProfile.upsert({
    where: { shopId },
    update: parsed.data,
    create: { shopId, ...parsed.data },
  });

  return { ok: true as const, profile };
}
