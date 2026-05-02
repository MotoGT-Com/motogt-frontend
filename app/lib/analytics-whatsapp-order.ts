declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type WhatsAppOrderClickSource = "pdp" | "cart";

/** Fires before opening WhatsApp; keep synchronous. */
export function pushWhatsAppOrderClick(params: {
  source: WhatsAppOrderClickSource;
  product_name?: string;
  product_sku?: string;
  product_price?: number;
  product_make?: string;
  product_model?: string;
  cart_total?: number;
  item_count?: number;
}): void {
  if (typeof window === "undefined") return;
  const layer = window.dataLayer ?? (window.dataLayer = []);
  const payload: Record<string, unknown> = {
    event: "whatsapp_order_click",
    whatsapp_order_source: params.source,
  };
  if (params.source === "pdp") {
    payload.product_name = params.product_name ?? "";
    payload.product_sku = params.product_sku ?? "";
    payload.product_price = params.product_price ?? 0;
    payload.product_make = params.product_make ?? "";
    payload.product_model = params.product_model ?? "";
  } else {
    payload.cart_total = params.cart_total ?? 0;
    payload.item_count = params.item_count ?? 0;
  }
  layer.push(payload);
}
