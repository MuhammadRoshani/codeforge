"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import useCart from "@/hooks/useCart";
import useAuth from "@/hooks/useAuth";
import api from "@/utils/axios";
import axios from "axios";

import styles from "./PaymentCallback.module.css";

/**
 * Payment Callback Component.
 *
 * Handles the client-side payment callback returned by ZarinPal.
 *
 * The component:
 *
 * - Reads the payment authority and status from the callback URL.
 * - Sends the payment information to the server for secure verification.
 * - Displays the payment verification result to the user.
 * - Refreshes the authenticated user's data after a successful payment.
 * - Clears the Redux shopping cart only after successful payment verification.
 *
 * The component uses useSearchParams to access the query parameters returned
 * by ZarinPal. It is rendered inside a Suspense boundary by the parent page
 * component because Next.js requires useSearchParams to be wrapped in
 * Suspense during production builds.
 */

interface PaymentResult {
  success: boolean;
  message: string;
  refId: string;
}

interface PaymentVerifyResponse {
  success: boolean;
  message: string;
  refId?: string;
}

export default function PaymentCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { clearCart } = useCart();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);

  const [result, setResult] = useState<PaymentResult>({
    success: false,
    message: "",
    refId: "",
  });

  // Prevent duplicate verification requests during development
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
        const response = await api.post<PaymentVerifyResponse>(
          "/payment/verify",
          {
            authority,
            status,
          },
        );

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
      } catch (error: unknown) {
        console.error("Payment verification error:", error);

        const message =
          axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "An error occurred while verifying the payment.";

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
