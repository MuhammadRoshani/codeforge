"use client";

import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart, clearCart } from "@/redux/slices/cartSlice";

/**
 * Cart Hook.
 *
 * - Provides a reusable interface for accessing and managing the shopping cart
 * state through Redux Toolkit from client components.
 * - The hook retrieves the current cart items from the Redux store and provides
 * derived values such as the total number of courses and the final total price.
 * - It also exposes helper functions for adding courses to the cart, removing
 * individual courses, clearing the entire cart, and checking whether a
 * specific course is already included in the cart.
 * - Keeping these operations inside a custom hook allows components to interact
 * with the cart without directly depending on Redux dispatch and selector
 * implementation details.
 */

export default function useCart() {
  // Provides access to Redux actions for updating the cart state.
  const dispatch = useDispatch();

  // Retrieves the current cart items from the Redux store.
  const cart = useSelector((state) => state.cart.items);

  // Calculates the total number of courses currently in the cart.
  const cartCount = cart.length;

  // Calculates the total cart price using the discount price when a valid discount exists.
  const totalPrice = cart.reduce((sum, item) => {
    const finalPrice =
      item.discountPrice != null && item.discountPrice < item.price
        ? item.discountPrice
        : item.price || 0;

    return sum + finalPrice;
  }, 0);

  // Checks whether a specific course is already included in the cart.
  const isInCart = (courseId) => {
    return cart.some((item) => item._id === courseId);
  };

  // Dispatches the action responsible for adding a course to the cart.
  const handleAddToCart = (course) => {
    dispatch(addToCart(course));
  };

  // Dispatches the action responsible for removing a course from the cart.
  const handleRemoveFromCart = (courseId) => {
    dispatch(removeFromCart(courseId));
  };

  // Dispatches the action responsible for clearing all courses from the cart.
  const handleClearCart = () => {
    dispatch(clearCart());
  };

  // Exposes cart state, derived values, and cart actions to components.
  return {
    cart,
    cartCount,
    totalPrice,
    addToCart: handleAddToCart,
    removeFromCart: handleRemoveFromCart,
    clearCart: handleClearCart,
    isInCart,
  };
}
