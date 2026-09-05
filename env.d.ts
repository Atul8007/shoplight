/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    SHOPIFY_API_KEY?: string;
    SHOPIFY_API_SECRET?: string;
    SHOPIFY_APP_URL?: string;
    SCOPES?: string;
    DATABASE_URL?: string;
    ENABLE_ANALYTICS?: string;
    ENABLE_TOUCH_EFFECTS?: string;
    ENABLE_ADVANCED_RULES?: string;
  }
}

