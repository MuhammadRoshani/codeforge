"use client";

import useAuth from "@/hooks/useAuth";
import useCart from "@/hooks/useCart";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { FaShoppingCart, FaArrowRight, FaTrash } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";

import styles from "./Cart.module.css";

/**
 * Shopping Cart Page.
 *
 * - Displays all courses currently added to the user's shopping cart and
 * provides the main actions required to manage the cart before checkout.
 * - Cart state and cart actions are managed through the custom useCart hook,
 * which connects the page to the Redux Toolkit cart slice.
 * - The page displays each course with its thumbnail, title, final price,
 * and remove action, while the cart summary shows the total number of
 * courses and the final amount to be paid.
 * - Discounted courses use the discount price only when a valid discount
 * exists and the discount price is lower than the original course price.
 * - Course removal requires user confirmation through SweetAlert2.
 * - The entire cart can also be cleared at once after the user confirms
 * the bulk removal action through SweetAlert2.
 * - Checkout requests are sent through the centralized Axios instance,
 * which automatically includes authentication cookies and handles access
 * token refresh when required.
 * - The current checkout process is a temporary test flow and can later
 * be connected to a real payment gateway.
 */

export default function Cart() {
  const { refreshUser } = useAuth();
  // Retrieves cart data and cart actions from the Redux-based cart hook.
  const { cart, totalPrice, removeFromCart, clearCart } = useCart();

  const router = useRouter();

  // Tracks the loading state of the checkout process.
  const [loading, setLoading] = useState(false);

  // Displays a confirmation dialog before removing a course from the cart.
  const handleRemoveFromCart = async (course) => {
    const result = await Swal.fire({
      title: "Remove Course?",
      text: `Are you sure you want to remove "${course.title}" from your cart?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    // Removes the course only after the user confirms the action.
    if (result.isConfirmed) {
      removeFromCart(course._id);

      // Displays a success message after the course has been removed.
      await Swal.fire({
        title: "Removed",
        text: "The course has been removed from your cart.",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#1D4ED8",
        customClass: {
          popup: "deleteCourseAlert",
          confirmButton: "deleteConfirmButton",
        },
      });
    }
  };

  // Displays a confirmation dialog before clearing the entire cart.
  const handleClearCart = async () => {
    const result = await Swal.fire({
      title: "Clear Shopping Cart?",
      text: `Are you sure you want to remove all ${cart.length} courses from your cart?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Clear Cart",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    // Clears all cart items only after the user confirms the bulk removal.
    if (result.isConfirmed) {
      clearCart();

      // Displays a success message after the entire cart has been cleared.
      await Swal.fire({
        title: "Cart Cleared",
        text: "All courses have been removed from your cart.",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#1D4ED8",
        customClass: {
          popup: "deleteCourseAlert",
          confirmButton: "deleteConfirmButton",
        },
      });
    }
  };

  // Sends the current cart courses to the temporary checkout API.
  const handleCheckout = async () => {
    // Prevents the checkout request from running when the cart is empty.
    if (cart.length === 0) {
      return toast.error("Your cart is empty.");
    }

    try {
      // Disables the checkout button while the purchase request is processing.
      setLoading(true);

      // Sends only the course IDs because the server is responsible for
      // validating the courses and determining the actual purchase data.
      const { data } = await api.post("/cart/checkout", {
        courseIds: cart.map((course) => course._id),
      });

      // Displays the server-provided error message when the checkout fails.
      if (!data.success) {
        return toast.error(data.message);
      }

      await refreshUser();
      // Clears the local Redux cart only after the server confirms the purchase.
      clearCart();

      // Displays the successful checkout message returned by the API.
      toast.success(data.message);

      // Redirects the user to the homepage after the purchase is completed.
      router.replace("/");
    } catch (error) {
      // Extracts the API error message when the server returns a structured error.
      const message =
        error.response?.data?.message ||
        "Something went wrong while completing your purchase.";

      // Displays the checkout error without clearing the user's cart.
      toast.error(message);
    } finally {
      // Re-enables the checkout button after the request has completed.
      setLoading(false);
    }
  };

  // Displays the empty cart state when no courses have been added.
  if (cart.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <FaShoppingCart size={80} color="#cbd5e1" />

        <h2>Your Cart Is Empty</h2>

        <p>You have not added any courses to your cart yet.</p>

        <Link href="/courses" className={styles.browseBtn}>
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.cartPage}>
      {/* Cart page header with the page title and link to continue shopping. */}
      <div className={styles.header}>
        <h1 className={styles.title}>Shopping Cart</h1>

        <Link href="/courses" className={styles.backLink}>
          Continue Shopping
          <FaArrowRight />
        </Link>
      </div>

      <div className={styles.cartContainer}>
        {/* Displays all courses currently stored in the Redux cart. */}
        <div className={styles.cartItems}>
          {cart.map((course) => {
            // Determines whether the course has a valid discounted price.
            const hasDiscount =
              course.discountPrice != null &&
              course.price != null &&
              course.discountPrice < course.price;

            // Uses the discounted price when a valid discount exists.
            const finalPrice = hasDiscount
              ? course.discountPrice
              : course.price || 0;

            return (
              <div key={course._id} className={styles.cartItem}>
                {/* Course thumbnail. */}
                <div className={styles.itemThumbnail}>
                  <Image
                    src={course.thumbnail || "/images/default-course.jpg"}
                    alt={course.title}
                    width={120}
                    height={80}
                    className={styles.thumbnailImg}
                  />
                </div>

                {/* Course title and basic information. */}
                <div className={styles.itemInfo}>
                  <h3 className={styles.itemTitle}>{course.title}</h3>
                </div>

                {/* Displays the final course price and the original price when discounted. */}
                <div className={styles.itemPrice}>
                  {hasDiscount && (
                    <span className={styles.originalPrice}>
                      {course.price.toLocaleString()} T
                    </span>
                  )}

                  <span className={styles.finalPrice}>
                    {finalPrice.toLocaleString()} T
                  </span>
                </div>

                {/* Opens a confirmation dialog before removing the selected course. */}
                <button
                  type="button"
                  onClick={() => handleRemoveFromCart(course)}
                  className={styles.removeBtn}
                  aria-label={`Remove ${course.title} from cart`}
                >
                  <FaTrash />
                </button>
              </div>
            );
          })}
        </div>

        {/* Displays the cart totals and provides cart management actions. */}
        <div className={styles.cartSummary}>
          <div className={styles.summaryHeader}>
            <h3>Cart Summary</h3>

            <p>
              {cart.length} {cart.length === 1 ? "course" : "courses"}
            </p>
          </div>

          <div className={styles.priceDetails}>
            <div className={styles.priceRow}>
              <span>Total Price</span>

              <span>{totalPrice.toLocaleString()} T</span>
            </div>
          </div>

          <div className={styles.totalPrice}>
            <span>Final Amount</span>

            <span className={styles.finalAmount}>
              {totalPrice.toLocaleString()} T
            </span>
          </div>

          {/* Clears all courses from the cart after user confirmation. */}
          <button
            type="button"
            onClick={handleClearCart}
            className={styles.clearCartBtn}
            disabled={loading}
          >
            <FaTrash />
            Clear Cart
          </button>

          {/* Starts the checkout process through the centralized Axios API client. */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className={styles.checkoutBtn}
          >
            {loading ? "Processing..." : "Complete Purchase"}
          </button>

          <p className={styles.secureNote}>
            Secure payment through a trusted payment gateway
          </p>
        </div>
      </div>
    </div>
  );
}
