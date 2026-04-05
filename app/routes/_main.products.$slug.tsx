import { redirect, type LoaderFunctionArgs } from "react-router";

/**
 * Legacy `/products/:slug` — canonical PDP is `/product/:slug` (English slug + id).
 */
export function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return redirect(`/product/${params.slug}${url.search}`, 301);
}

export default function LegacyProductsRedirect() {
  return null;
}
