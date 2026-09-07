import { NextResponse } from "next/server";
import connectDB from "@/configs/db";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Verifies an OTP and authenticates the user.
 *
 * - Validates the phone number and OTP format.
 * - Applies phone-based and IP-based rate limits.
 * - Returns a dedicated error code when verification is rate-limited,
 *   allowing the frontend to disable the resend action as well.
 * - Rolls back the phone limit if the IP limit cannot be consumed.
 * - Retrieves the user and checks the OTP expiration.
 * - Compares the submitted OTP with its hashed value.
 * - Makes the first successfully verified user an admin.
 * - Generates an access token and refresh token.
 * - Stores only the hashed refresh token in the database.
 * - Clears the used OTP after successful verification.
 * - Stores authentication tokens in secure HTTP-only cookies.
 */

// Validate the phone number format before querying the database.
const validatePhoneNumber = (phone) => /^09\d{9}$/.test(phone);

// Validate the OTP format before querying the database.
const validateOtpCode = (code) => /^\d{5}$/.test(code);

// Extract the client's IP address from the request headers.
const getClientIp = (req) => {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") || "unknown";
};

// JWT configuration.
const ACCESS_TOKEN_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const ACCESS_TOKEN_MAX_AGE = 1 * 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

// Rate-limit configuration.
const RATE_LIMIT_WINDOW = 30 * 60 * 1000;

const VERIFY_PHONE_LIMIT = 10;
const VERIFY_IP_LIMIT = 30;

