"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Loader from "@/components/shared/Loader";
import { IoMdArrowRoundBack } from "react-icons/io";
import OtpInputs from "@/components/features/auth/OtpInputs";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

import styles from "./authPage.module.css";

/**
 * Authentication page for user login.
 *
 * Features:
 * - Allows users to enter their mobile number and request an OTP.
 * - Applies rate limits to OTP requests to prevent excessive requests
 *   from the same phone number or IP address.
 * - Displays the OTP verification step after successfully sending the code.
 * - Provides a back button so users can return to the phone number step
 *   and correct their number if it was entered incorrectly.
 * - Provides a resend option after the OTP countdown expires.
 * - Applies rate limits to OTP verification attempts to prevent
 *   repeated incorrect verification attempts.
 * - Blocks further verification attempts when the configured rate limit
 *   is exceeded until the rate-limit window expires.
 * - Verifies the submitted OTP and authenticates the user.
 * - Updates the authentication state after successful verification.
 * - Redirects the authenticated user to the appropriate dashboard
 *   based on their role.
 */

export default function AuthPage() {
  // Controls whether the OTP verification step is displayed.
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Stores the mobile number entered by the user.
  const [phone, setPhone] = useState("");

  // Indicates whether an authentication-related request is currently in progress.
  const [isLoading, setIsLoading] = useState(false);

  // Represents the empty state of the six-digit OTP input.
  const EMPTY_OTP = ["", "", "", "", ""];

  // Stores the OTP digits entered by the user.
  const [otp, setOtp] = useState([...EMPTY_OTP]);

  // Stores the remaining time before the user can request another OTP.
  const [timer, setTimer] = useState(120);

  /**
   * Indicates that the backend has blocked further OTP verification
   * attempts for the current phone number or IP address.
   *
   * When this becomes true, the resend action is also disabled in
   * the UI so the user cannot request another OTP from this screen.
   */
  const [isVerificationRateLimited, setIsVerificationRateLimited] =
    useState(false);

  // Provides access to the authentication context for updating the current user.
  const { setUser } = useAuth();

  // Provides navigation methods for redirecting the user after authentication.
  const router = useRouter();

  // Sends the OTP to the entered mobile number.
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data } = await api.post("/auth/sms/send", {
        phone,
      });

      if (data.success) {
        setIsOtpSent(true);

        // Start a fresh countdown for the newly sent OTP.
        setTimer(120);

        // Make sure a previous verification rate-limit state
        // does not remain when starting a new authentication flow.
        setIsVerificationRateLimited(false);

        toast.success("Verification code sent successfully.");
      } else {
        toast.error("Failed to send the verification code.");
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Validates the entered mobile number format.
  const isValidPhoneNumber = (phone) => /^09\d{9}$/.test(phone);

  // Allows the user to return to the phone number step and correct
  // their phone number if it was entered incorrectly.
  // Resets the OTP state and countdown timer.
  const handleEditPhoneNumber = () => {
    setOtp([...EMPTY_OTP]);
    setIsOtpSent(false);
    setTimer(120);
    setPhone("");

    // Reset the verification rate-limit UI state because
    // the user is starting a new phone-number flow.
    setIsVerificationRateLimited(false);
  };

  // Verifies the entered OTP and signs the user in.
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const otpCode = otp.join("");

    try {
      setIsLoading(true);

      const { data } = await api.post("/auth/sms/verify", {
        phone,
        otpCode,
      });

      toast.success("Logged in successfully.");

      // Update the authentication context immediately after a successful login.
      setUser(data.user);

      if (data.user.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/profile");
      }
    } catch (error) {
      const status = error.response?.status;
      const errorCode = error.response?.data?.code;

      /**
       * The backend returns VERIFY_RATE_LIMITED when the verification
       * rate limit has been reached.
       *
       * Once this happens, disable the resend action as well so the
       * verification screen cannot request another OTP.
       */
      if (status === 429 && errorCode === "VERIFY_RATE_LIMITED") {
        setIsVerificationRateLimited(true);

        toast.error(
          error.response?.data?.message ||
            "Too many verification attempts. Please try again later.",
        );
      } else if (status === 422) {
        toast.error("The verification code is incorrect.");
      } else if (status === 410) {
        toast.error("The verification code has expired.");
      } else {
        toast.error(
          error.response?.data?.message ||
            "Something went wrong. Please try again later.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Checks whether all OTP inputs have been filled.
  const isOtpComplete = otp.every((input) => input !== "");

  // Requests a new verification code and resets the OTP inputs.
  const handleResendOtp = async () => {
    /**
     * Do not allow the resend action when the backend has already
     * rate-limited OTP verification for this authentication flow.
     *
     * This is a frontend UX protection. The real security enforcement
     * is still performed by the backend rate-limit logic.
     */
    if (isVerificationRateLimited) {
      toast.error(
        "You cannot request a new code right now. Please try again later.",
      );

      return;
    }

    try {
      setIsLoading(true);

      const { data } = await api.post("/auth/sms/send", {
        phone,
      });

      if (data.success) {
        toast.success("Verification code sent successfully.");

        // Clear the previous OTP inputs.
        setOtp([...EMPTY_OTP]);

        // Start a fresh countdown for the new OTP.
        setTimer(120);
      } else {
        toast.error("Failed to send the verification code.");
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Starts and updates the OTP countdown timer while the verification screen is active.
  useEffect(() => {
    if (!isOtpSent || timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOtpSent, timer]);

  return (
    <>
      <div className={styles.authWrapper}>
        <div className={styles.left}></div>

        <div className={styles.authForm}>
          {/* Displays the phone number step before an OTP is sent. */}
          {!isOtpSent && (
            <>
              <h2>CODE FORGE</h2>

              <h3>Welcome back</h3>

              <p>Enter your mobile number</p>

              <form onSubmit={handleSendOtp}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Mobile number"
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                />

                {isLoading ? (
                  <Loader />
                ) : (
                  <button type="submit" disabled={!isValidPhoneNumber(phone)}>
                    Continue
                  </button>
                )}
              </form>
            </>
          )}

          {/* Displays the OTP verification step when an OTP has been sent. */}
          {isOtpSent && (
            <>
              <h2>CODE FORGE</h2>

              <div className={styles.gotoBack} onClick={handleEditPhoneNumber}>
                <IoMdArrowRoundBack size={"24px"} />
              </div>

              <p>
                We&apos;ve sent a verification code to{" "}
                <strong className={styles.phoneNumber}>{phone}</strong>
              </p>

              <h3>Enter the verification code</h3>

              <form onSubmit={handleVerifyOtp}>
                <OtpInputs otp={otp} setOtp={setOtp} />

                {isLoading ? (
                  <Loader />
                ) : (
                  <button
                    type="submit"
                    disabled={!isOtpComplete || isVerificationRateLimited}
                  >
                    Verify
                  </button>
                )}
              </form>

              <div className={styles.resendOtp}>
                {timer > 0 ? (
                  <p className={styles.timer}>
                    You can resend the code in {timer} seconds
                  </p>
                ) : isVerificationRateLimited ? (
                  <p className={`${styles.resend} ${styles.resendDisabled}`}>
                    Resend unavailable
                  </p>
                ) : (
                  <p className={styles.resend} onClick={handleResendOtp}>
                    Resend code
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.right}></div>
      </div>
    </>
  );
}
