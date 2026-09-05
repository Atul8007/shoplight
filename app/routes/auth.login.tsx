import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { login } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If request contains a shop parameter, let shopify.login handle automatic OAuth redirect
  const result = await login(request);
  if (result instanceof Response) {
    return result;
  }
  
  return json({ errors: result, shop: url.searchParams.get("shop") || "" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const result = await login(request);
  if (result instanceof Response) {
    return result;
  }
  
  return json({ errors: result });
};

export default function AuthLogin() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState(loaderData?.shop || "");
  const errors = actionData?.errors || loaderData?.errors;

  return (
    <AppProvider i18n={polarisTranslations}>
      <Page title="Log in to Shoplight">
        <Card>
          <Form method="post">
            <FormLayout>
              <Text as="h2" variant="headingMd">
                Log in
              </Text>
              <TextField
                name="shop"
                label="Shop domain"
                type="text"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={typeof errors === "object" && errors !== null && "shop" in errors ? (errors as any).shop : undefined}
                helpText="Example: wishlist-mim3aotn.myshopify.com"
              />
              <Button submit variant="primary">
                Log in
              </Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </AppProvider>
  );
}
