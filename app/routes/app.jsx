import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate, billing } from "../shopify.server";

export const MONTHLY_PLAN = "PO Tracker Monthly";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const billingCheck = await billing.require(request, {
    plans: [MONTHLY_PLAN],
    isTest: true,
    onFailure: async () => billing.request(request, {
      plan: MONTHLY_PLAN,
      isTest: true,
      returnUrl: process.env.SHOPIFY_APP_URL + "/app",
    }),
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop,
  };
};

export default function App() {
  const { apiKey } = useLoaderData();
  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};