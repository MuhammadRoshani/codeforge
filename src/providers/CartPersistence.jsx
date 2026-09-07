"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCart } from "@/redux/slices/cartSlice";

/**
 * Cart Persistence Provider.
 *
 * - Synchronizes the Redux cart state with the browser's localStorage so that
 * cart items remain available after page refreshes or when the user returns
 * to the application later.
 * - The component restores the previously saved cart from localStorage when
 * the application is initialized and dispatches the stored items to Redux.
 * - After the initial cart restoration is completed, any subsequent changes
 * to the Redux cart state are automatically saved back to localStorage.
 * - The initialization flag prevents the initial Redux state from overwriting
 * the previously saved cart before the localStorage data has been restored.
 * - This component does not render any visible UI and is mounted globally
 * through the application's root layout.
 */

export default function CartPersistence() {
  // Provides access to Redux actions for updating the cart state.
  const dispatch = useDispatch();

  // Retrieves the current cart items from the Redux store.
  const cart = useSelector((state) => state.cart.items);

  // Tracks whether the initial cart restoration from localStorage has completed.
  // useRef is used because changing this value should not trigger a component re-render.
  const isInitialized = useRef(false);

  // Restores the previously saved cart from localStorage when the component mounts.
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        // Only update Redux when the stored value is a valid array.
        if (Array.isArray(parsedCart)) {
          dispatch(setCart(parsedCart));
        }
      }
    } catch (error) {
      // Remove corrupted localStorage data so it does not cause repeated parsing errors.
      console.error("Failed to load cart:", error);
      localStorage.removeItem("cart");
    } finally {
      // Marks the initial localStorage restoration as completed.
      isInitialized.current = true;
    }
  }, [dispatch]);

  // Saves the updated Redux cart to localStorage after initialization is complete.
  useEffect(() => {
    // Prevents the initial Redux state from overwriting the saved cart.
    if (!isInitialized.current) return;

    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // This component only handles cart persistence and does not render any UI.
  return null;
}
