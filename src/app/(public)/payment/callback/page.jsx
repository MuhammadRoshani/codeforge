"use client";

import { useRouter, useSearchParams } from "next/navigation";
import useCart from "@/hooks/useCart";
import useAuth from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import api from "@/utils/axios";

import styles from "./PaymentCallback.module.css";

/**
 * Payment Callback Page.
 *
 * - Receives the payment authority and status returned by ZarinPal.
 * - Sends the payment information to the server for secure verification.
 * - The server verifies the transaction directly with ZarinPal and finalizes
 * the related order when the payment is successful.
 * - After a successful payment, the authenticated user's data is refreshed
 * and the Redux shopping cart is cleared.
 * - Axios is used for the verification request so authentication cookies and
 * the centralized token refresh mechanism remain active.
 */

export default function PaymentCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { clearCart } = useCart();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    success: false,
    message: "",
    refId: "",
  });

  // Prevents duplicate verification requests during development
  // or repeated effect execution.
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (verificationStarted.current) return;

    verificationStarted.current = true;

    const verifyPayment = async () => {
      const authority = searchParams.get("Authority");
      const status = searchParams.get("Status");

      if (!authority || !status) {
        setResult({
          success: false,
          message: "Payment information is incomplete.",
          refId: "",
        });

        setLoading(false);

        return;
      }

      try {
        // Send the payment information to the server for ZarinPal verification.
        const response = await api.post("/payment/verify", {
          authority,
          status,
        });

        const data = response.data;

        setResult({
          success: data.success,
          message: data.message,
          refId: data.refId || "",
        });

        if (data.success) {
          // Refresh the authenticated user's data after a successful purchase.
          await refreshUser();

          // Clear the Redux cart only after the payment has been verified.
          clearCart();
        }
      } catch (error) {
        console.error("Payment verification error:", error);

        const message =
          error.response?.data?.message ||
          "An error occurred while verifying the payment.";

        setResult({
          success: false,
          message,
          refId: "",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, refreshUser, clearCart]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.loader}></div>

          <h2>Verifying Payment...</h2>

          <p>Please wait while we verify your payment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={result.success ? styles.successIcon : styles.errorIcon}>
          {result.success ? "✓" : "✕"}
        </div>

        <h1>{result.success ? "Payment Successful" : "Payment Failed"}</h1>

        <p>{result.message}</p>

        {result.success && result.refId && (
          <div className={styles.refBox}>
            <span>Reference ID</span>

            <strong>{result.refId}</strong>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            router.push(result.success ? "/profile/courses" : "/cart")
          }
        >
          {result.success ? "View My Courses" : "Return to Cart"}
        </button>
      </div>
    </div>
  );
}
