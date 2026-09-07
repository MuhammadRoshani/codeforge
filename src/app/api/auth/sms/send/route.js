import { NextResponse } from "next/server";
import connectDB from "@/configs/db";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";
import { randomInt } from "crypto";
import bcrypt from "bcrypt";

/**
 * Handles OTP authentication requests.
 *
 * - Validates the phone number.
 * - Identifies the client's IP address.
 * - Checks request-based rate limits before consuming them.
 * - Prevents duplicate OTP requests while the coolDown is active.
 * - Checks successful SMS limits before sending the OTP.
 * - Consumes request limits before contacting the SMS provider.
 * - Generates and sends a new OTP via the SMS provider.
 * - Consumes successful SMS limits only after SMS delivery succeeds.
 * - Hashes the OTP before storing it in the database.
 * - Creates a new user or updates the existing user's OTP.
 *
 * Rate limiting is applied at both phone-number and IP-address levels
 * to reduce OTP abuse and prevent bypassing limits through different
 * phone numbers or repeated requests from the same IP address.
 */

// Validate the phone number format before processing the request.
const validatePhoneNumber = (phone) => /^09\d{9}$/.test(phone);

// Extract the client's IP address from the request headers.
const getClientIp = (req) => {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") || "unknown";
};

// Rate-limit configuration.
const RATE_LIMIT_WINDOW = 30 * 60 * 1000;

// Request limits.
const REQUEST_PHONE_LIMIT = 10;
const REQUEST_IP_LIMIT = 30;

// Successful SMS limits.
const SUCCESSFUL_SMS_PHONE_LIMIT = 5;
const SUCCESSFUL_SMS_IP_LIMIT = 20;

// OTP expiration and resend coolDown durations.
const OTP_EXPIRES_IN = 2 * 60 * 1000;
const OTP_COOLDOWN = 2 * 60 * 1000;

