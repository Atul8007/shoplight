import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { deactivateShop } from "~/services/brand-interaction/shop.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === "APP_UNINSTALLED") {
    if (shop) {
      await deactivateShop(shop);
    }
  }

  return new Response(null, { status: 200 });
};
