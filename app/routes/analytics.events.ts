import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "~/db.server";
import { ingestAnalyticsEvents } from "~/services/brand-interaction/analytics.server";

/**
 * Public analytics event ingestion endpoint.
 * POST /analytics/events
 *
 * Receives batched interaction events from the storefront runtime.
 * Validates via Zod. Does NOT accept raw mouse coordinates.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const shopDomain = body.shopDomain as string | undefined;

    if (!shopDomain) {
      return json({ ok: false, error: "Missing shopDomain" }, { status: 400, headers: corsHeaders });
    }

    // Resolve shop ID from domain
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      select: { id: true, status: true },
    });

    if (!shop || shop.status !== "ACTIVE") {
      return json({ ok: false, error: "Shop not found" }, { status: 404, headers: corsHeaders });
    }

    const result = await ingestAnalyticsEvents(shop.id, body);
    if (!result.ok) {
      return json({ ok: false, errors: (result as { errors?: string[] }).errors }, { status: 400, headers: corsHeaders });
    }

    return json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[analytics/events] Error:", error);
    return json({ ok: false, error: "Internal error" }, { status: 500, headers: corsHeaders });
  }
};

// Handle OPTIONS preflight
export const loader = async ({ request }: { request: Request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return json({ error: "Method not allowed" }, { status: 405 });
};
