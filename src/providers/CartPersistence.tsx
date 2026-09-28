"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCart, clearCart } from "@/redux/slices/cartSlice";
import type { CartCourse } from "@/redux/slices/cartSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import useAuth from "@/hooks/useAuth";

/**
 * Cart Persistence Provider.
 *
 * - This component synchronizes the Redux shopping cart with the browser's
 * localStorage so that cart items remain available after page refreshes
 * or when the user returns to the application later.
 *
 * The persistence flow is associated with the authenticated user:
 *
 * 1. Initial authentication:
 *    The component waits until AuthProvider finishes checking the current
 *    authentication state.
 *
 * 2. User-specific restoration:
 *    When an authenticated user is available, the component reads that
 *    user's cart from a user-specific localStorage key and restores it into
 *    the Redux store.
 *
 * 3. Continuous persistence:
 *    Changes to the authenticated user's Redux cart are saved back to that
 *    user's localStorage entry.
 *
 * 4. Logout:
 *    When the authenticated user becomes null, the visible Redux cart is
 *    cleared. The user's previously saved localStorage cart is intentionally
 *    preserved so it can be restored when the same user logs in again.
 *
 * - Different authenticated users therefore have completely separate
 * localStorage cart entries and cannot see each other's carts.
 *
 * - localStorage is used only for client-side cart persistence. Its data is
 * never trusted by the backend for payment calculations. When an order is
 * created, the server retrieves the actual course information and prices
 * from MongoDB and calculates the final payable amount independently.
 */

// Checks whether a parsed localStorage value is a valid CartCourse array.
function isCartCourseArray(value: unknown): value is CartCourse[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "_id" in item &&
      typeof item._id === "string" &&
      "price" in item &&
      typeof item.price === "number" &&
      "discountPrice" in item &&
      (typeof item.discountPrice === "number" || item.discountPrice === null),
  );
}

// Creates a unique localStorage key for the authenticated user's cart.
function getCartStorageKey(phone: string): string {
  return `cart_${phone}`;
}

export default function CartPersistence() {
  // Provides access to Redux actions for updating the cart state.
  const dispatch = useDispatch<AppDispatch>();

  // Retrieves the current cart items from the Redux store.
  const cart = useSelector((state: RootState) => state.cart.items);

  // Retrieves the current authentication state.
  const { user, isLoading } = useAuth();

  /**
   * Restores the authenticated user's cart when authentication
   * state has finished loading.
   */
  useEffect(() => {
    // Wait until the authentication state is fully resolved.
    if (isLoading) return;

    // No authenticated user means there is no visible cart.
    if (!user) {
      dispatch(clearCart());
      return;
    }

    try {
      const storageKey = getCartStorageKey(user.phone);
      const savedCart = localStorage.getItem(storageKey);

      if (!savedCart) {
        // The authenticated user has no previously stored cart.
        dispatch(clearCart());
        return;
      }

      const parsedCart: unknown = JSON.parse(savedCart);

      // Restore the cart only when the stored value is a valid array.
      if (isCartCourseArray(parsedCart)) {
        dispatch(setCart(parsedCart));
      } else {
        // Remove invalid cart data so it cannot affect future sessions.
        localStorage.removeItem(storageKey);
        dispatch(clearCart());
      }
    } catch (error: unknown) {
      // Remove corrupted cart data so it cannot cause repeated parsing errors.
      console.error("Failed to load cart:", error);

      const storageKey = getCartStorageKey(user.phone);

      localStorage.removeItem(storageKey);
      dispatch(clearCart());
    }
  }, [dispatch, isLoading, user]);

  /**
   * Save the authenticated user's cart changes to localStorage.
   *
   * The cart is intentionally not saved when there is no authenticated user.
   * This prevents the empty Redux cart produced during logout from
   * overwriting the user's previously stored cart.
   */
  useEffect(() => {
    // Do not persist anything while authentication is still being resolved.
    if (isLoading) return;

    // Never persist a cart for an unauthenticated user.
    if (!user) return;

    const storageKey = getCartStorageKey(user.phone);

    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, isLoading, user]);

  // This component only handles cart persistence and renders no UI.
  return null;
}