// Load the JWT secrets from environment variables.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export async function POST(req) {
  try {
    // Make sure the required JWT secrets are available.
    if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
      console.error("JWT secrets are not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "Authentication service is not configured.",
        },
        { status: 500 },
      );
    }

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

    const { phone, otpCode } = requestBody;

    // Make sure both phone number and OTP are provided.
    if (!phone || !otpCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number and OTP code are required.",
        },
        { status: 400 },
      );
    }

    // Validate the phone number before querying the database.
    if (!validatePhoneNumber(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number.",
        },
        { status: 400 },
      );
    }

    // Validate the OTP format before querying the database.
    if (!validateOtpCode(otpCode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid OTP code.",
        },
        { status: 400 },
      );
    }

    // Identify the client IP for IP-based rate limiting.
    const clientIp = getClientIp(req);

    await connectDB();

    /**
     * Check the phone verification rate limit before consuming an attempt.
     *
     * This first check avoids consuming an attempt when the limit has
     * already been reached.
     */
    const phoneRateLimit = await rateLimit({
      key: `otp:verify:phone:${phone}`,
      limit: VERIFY_PHONE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: false,
    });

    if (!phoneRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,

          // Dedicated error code used by the frontend to disable
          // the resend action after verification rate limiting.
          code: "VERIFY_RATE_LIMITED",

          message: "Too many verification attempts. Please try again later.",

          retryAfter: phoneRateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": phoneRateLimit.retryAfter.toString(),
          },
        },
      );
    }

    /**
     * Check the IP verification rate limit before consuming an attempt.
     *
     * This protects the endpoint against repeated verification attempts
     * from the same IP address across multiple phone numbers.
     */
    const ipRateLimit = await rateLimit({
      key: `otp:verify:ip:${clientIp}`,
      limit: VERIFY_IP_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: false,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,

          // Dedicated error code used by the frontend.
          code: "VERIFY_RATE_LIMITED",

          message: "Too many verification attempts. Please try again later.",

          retryAfter: ipRateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipRateLimit.retryAfter.toString(),
          },
        },
      );
    }

    /**
     * Consume one verification attempt for the phone number.
     *
     * Every verification request consumes an attempt, including
     * requests containing an invalid OTP.
     */
    const phoneConsumption = await rateLimit({
      key: `otp:verify:phone:${phone}`,
      limit: VERIFY_PHONE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: true,
    });

    if (!phoneConsumption.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: "VERIFY_RATE_LIMITED",
          message: "Too many verification attempts. Please try again later.",
          retryAfter: phoneConsumption.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": phoneConsumption.retryAfter.toString(),
          },
        },
      );
    }

    /**
     * Consume one verification attempt for the client IP.
     *
     * This creates an independent protection layer in addition
     * to the phone-based verification limit.
     */
    const ipConsumption = await rateLimit({
      key: `otp:verify:ip:${clientIp}`,
      limit: VERIFY_IP_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
      consume: true,
    });

    if (!ipConsumption.allowed) {
      /**
       * The IP limit rejected the request after the phone limit
       * had already been consumed.
       *
       * Release the phone attempt so the two limits remain
       * logically consistent.
       */
      await rateLimit({
        key: `otp:verify:phone:${phone}`,
        limit: VERIFY_PHONE_LIMIT,
        windowMs: RATE_LIMIT_WINDOW,
        release: true,
      });

      return NextResponse.json(
        {
          success: false,
          code: "VERIFY_RATE_LIMITED",
          message: "Too many verification attempts. Please try again later.",
          retryAfter: ipConsumption.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipConsumption.retryAfter.toString(),
          },
        },
      );
    }

    // Retrieve the user associated with the submitted phone number.
    const user = await User.findOne({ phone }).select(
      "_id phone email name role otp isVerified purchasedCourses refreshToken",
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP code.",
        },
        { status: 422 },
      );
    }

    // Extract the stored OTP information from the user document.
    const { otp } = user;

    if (!otp?.code || !otp?.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP code.",
        },
        { status: 422 },
      );
    }

    // Reject expired OTPs and remove them from the user record.
    if (otp.expiresAt <= new Date()) {
      user.otp.code = null;
      user.otp.expiresAt = null;

      await user.save();

      return NextResponse.json(
        {
          success: false,
          message: "The OTP has expired.",
        },
        { status: 410 },
      );
    }

    /**
     * Compare the submitted OTP with the hashed OTP stored
     * in the database.
     *
     * The raw OTP is never stored in MongoDB.
     */
    const isOtpValid = await bcrypt.compare(otpCode, otp.code);

    if (!isOtpValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP code.",
        },
        { status: 422 },
      );
    }

    /**
     * The OTP is valid at this point.
     *
     * The first successfully verified user becomes the administrator.
     * Existing verified users keep their current role.
     */
    if (!user.isVerified) {
      const verifiedUserCount = await User.countDocuments({
        isVerified: true,
      });

      if (verifiedUserCount === 0) {
        user.role = "admin";
      }
    }

    // Build the JWT payload using the user's current information.
    const jwtPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    };

    // Generate a short-lived access token.
    const accessToken = jwt.sign(jwtPayload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    // Generate a long-lived refresh token.
    const refreshToken = jwt.sign(jwtPayload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    /**
     * Hash the refresh token before storing it.
     *
     * The raw refresh token is stored only inside the
     * HTTP-only cookie sent to the browser.
     */
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Store the hashed refresh token in the user document.
    user.refreshToken = hashedRefreshToken;

    // Clear the OTP after successful verification.
    user.otp.code = null;
    user.otp.expiresAt = null;

    // Mark the user as verified and record the login time.
    user.isVerified = true;
    user.lastLoginAt = new Date();

    await user.save();

    // Create the authentication response.
    const response = NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully.",

        // Tell the frontend where the authenticated user should go.
        redirectTo: user.role === "admin" ? "/admin/dashboard" : "/profile",

        user: {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name || "",
          role: user.role,
          purchasedCourses: user.purchasedCourses || [],
        },
      },
      { status: 200 },
    );

    /**
     * Store the access token in a secure HTTP-only cookie.
     *
     * JavaScript running in the browser cannot directly access
     * this cookie.
     */
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: "/",
    });

    /**
     * Store the refresh token in a secure HTTP-only cookie.
     *
     * The raw refresh token is never stored in MongoDB.
     */
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}
