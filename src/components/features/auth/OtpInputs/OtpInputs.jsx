"use client";

import { useRef, useEffect } from "react";

import styles from "./OtpInputs.module.css";

/**
 * OTP verification inputs.
 *
 * * Receives the OTP state and setter from the parent component.
 * - Renders five OTP input fields.
 * - Updates the OTP state.
 * - Moves focus automatically between inputs.
 * - Handles Backspace navigation.
 * - Focuses the first input on mount.
 */

export default function OtpInputs({ otp, setOtp }) {
  const inputRefs = useRef([]);

  // Update OTP value and move focus to the next input.
  const handleInputChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");

    // Only allow one character per input.
    if (value.length === 1) {
      const updatedOtp = [...otp];

      updatedOtp[index] = value;

      setOtp(updatedOtp);

      if (index < otp.length - 1) {
        // Move focus to the next input.
        inputRefs.current[index + 1].focus();
      }
    }
  };

  // Handles Backspace key navigation and deletion.
  const handleBackspace = (e, index) => {
    if (e.key === "Backspace") {
      // Current input is empty.
      if (otp[index] === "" && index > 0) {
        const updatedOtp = [...otp];

        updatedOtp[index - 1] = "";

        setOtp(updatedOtp);

        inputRefs.current[index - 1].focus();
      } else {
        // Current input contains a value.
        const updatedOtp = [...otp];

        updatedOtp[index] = "";

        setOtp(updatedOtp);
      }
    }
  };

  // Focus the first input when the component mounts.
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);
  return (
    <>
      <div className={styles.otpInputWrapper}>
        {/* first input: */}
        <input
          type="text"
          className={styles.otpInput}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]*"
          autoComplete="one-time-code"
          ref={(elm) => (inputRefs.current[0] = elm)}
          onChange={(e) => handleInputChange(e, 0)}
          onKeyDown={(e) => handleBackspace(e, 0)}
          value={otp[0]}
        />

        {/* second input: */}
        <input
          type="text"
          className={styles.otpInput}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]*"
          autoComplete="one-time-code"
          ref={(elm) => (inputRefs.current[1] = elm)}
          onChange={(e) => handleInputChange(e, 1)}
          onKeyDown={(e) => handleBackspace(e, 1)}
          value={otp[1]}
        />

        {/* third input: */}
        <input
          type="text"
          className={styles.otpInput}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]*"
          autoComplete="one-time-code"
          ref={(elm) => (inputRefs.current[2] = elm)}
          onChange={(e) => handleInputChange(e, 2)}
          onKeyDown={(e) => handleBackspace(e, 2)}
          value={otp[2]}
        />

        {/* fourth input: */}
        <input
          type="text"
          className={styles.otpInput}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]*"
          autoComplete="one-time-code"
          ref={(elm) => (inputRefs.current[3] = elm)}
          onChange={(e) => handleInputChange(e, 3)}
          onKeyDown={(e) => handleBackspace(e, 3)}
          value={otp[3]}
        />

        {/* fifth input: */}
        <input
          type="text"
          className={styles.otpInput}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]*"
          autoComplete="one-time-code"
          ref={(elm) => (inputRefs.current[4] = elm)}
          onChange={(e) => handleInputChange(e, 4)}
          onKeyDown={(e) => handleBackspace(e, 4)}
          value={otp[4]}
        />
      </div>
    </>
  );
}
