import { redirect, type LoaderFunctionArgs } from "react-router";

/**
 * Legacy `/shop/product/:slug` — canonical PDP is `/product/:slug`.
 */
export function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return redirect(`/product/${params.slug}${url.search}`, 301);
}

export default function LegacyShopProductRedirect() {
  return null;
}
