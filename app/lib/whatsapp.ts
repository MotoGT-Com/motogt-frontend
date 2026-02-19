import { config } from "../config";
import i18n from "./i18n";

const normalizePhone = (phone: string): string => phone.replace(/[^\d]/g, "");

export type WhatsAppMessageItem = {
  productName: string;
  itemCode: string;
  quantity?: number;
  price?: string | number;
  productUrl?: string;
};

type GenerateWAMessageInput = {
  items: WhatsAppMessageItem[];
  currency: string;
  totalAmount?: string | number;
  lang: string;
  customerName?: string;
  customerPhone?: string | null;
};

export const getSupportPhoneNumber = (): string =>
  normalizePhone(config.supportWhatsappNumber || config.supportPhoneNumber || "");

export const generateWAMessage = ({
  items,
  currency,
  totalAmount,
  lang,
  customerName,
  customerPhone,
}: GenerateWAMessageInput): string => {
  const language = lang === "ar" ? "ar" : "en";
  const t = i18n.getFixedT(language, "common");
  const defaults =
    language === "ar"
      ? {
          singleHeader: "استفسار طلب مفرد جديد - MotoGT",
          cartHeader: "استفسار طلب سلة جديد - MotoGT",
          customer: "العميل",
          product: "المنتج",
          code: "الكود",
          price: "السعر",
          link: "الرابط",
          itemsInCart: "المنتجات في السلة",
          totalPrice: "السعر الإجمالي",
          singleClosing: "أنا مهتم بطلب هذا المنتج.",
          cartClosing: "أرغب بطلب المنتجات الموجودة في سلتي.",
        }
      : {
          singleHeader: "New Single Order Inquiry - MotoGT",
          cartHeader: "New Cart Order Inquiry - MotoGT",
          customer: "Customer",
          product: "Product",
          code: "Code",
          price: "Price",
          link: "Link",
          itemsInCart: "Items in Cart",
          totalPrice: "Total Price",
          singleClosing: "I am interested in ordering this item.",
          cartClosing: "I want to order the items in my cart.",
        };
  const tx = (key: keyof typeof defaults): string => {
    const value = t(`whatsapp.${key}`, { defaultValue: defaults[key] });
    return typeof value === "string" && value.trim()
      ? value
      : defaults[key];
  };
  const labels = {
    singleHeader: tx("singleHeader"),
    cartHeader: tx("cartHeader"),
    customer: tx("customer"),
    product: tx("product"),
    code: tx("code"),
    price: tx("price"),
    link: tx("link"),
    itemsInCart: tx("itemsInCart"),
    totalPrice: tx("totalPrice"),
    singleClosing: tx("singleClosing"),
    cartClosing: tx("cartClosing"),
  };

  if (!items.length) return "";

  const customerLine =
    customerName?.trim()
      ? `*${labels.customer}:* ${customerName.trim()}${
          customerPhone?.trim() ? ` (${customerPhone.trim()})` : ""
        }`
      : null;
  const formatItemLine = (item: WhatsAppMessageItem): string => {
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return `${quantity} x ${item.productName} (*${labels.code}:* ${item.itemCode})`;
  };

  const isCartOrder = totalAmount !== undefined;
  const isMultiProduct = items.length > 1;

  if (!isMultiProduct && !isCartOrder) {
    const item = items[0];
    return [
      `*${labels.singleHeader}*`,
      ...(customerLine ? [customerLine] : []),
      `*${labels.product}:*`,
      formatItemLine(item),
      `*${labels.price}:* ${item.price ?? "0.00"} ${currency}`,
      "",
      `*${labels.link}:* ${item.productUrl ?? ""}`,
      labels.singleClosing,
    ].join("\n");
  }

  const resolvedTotal = totalAmount ?? "0.00";
  const cartLines = items.flatMap((item, index) => {
    const line = formatItemLine(item);
    return index === items.length - 1 ? [line] : [line, ""];
  });

  return [
    `*${labels.cartHeader}*`,
    "---------------------------",
    ...(customerLine ? [customerLine] : []),
    `*${labels.itemsInCart}:*`,
    "",
    ...cartLines,
    "",
    `*${labels.totalPrice}:* ${resolvedTotal} ${currency}`,
    labels.cartClosing,
  ].join("\n");
};

type LegacyWhatsAppMessageInput = {
  name: string;
  code: string;
  price: string | number;
  currency: string;
  url: string;
  lang: string;
  customerName?: string;
  customerPhone?: string | null;
};

export const formatWhatsAppMessage = ({
  name,
  code,
  price,
  currency,
  url,
  lang,
  customerName,
  customerPhone,
}: LegacyWhatsAppMessageInput): string =>
  generateWAMessage({
    items: [{ productName: name, itemCode: code, price, productUrl: url }],
    currency,
    lang,
    customerName,
    customerPhone,
  });

export const buildWhatsAppUrl = (
  message: string,
  phoneNumber?: string
): string => {
  const phone = normalizePhone(
    phoneNumber ??
      config.whatsappOrderNumber ??
      config.supportWhatsappNumber ??
      config.supportPhoneNumber ??
      ""
  );
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const openWhatsAppMessage = (
  message: string,
  phoneNumber?: string
): boolean => {
  const url = buildWhatsAppUrl(message, phoneNumber);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};
