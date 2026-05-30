import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { CartItem, Product } from "@/lib/types";
import { productService } from "./productService";

// Backend returns CartDocument with items array
interface CartResponse {
  items: CartItemDocument[];
  userId?: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

type CartItemDocument = Partial<CartItem> & {
  _id?: string;
  product?: (Product & { _id?: string });
  price?: number;
  id?: string;
  productId?: string;
  branchId?: string; // Ensure branchId is included
};

const normalizeCartItem = (
  item: CartItemDocument,
  fallbackProductId?: string,
  fallbackProduct?: Product
): CartItem => {
  const product = fallbackProduct ?? item.product ?? ({} as Product);
  const productId =
    item.productId || product?.id || product?._id || fallbackProductId || "";
  const price = Number(item.price ?? product?.price ?? 0);

  return {
    ...item,
    id: item.id || item._id || `temp-${Date.now()}-${Math.random()}`,
    productId,
    price,
    branchId: item.branchId || (item as any).branchId, // Preserve branchId from backend
    product: {
      ...product,
      images: product?.images || [],
      name: product?.name || "Sản phẩm",
      id: product?.id || product?._id || productId,
      price: product?.price || price,
    } as Product,
  } as CartItem;
};

export const cartService = {
  getCart: async (): Promise<CartItem[]> => {
    const response = await apiClient.get<CartResponse>(
      endpoints.cart.get
    );
    // apiClient interceptor already unwraps response.data.data to response.data
    // Backend returns CartDocument with items array
    const cartData = response.data as any;
    const items = (cartData?.items || []) as any[];
    // Fetch product info for items that don't have it
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        let product = item.product || ({} as Product);
        
        // If product info is missing, fetch it from product service
        if (!product?.id && !product?.name && item.productId) {
          try {
            const fetchedProduct = await productService.getProduct(item.productId);
            product = fetchedProduct;
          } catch (error) {
            // If product fetch fails, use fallback
            console.warn(`Failed to fetch product ${item.productId}:`, error);
          }
        }
        
        return normalizeCartItem(item, item.productId, product);
      })
    );
    
    return itemsWithProducts;
  },

  syncCart: async (items: Array<{ productId: string; quantity: number; branchId?: string }>): Promise<CartItem[]> => {
    const response = await apiClient.post<CartResponse>(endpoints.cart.sync, { items });
    // apiClient interceptor already unwraps response.data.data to response.data
    // Backend returns CartDocument with items array
    const cartData = response.data as any;
    const backendItems = (cartData?.items || []) as any[];
    // Ensure all items have required fields including price and branchId
    return backendItems.map(item => normalizeCartItem(item, item.productId, item.product));
  },

  addToCart: async (
    productId: string,
    quantity: number,
    branchId?: string
  ): Promise<CartItem> => {
    const response = await apiClient.post<CartResponse>(
      endpoints.cart.add,
      { productId, quantity, branchId }
    );
    // apiClient interceptor already unwraps response.data.data to response.data
    // Backend returns CartDocument, but we need the last item added
    // In practice, backend should return the updated cart or the added item
    // For now, we'll return the first item or create a temporary one
    const cartData = response.data as any;
    const items = (cartData?.items || []) as any[];
    const lastItem = items[items.length - 1];
    if (lastItem) {
      return normalizeCartItem(lastItem, productId, lastItem.product);
    }
    // Fallback: create a minimal cart item
    return { 
      productId, 
      quantity, 
      branchId, 
      price: 0, 
      product: {} as Product, 
      id: "" 
    };
  },

  updateCartItem: async (productId: string, quantity: number): Promise<CartItem> => {
    const response = await apiClient.put<CartResponse>(
      endpoints.cart.update(productId),
      { quantity }
    );
    // apiClient interceptor already unwraps response.data.data to response.data
    // Backend returns CartDocument, find the updated item
    const cartData = response.data as any;
    const items = (cartData?.items || []) as any[];
    const foundItem = items.find((item: any) => item.productId === productId);
    if (foundItem) {
      return normalizeCartItem(foundItem, productId, foundItem.product);
    }
    // Fallback: create a minimal cart item
    return { 
      productId, 
      quantity, 
      price: 0, 
      product: {} as Product, 
      id: "" 
    };
  },

  removeFromCart: async (productId: string): Promise<void> => {
    await apiClient.delete(endpoints.cart.remove(productId));
  },

  clearCart: async (): Promise<void> => {
    await apiClient.delete(endpoints.cart.clear);
  },
};
