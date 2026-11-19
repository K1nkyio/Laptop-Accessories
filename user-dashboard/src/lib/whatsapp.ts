import { apiRequest } from "@/lib/api";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "254700000000";

export interface WhatsAppProduct {
  id: string;
  name: string;
  price?: number;
  currency?: string;
}

export function getWhatsAppOrderUrl(product: WhatsAppProduct): string {
  const text = [
    `Hello Stacked, I want to order: ${product.name}.`,
    product.price ? `Price shown: ${product.currency ?? "USD"} ${product.price}.` : "",
    "Is it available?",
  ]
    .filter(Boolean)
    .join(" ");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function captureWhatsAppInquiry(product: WhatsAppProduct) {
  const message = `Hello Stacked, I want to order: ${product.name}. Is it available?`;

  return apiRequest("/api/inquiries", {
    method: "POST",
    body: JSON.stringify({
      productId: product.id,
      productName: product.name,
      source: "whatsapp",
      message,
    }),
  });
}
