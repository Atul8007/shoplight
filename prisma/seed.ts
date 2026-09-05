import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.upsert({
    where: { shopDomain: "quickstart-demo.myshopify.com" },
    update: {},
    create: {
      shopifyShopId: "gid://shopify/Shop/12345678",
      shopDomain: "quickstart-demo.myshopify.com",
      plan: "GROWTH",
      brandProfile: {
        create: {
          primaryColor: "#008060",
          secondaryColor: "#FFFFFF",
          accentColor: "#5C6AC4",
          style: "minimal",
        },
      },
      experiences: {
        create: [
          {
            name: "Default Storefront Cursor",
            description: "Minimal emerald ring cursor for modern storefronts.",
            status: "PUBLISHED",
            version: 1,
            draftConfiguration: {
              schemaVersion: 1,
              enabled: true,
              analyticsEnabled: true,
              reduceMotion: false,
              cursor: { type: "ring", size: 32, color: "#008060", opacity: 0.8, blendMode: "normal" },
              motion: { trail: true, trailLength: 10, magnetic: true, intensity: 0.3 },
              hover: { enabled: true, scale: 1.5 },
              click: { effect: "ripple" },
              rules: [],
            },
            publishedConfiguration: {
              schemaVersion: 1,
              enabled: true,
              analyticsEnabled: true,
              reduceMotion: false,
              cursor: { type: "ring", size: 32, color: "#008060", opacity: 0.8, blendMode: "normal" },
              motion: { trail: true, trailLength: 10, magnetic: true, intensity: 0.3 },
              hover: { enabled: true, scale: 1.5 },
              click: { effect: "ripple" },
              rules: [],
            },
          },
        ],
      },
    },
  });

  console.log("Database seeded successfully with test shop:", shop.shopDomain);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
