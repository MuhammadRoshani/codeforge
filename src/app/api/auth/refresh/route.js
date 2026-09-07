import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import connectDB from "@/configs/db";
import User from "@/models/User";

/**
 * Refreshes the user's authentication tokens.
 *
 * - Retrieves the refresh token from the HTTP-only cookie.
 * - Verifies the refresh token signature and expiration.
 * - Preserves the original refresh-token expiration time.
 * - Generates a new access token.
 * - Rotates the refresh token without extending the session lifetime.
 * - Stores only the hashed refresh token in the database.
 * - Stores the new tokens in secure HTTP-only cookies.
 */

const ACCESS_TOKEN_EXPIRES_IN = "1h";

const ACCESS_TOKEN_MAX_AGE = 1 * 60 * 60;

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export async function POST() {
  const cookieStore = await cookies();

  // Remove authentication cookies when authentication fails.
  const clearAuthCookies = () => {
    cookieStore.delete("accessToken", {
      path: "/",
    });

    cookieStore.delete("refreshToken", {
      path: "/",
    });
  };

  try {
    // Make sure the required JWT secrets are available.
    if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
      console.error("JWT secrets are not configured.");

      clearAuthCookies();

      return NextResponse.json(
        {
          success: false,
          message: "Authentication service is not configured.",
        },
        { status: 500 },
      );
    }

    // Read the current refresh token from the HTTP-only cookie.
    const oldRefreshToken = cookieStore.get("refreshToken")?.value;

    if (!oldRefreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Refresh token not provided.",
        },
        { status: 401 },
      );
    }

    /**
     * Verify the current refresh token.
     *
     * jwt.verify() automatically checks:
     *
     * - Signature
     * - Expiration
     */
    let payload;

    try {
      payload = jwt.verify(oldRefreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      console.error("Error validating refresh token:", error);

      clearAuthCookies();

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired refresh token.",
        },
        { status: 401 },
      );
    }

    /**
     * Make sure the decoded JWT payload contains
     * the expected user ID and expiration time.
     *
     * `exp` is extremely important here.
     *
     * It represents the ORIGINAL absolute expiration
     * timestamp of the refresh token.
     */
    if (typeof payload !== "object" || !payload?.userId || !payload?.exp) {
      clearAuthCookies();

      return NextResponse.json(
        {
          success: false,
          message: "Invalid refresh token.",
        },
        { status: 401 },
      );
    }

    /**
     * Calculate how much time remains until the
     * ORIGINAL refresh token expiration.
     *
     * payload.exp is expressed in seconds.
     */
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);

    const remainingRefreshTokenLifetime = payload.exp - currentTimeInSeconds;

    /**
     * The refresh token may have technically passed
     * its expiration between verification and this point.
     */
    if (remainingRefreshTokenLifetime <= 0) {
      clearAuthCookies();

      return NextResponse.json(
        {
          success: false,
          message: "Refresh token has expired.",
        },
        { status: 401 },
      );
    }

    await connectDB();

    // Find the user associated with the refresh token.
    const user = await User.findById(payload.userId);

    if (!user || !user.refreshToken) {
      clearAuthCookies();

      return NextResponse.json(
        {
          success: false,
          message: "Invalid refresh token.",
        },
        { status: 401 },
      );
    }

    /**
     * Compare the raw refresh token from the cookie
     * with the hashed token stored in MongoDB.
     */
    const isRefreshTokenValid = await bcrypt.compare(
      oldRefreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      /**
       * The refresh token is no longer the current token.
       *
       * This can happen if an old rotated refresh token
       * is reused.
       */
      clearAuthCookies();

      return NextResponse.json(
        {
          success: false,
          message: "Invalid refresh token.",
        },
        { status: 401 },
      );
    }

    // Build the JWT payload using the user's current information.
    const jwtPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    };

    /**
     * Generate a new access token.
     *
     * Access tokens always get a fresh 1-hour lifetime.
     */
    const newAccessToken = jwt.sign(jwtPayload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    /**
     * Generate a new refresh token.
     *
     * We do NOT use:
     *
     * expiresIn: "7d"
     *
     * here.
     *
     * Instead, we use the REMAINING lifetime of the
     * ORIGINAL refresh token.
     *
     * Therefore the 7-day session lifetime is NOT extended.
     */
    const newRefreshToken = jwt.sign(jwtPayload, REFRESH_TOKEN_SECRET, {
      expiresIn: remainingRefreshTokenLifetime,
    });

    /**
     * Hash the new refresh token before storing it.
     *
     * The raw refresh token exists only in the
     * HTTP-only browser cookie.
     */
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    // Replace the old refresh token with the new hash.
    user.refreshToken = hashedNewRefreshToken;

    await user.save();

    // Create the authentication response.
    const response = NextResponse.json(
      {
        success: true,
        message: "Tokens refreshed successfully.",

        user: {
          id: user._id.toString(),
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 200 },
    );

    // Replace the access token cookie.
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: "/",
    });

    /**
     * Replace the refresh token cookie.
     *
     * maxAge is the REMAINING lifetime of the
     * ORIGINAL 7-day refresh session.
     */
    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: remainingRefreshTokenLifetime,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error refreshing authentication tokens:", error);

    clearAuthCookies();

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}
