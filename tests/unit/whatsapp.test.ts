import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  formatWhatsAppMessage,
  generateWAMessage,
} from "~/lib/whatsapp";

describe("whatsapp utilities", () => {
  it("formats order inquiry message in English", () => {
    const message = formatWhatsAppMessage({
      name: "Brake Pad Kit",
      code: "JOD-450-90",
      price: "34.50",
      currency: "JOD",
      url: "https://motogt.com/product/brake-pad-kit-1025",
      lang: "en",
      customerName: "Amr Halawani",
      customerPhone: "+962 7X XXX XXXX",
    });

    expect(message).toContain("*New Single Order Inquiry - MotoGT*");
    expect(message).toContain("*Customer:* Amr Halawani (+962 7X XXX XXXX)");
    expect(message).toContain("*Product:*");
    expect(message).toContain("1 x Brake Pad Kit (*Code:* JOD-450-90)");
    expect(message).toContain("*Price:* 34.50 JOD");
    expect(message).toContain(
      "*Link:* https://motogt.com/product/brake-pad-kit-1025"
    );
    expect(message).toContain("I am interested in ordering this item.");
    expect(message).toContain("\n");
  });

  it("formats order inquiry message in Arabic", () => {
    const message = formatWhatsAppMessage({
      name: "فرامل",
      code: "SKU-123",
      price: 120,
      currency: "SAR",
      url: "https://motogt.com/product/test-1",
      lang: "ar",
      customerName: "عميل",
      customerPhone: "+962700000000",
    });

    expect(message).toContain("*استفسار طلب مفرد جديد - MotoGT*");
    expect(message).toContain("*العميل:* عميل (+962700000000)");
    expect(message).toContain("*المنتج:*");
    expect(message).toContain("1 x فرامل (*الكود:* SKU-123)");
    expect(message).toContain("*السعر:* 120 SAR");
    expect(message).toContain("*الرابط:* https://motogt.com/product/test-1");
    expect(message).toContain("أنا مهتم بطلب هذا المنتج.");
  });

  it("encodes line breaks and special URL characters in WhatsApp links", () => {
    const message = formatWhatsAppMessage({
      name: "Part #1",
      code: "SKU-123",
      price: "24.99",
      currency: "USD",
      url: "https://motogt.com/product/item-100?ref=a&color=red#specs",
      lang: "en",
    });

    const whatsappUrl = buildWhatsAppUrl(message, "962793003737");

    expect(whatsappUrl).toContain("https://wa.me/962793003737?text=");
    expect(whatsappUrl).toContain("%0A");
    expect(whatsappUrl).toContain("%23");
    expect(whatsappUrl).toContain("%26");
  });

  it("builds absolute product URLs from product paths", () => {
    const productPath = "/product/brake-pad-kit-1025";
    const absolute = new URL(productPath, "https://motogt.com").toString();

    expect(absolute).toBe("https://motogt.com/product/brake-pad-kit-1025");
  });

  it("formats cart order inquiry message for multiple products", () => {
    const message = generateWAMessage({
      items: [
        { productName: "BMW S1000RR Engine Guard", itemCode: "JO-2026-000078" },
        { productName: "Jetour T2 Side Vents", itemCode: "JO-2026-000079" },
      ],
      currency: "AED",
      totalAmount: "233.04",
      lang: "en",
      customerName: "Amr Halawani",
      customerPhone: "+962 7X XXX XXXX",
    });

    expect(message).toContain("*New Cart Order Inquiry - MotoGT*");
    expect(message).toContain("*Customer:* Amr Halawani (+962 7X XXX XXXX)");
    expect(message).toContain("*Items in Cart:*");
    expect(message).toContain("1 x BMW S1000RR Engine Guard (*Code:* JO-2026-000078)");
    expect(message).toContain("1 x Jetour T2 Side Vents (*Code:* JO-2026-000079)");
    expect(message).toContain("*Total Price:* 233.04 AED");
    expect(message).toContain("I want to order the items in my cart.");
  });

  it("shows quantity for duplicated cart items", () => {
    const message = generateWAMessage({
      items: [
        {
          productName: "BMW S1000RR Engine Guard",
          itemCode: "JO-2026-000078",
          quantity: 2,
        },
      ],
      currency: "AED",
      totalAmount: "466.08",
      lang: "en",
    });

    expect(message).toContain("*Items in Cart:*");
    expect(message).toContain("2 x BMW S1000RR Engine Guard (*Code:* JO-2026-000078)");
    expect(message).toContain("*Total Price:* 466.08 AED");
  });

  it("does not include customer details for guests", () => {
    const message = formatWhatsAppMessage({
      name: "Brake Pad Kit",
      code: "JOD-450-90",
      price: "34.50",
      currency: "JOD",
      url: "https://motogt.com/product/brake-pad-kit-1025",
      lang: "en",
    });

    expect(message).not.toContain("*Customer:*");
    expect(message).toContain("*Product:*");
    expect(message).toContain("1 x Brake Pad Kit (*Code:* JOD-450-90)");
  });
});
