import { config } from "../config";

const normalizePhone = (phone: string): string => phone.replace(/[^\d]/g, "");

export const getSupportPhoneNumber = (): string =>
  normalizePhone(config.supportWhatsappNumber || config.supportPhoneNumber || "");

export const buildWhatsAppUrl = (
  message: string,
  phoneNumber?: string
): string => {
  const phone = normalizePhone(
    phoneNumber ??
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
