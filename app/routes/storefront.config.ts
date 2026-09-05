import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getPublishedStorefrontConfig } from "~/services/brand-interaction/experience.server";

/**
 * Public storefront configuration endpoint.
 * GET /storefront/config?shop=my-store.myshopify.com
 *
 * Returns the published experience configuration for the requesting shop.
 * This endpoint is intentionally public and unauthenticated — it serves
 * only non-sensitive, published configuration data.
 *
 * Security: NEVER returns access tokens, internal IDs, or merchant secrets.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  // CORS headers for storefront access
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!shopDomain) {
    return json(
      { error: "Missing shop parameter" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const config = await getPublishedStorefrontConfig(shopDomain);

    if (!config) {
      return json(
        { enabled: false },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=60",
          },
        },
      );
    }

    const etag = `"${config.experienceId}-v${config.version}"`;
    const ifNoneMatch = request.headers.get("If-None-Match");

    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: { ...corsHeaders, ETag: etag },
      });
    }

    return json(
      {
        enabled: true,
        version: config.version,
        configuration: config.configuration,
        publishedAt: config.publishedAt,
      },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
          ETag: etag,
        },
      },
    );
  } catch (error) {
    // Fail open — if backend errors, return disabled so storefront shows normal cursor
    console.error("[storefront/config] Error:", error);
    return json(
      { enabled: false },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  }
};
