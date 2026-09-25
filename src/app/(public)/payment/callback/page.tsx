import { Suspense } from "react";
import PaymentCallback from "./PaymentCallback";

import styles from "./PaymentCallback.module.css";

/**
 * Payment Callback Page.
 *
 * - Provides the Suspense boundary required by Next.js for the client-side
 * payment callback component that uses useSearchParams.
 * - The page itself remains a Server Component, while PaymentCallback handles
 * the client-side payment verification logic.
 */

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.wrapper}>
          <div className={styles.card}>
            <div className={styles.loader}></div>

            <h2>Verifying Payment...</h2>

            <p>Please wait while we verify your payment.</p>
          </div>
        </div>
      }
    >
      <PaymentCallback />
    </Suspense>
  );
}
