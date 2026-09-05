import "@shopify/shopify-app-remix/server/adapters/node";
import { AppDistribution, shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { ApiVersion } from "@shopify/shopify-api";
import { prisma } from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY ?? "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET ?? "",
  apiVersion: ApiVersion.July26,
  scopes: (process.env.SCOPES || "read_products").split(","),
  appUrl: process.env.SHOPIFY_APP_URL ?? "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: { unstable_newEmbeddedAuthStrategy: true },
});

export default shopify;
export const apiVersion = ApiVersion.July26;
export const addDocumentResponseHeaders = (request: Request, headers: Headers) => {
  try {
    const rawUrl = request.url || "/";
    const url = rawUrl.startsWith("http")
      ? rawUrl
      : `${process.env.SHOPIFY_APP_URL || "http://localhost:3000"}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
    const req = new Request(url, { headers: request.headers, method: request.method });
    return shopify.addDocumentResponseHeaders(req, headers);
  } catch (e) {
    console.warn("Failed to add document response headers:", e);
  }
};
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

