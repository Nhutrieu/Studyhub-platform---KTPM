import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/lib/types";
import { cartService } from "@/services/cartService";

// 🔧 Helper function to sync cart with backend
async function syncCartToBackend(items: CartItem[]) {
  try {
    if (items.length === 0) {
      await cartService.clearCart();
    } else {
      // Map to DTO to avoid sending unnecessary data like full product object
      const syncItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        branchId: item.branchId,
      }));
      await cartService.syncCart(syncItems);
    }
  } catch (error) {
    console.error("Cart sync failed:", error);
  }
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalAmount: 0,
      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find(
          (i) => i.productId === item.productId && i.branchId === item.branchId
        );

        if (existingItem) {
          get().updateQuantity(
            existingItem.id,
            existingItem.quantity + item.quantity
          );
        } else {
          const newItem: CartItem = {
            ...item,
            id: `temp-${Date.now()}-${Math.random()}`,
          };
          set((state) => {
            const newItems = [...state.items, newItem];
            return {
              items: newItems,
              totalItems: newItems.reduce((sum, i) => sum + i.quantity, 0),
              totalAmount: newItems.reduce(
                (sum, i) => sum + i.price * i.quantity,
                0
              ),
            };
          });
          const updatedItems = get().items;
          syncCartToBackend(updatedItems).catch((err) =>
            console.error("Failed to sync cart after add:", err)
          );
        }
      },
      removeItem: (itemId) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== itemId);
          return {
            items: newItems,
            totalItems: newItems.reduce((sum, i) => sum + i.quantity, 0),
            totalAmount: newItems.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0
            ),
          };
        });
        // 🔧 SYNC WITH BACKEND after removal
        const updatedItems = get().items.filter((i) => i.id !== itemId);
        syncCartToBackend(updatedItems).catch((err) =>
          console.error("Failed to sync cart after removal:", err)
        );
      },
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => {
          const newItems = state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          );
          return {
            items: newItems,
            totalItems: newItems.reduce((sum, i) => sum + i.quantity, 0),
            totalAmount: newItems.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0
            ),
          };
        });
        // 🔧 SYNC WITH BACKEND after update
        const updatedItems = get().items;
        syncCartToBackend(updatedItems).catch((err) =>
          console.error("Failed to sync cart after update:", err)
        );
      },
      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          totalAmount: 0,
        });
      },
      setCart: (items) => {
        // Ensure all items have valid price and preserve branchId
        const validItems = items.map((item) => ({
          ...item,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
          branchId: item.branchId || undefined, // Preserve branchId
        }));
        set({
          items: validItems,
          totalItems: validItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          totalAmount: validItems.reduce(
            (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 0),
            0
          ),
        });
      },
    }),
    {
      name: "cart-storage",
    }
  )
);
