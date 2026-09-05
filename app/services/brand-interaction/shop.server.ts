import { prisma } from "~/db.server";

/**
 * Retrieve or create the internal Shop record for the given Shopify session domain.
 * Uses upsert so the call is idempotent across reinstalls.
 */
export async function getOrCreateShop(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: { status: "ACTIVE" },
    create: {
      shopDomain,
      shopifyShopId: shopDomain,
      status: "ACTIVE",
      plan: "FREE",
    },
  });
}

/**
 * Deactivate a shop on uninstall — clears encrypted credentials,
 * marks status as UNINSTALLED.  Called from the APP_UNINSTALLED webhook.
 */
export async function deactivateShop(shopDomain: string) {
  return prisma.shop.updateMany({
    where: { shopDomain },
    data: { status: "UNINSTALLED", encryptedAccessToken: null },
  });
}

/**
 * Retrieve a shop by domain; returns null when not found.
 */
export async function getShopByDomain(shopDomain: string) {
  return prisma.shop.findUnique({ where: { shopDomain } });
}
