import { apiRequest } from "@/lib/api";

export interface ProductReview {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  is_featured: boolean;
  created_at: string;
}

export async function fetchProductReviews(productId: string) {
  const data = await apiRequest<{ reviews: ProductReview[] }>(`/api/products/${productId}/reviews`);
  return data.reviews;
}

export async function submitProductReview(productId: string, input: { rating: number; comment: string }) {
  const data = await apiRequest<{ review: ProductReview }>(`/api/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.review;
}