export async function POST(req) {
  try {
    // Parse the request body and handle invalid JSON payloads.
    let requestBody;

    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const { phone } = requestBody;

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required.",
        },
        { status: 400 },
      );
    }

    if (!validatePhoneNumber(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number.",
        },
        { status: 400 },
      );
    }

    // Identify the client IP for IP-based rate limiting.
    const clientIp = getClientIp(req);

    await connectDB();

    // Retrieve the user associated with the phone number.
    const user = await User.findOne({ phone });

    // Prevent sending a new OTP while the coolDown is active.
    if (user?.otp?.coolDownUntil) {
      const coolDownUntil = user.otp.coolDownUntil.getTime();

      if (coolDownUntil > Date.now()) {
        const retryAfter = Math.max(
          Math.ceil((coolDownUntil - Date.now()) / 1000),
          0,
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "An OTP has already been sent. Please wait before requesting a new one.",
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
            },
          },
        );
      }
    }

    /**
     * Check the request rate limits without consuming attempts.
     *
     * Both limits are checked before any request counter is consumed.
     * This prevents one limit from being consumed when another limit
     * would immediately reject the request.
     */

    const phoneRequestLimit = await rateLimit({
      key: `otp:request:phone:${phone}`,
      limit: REQUEST_PHONE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: false,
    });

    if (!phoneRequestLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: phoneRequestLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": phoneRequestLimit.retryAfter.toString(),
          },
        },
      );
    }

    const ipRequestLimit = await rateLimit({
      key: `otp:request:ip:${clientIp}`,
      limit: REQUEST_IP_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: false,
    });

    if (!ipRequestLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: ipRequestLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipRequestLimit.retryAfter.toString(),
          },
        },
      );
    }

    /**
     * Check the successful SMS rate limits without consuming attempts.
     *
     * These limits count only successfully accepted SMS messages,
     * so they are consumed only after the SMS provider succeeds.
     */

    const phoneSuccessfulSmsLimit = await rateLimit({
      key: `otp:sms:phone:${phone}`,
      limit: SUCCESSFUL_SMS_PHONE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: false,
    });

    if (!phoneSuccessfulSmsLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have reached the maximum number of OTP messages. Please try again later.",
          retryAfter: phoneSuccessfulSmsLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": phoneSuccessfulSmsLimit.retryAfter.toString(),
          },
        },
      );
    }

    const ipSuccessfulSmsLimit = await rateLimit({
      key: `otp:sms:ip:${clientIp}`,
      limit: SUCCESSFUL_SMS_IP_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: false,
    });

    if (!ipSuccessfulSmsLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many OTP messages have been sent from this network. Please try again later.",
          retryAfter: ipSuccessfulSmsLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipSuccessfulSmsLimit.retryAfter.toString(),
          },
        },
      );
    }

    /**
     * Consume the request limits after all non-consuming checks
     * have passed.
     *
     * Request limits count attempts regardless of SMS delivery.
     */

    const phoneRequestConsumption = await rateLimit({
      key: `otp:request:phone:${phone}`,
      limit: REQUEST_PHONE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: true,
    });

    if (!phoneRequestConsumption.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: phoneRequestConsumption.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": phoneRequestConsumption.retryAfter.toString(),
          },
        },
      );
    }

    const ipRequestConsumption = await rateLimit({
      key: `otp:request:ip:${clientIp}`,
      limit: REQUEST_IP_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: true,
    });

    if (!ipRequestConsumption.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: ipRequestConsumption.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipRequestConsumption.retryAfter.toString(),
          },
        },
      );
    }

    // Generate a cryptographically secure 5-digit OTP.
    const otpCode = randomInt(10000, 100000).toString();

    // Set the OTP expiration and coolDown times.
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN);
    const coolDownUntil = new Date(Date.now() + OTP_COOLDOWN);

    // Send the OTP using the SMS provider's pattern API.
    let smsResponse;

    try {
      smsResponse = await fetch(
        "https://api.iranpayamak.com/ws/v1/sms/pattern",
        {
          method: "POST",
          body: JSON.stringify({
            code: process.env.IRANPAYAMAK_PATTERN_ID,
            attributes: {
              code: otpCode,
            },
            recipient: phone,
            line_number: process.env.IRANPAYAMAK_LINE_NUMBER,
            number_format: "english",
          }),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": process.env.IRANPAYAMAK_API_KEY,
          },
        },
      );
    } catch (error) {
      // Request limits have already been consumed, but successful SMS
      // limits remain unchanged because the SMS was not delivered.

      console.error("SMS provider request failed:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send the OTP.",
        },
        { status: 502 },
      );
    }

    // Do not consume successful SMS limits when the provider rejects the request.
    if (!smsResponse.ok) {
      console.error(
        "SMS provider returned an unsuccessful response:",
        smsResponse.status,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send the OTP.",
        },
        { status: 502 },
      );
    }

    /**
     * The SMS provider accepted the message.
     *
     * Successful SMS limits are consumed only after the provider
     * successfully accepts the message.
     */

    const successfulPhoneConsumption = await rateLimit({
      key: `otp:sms:phone:${phone}`,
      limit: SUCCESSFUL_SMS_PHONE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: true,
    });

    if (!successfulPhoneConsumption.allowed) {
      console.error(
        "Successful SMS phone rate limit was reached after SMS delivery.",
      );

      return NextResponse.json(
        {
          success: false,
          message: "OTP delivery limit reached. Please try again later.",
          retryAfter: successfulPhoneConsumption.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": successfulPhoneConsumption.retryAfter.toString(),
          },
        },
      );
    }

    const successfulIpConsumption = await rateLimit({
      key: `otp:sms:ip:${clientIp}`,
      limit: SUCCESSFUL_SMS_IP_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: true,
    });

    if (!successfulIpConsumption.allowed) {
      console.error(
        "Successful SMS IP rate limit was reached after SMS delivery.",
      );

      return NextResponse.json(
        {
          success: false,
          message: "OTP delivery limit reached. Please try again later.",
          retryAfter: successfulIpConsumption.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": successfulIpConsumption.retryAfter.toString(),
          },
        },
      );
    }

    // Hash the OTP before storing it in the database.
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    // Store the hashed OTP, expiration time, and coolDown.
    if (user) {
      user.otp.code = hashedOtp;
      user.otp.expiresAt = expiresAt;
      user.otp.coolDownUntil = coolDownUntil;

      await user.save();
    } else {
      await User.create({
        phone,
        otp: {
          code: hashedOtp,
          expiresAt,
          coolDownUntil,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending OTP:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected server error occurred.",
      },
      { status: 500 },
    );
  }
}
