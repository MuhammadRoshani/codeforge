"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCart } from "@/redux/slices/cartSlice";

/**
 * Cart Persistence Provider.
 *
 * - This component synchronizes the Redux shopping cart with the browser's
 * localStorage so that cart items remain available after page refreshes
 * or when the user returns to the application later.
 *
 * The persistence flow has two stages:
 *
 * 1. Initial restoration:
 *    When the application starts, the component reads the previously saved
 *    cart from localStorage and restores it into the Redux store through the
 *    setCart action.
 *
 * 2. Continuous persistence:
 *    After the initial restoration has completed, every change to the Redux
 *    cart is serialized and saved back to localStorage.
 *
 * - The initialization flag is important because Redux initially starts with
 * an empty cart. Without this flag, the persistence effect could save the
 * initial empty Redux state to localStorage before the previously saved cart
 * has been restored, which would overwrite the user's existing cart.
 *
 * useRef is used for the initialization flag because changing the flag should
 * not cause a component re-render. The value only needs to persist between
 * renders so the persistence effect can determine whether initialization has
 * completed.
 *
 * - This component does not render any visible UI. It only performs the
 * synchronization between Redux and localStorage and is mounted globally
 * inside the application's root component tree.
 *
 * Important:
 * localStorage is used only for client-side cart persistence. Its data is
 * never trusted by the backend for payment calculations. When an order is
 * created, the server retrieves the actual course information and prices
 * from MongoDB and calculates the final payable amount independently.
 */

export default function CartPersistence() {
  // Provides access to Redux actions for updating the cart state.
  const dispatch = useDispatch();

  // Retrieves the current cart items from the Redux store.
  const cart = useSelector((state) => state.cart.items);

  // Tracks whether the initial cart restoration has completed.
  const isInitialized = useRef(false);

  //  Restore the previously saved cart from localStorage,
  //  when the application initializes.
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        // Restore the cart only when the stored value is a valid array.
        if (Array.isArray(parsedCart)) {
          dispatch(setCart(parsedCart));
        }
      }
    } catch (error) {
      // Remove corrupted cart data so it cannot cause repeated parsing errors.
      console.error("Failed to load cart:", error);
      localStorage.removeItem("cart");
    } finally {
      // Allow the persistence effect to save future Redux cart changes.
      isInitialized.current = true;
    }
  }, [dispatch]);

  // Save Redux cart changes to localStorage after the initial restoration
  // has completed.
  useEffect(() => {
    // Prevent the initial Redux state from overwriting saved cart data.
    if (!isInitialized.current) return;

    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // This component only handles cart persistence and renders no UI.
  return null;
}
