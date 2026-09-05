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
import { login } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = await login(request);
  return json({ errors });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = await login(request);
  return json({ errors });
};

export default function AuthLogin() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const errors = actionData?.errors || loaderData?.errors;

  return (
    <AppProvider i18n={{}}>
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
                error={errors?.shop}
                helpText="Example: my-shop-domain.myshopify.com"
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
